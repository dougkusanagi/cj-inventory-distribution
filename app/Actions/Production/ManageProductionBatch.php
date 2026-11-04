<?php

namespace App\Actions\Production;

use App\Enums\ProductionStage;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageProductionBatch
{
    /** @param array<int, array{size: mixed, quantity: mixed}> $sizes */
    public function create(Product $product, int $quantity, ?string $notes, User $actor, array $sizes = []): ProductionBatch
    {
        return DB::transaction(function () use ($product, $quantity, $notes, $actor, $sizes): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('create', ProductionBatch::class);
            $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            if (! $product->is_active) {
                throw ValidationException::withMessages(['product_id' => 'Selecione um produto ativo.']);
            }
            if ($quantity < 1 || $quantity > ProductionBatch::MAX_QUANTITY) {
                throw ValidationException::withMessages(['quantity' => 'Informe uma quantidade entre 1 e 1.000.000 de peças.']);
            }

            $sizes = $this->normalizeSizes($sizes, $quantity);
            $batch = ProductionBatch::query()->create([
                'code' => 'TEMP-'.Str::uuid(),
                'product_id' => $product->id,
                'quantity' => $quantity,
                'stage' => ProductionStage::Cutting,
                'stage_entered_at' => now(),
                'received_at' => now(),
                'notes' => $notes,
                'created_by' => $actor->id,
                'version' => 1,
            ]);
            $batch->update(['code' => 'L-'.str_pad((string) $batch->id, 6, '0', STR_PAD_LEFT)]);
            $this->writeSizes($batch, $sizes);
            $this->record($batch, null, ProductionStage::Cutting, $actor, null);

            return $batch;
        }, 5);
    }

    public function advance(ProductionBatch $batch, ProductionStage $expected, ProductionStage $target, int $version, User $actor, ?int $workshopId = null): ProductionBatch
    {
        return DB::transaction(function () use ($batch, $expected, $target, $version, $actor, $workshopId): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if (! $actor->canManageProductionStage($expected)) {
                throw new AuthorizationException;
            }
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            if ($batch->stage !== $expected || $batch->version !== $version) {
                $lastEvent = $batch->events()->with('actor')->reorder('id', 'desc')->first();
                $name = $lastEvent?->actor->name ?? 'outra pessoa';
                throw ValidationException::withMessages(['version' => 'Este lote já foi movido para '.$batch->stage->label().' por '.$name.'.']);
            }
            Gate::forUser($actor)->authorize('advance', $batch);
            $this->assertNotSplit($batch);
            if ($batch->received_at === null) {
                throw ValidationException::withMessages(['batch' => 'Confirme o recebimento antes de enviar este lote.']);
            }
            if (! $batch->stage->canMoveTo($target)) {
                throw ValidationException::withMessages(['stage' => 'O lote só pode seguir para a próxima etapa.']);
            }

            $workshop = $workshopId === null ? null : Workshop::query()->whereKey($workshopId)->lockForUpdate()->first();
            if ($workshopId !== null && ($workshop === null || ! $workshop->is_active || $workshop->type->value !== $target->value)) {
                throw ValidationException::withMessages(['workshop_id' => 'Selecione uma oficina ativa para a etapa de destino.']);
            }

            $from = $batch->stage;
            $fromWorkshop = $batch->workshop;
            $batch->update([
                'stage' => $target,
                'stage_entered_at' => now(),
                'completed_at' => $target === ProductionStage::Completed ? now() : null,
                'received_at' => $target === ProductionStage::Completed ? now() : null,
                'received_by' => null,
                'workshop_id' => $workshop?->id,
                'version' => $batch->version + 1,
            ]);
            $this->record($batch, $from, $target, $actor, null, $fromWorkshop, $workshop);

            return $batch;
        }, 5);
    }

    /**
     * @param  array<int, array{workshop_id: int, quantity: int, sizes?: array<int, array{size: mixed, quantity: mixed}>}>  $allocations
     * @return Collection<int, ProductionBatch>
     */
    public function split(ProductionBatch $batch, ProductionStage $expected, ProductionStage $target, int $version, User $actor, array $allocations): Collection
    {
        return DB::transaction(function () use ($batch, $expected, $target, $version, $actor, $allocations): Collection {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if (! $actor->canManageProductionStage($expected)) {
                throw new AuthorizationException;
            }
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('advance', $batch);
            $this->assertVersion($batch, $version);
            $this->assertNotSplit($batch);
            if ($batch->stage !== $expected || $batch->received_at === null || ! $expected->canMoveTo($target)) {
                throw ValidationException::withMessages(['batch' => 'O lote deve estar recebido e seguir para a próxima etapa.']);
            }
            $ids = array_column($allocations, 'workshop_id');
            $quantities = array_column($allocations, 'quantity');
            if (count($ids) < 2 || count($ids) !== count(array_unique($ids)) || count($ids) !== count($quantities) || collect($quantities)->contains(fn ($quantity): bool => ! $this->isValidSplitQuantity($quantity)) || array_sum($quantities) !== $batch->quantity) {
                throw ValidationException::withMessages(['allocations' => 'Informe oficinas diferentes e quantidades positivas cuja soma seja igual ao total do lote.']);
            }
            $originalSizes = $this->snapshotSizes($batch);
            $allocatedBySize = [];
            foreach ($allocations as $index => $allocation) {
                $sizes = $allocation['sizes'] ?? [];
                if ($originalSizes === [] && $sizes !== []) {
                    throw ValidationException::withMessages(['allocations' => 'Informe primeiro a grade do lote original.']);
                }
                if ($originalSizes !== []) {
                    $sizes = $this->normalizeSizes($sizes, $allocation['quantity']);
                    $originalBySize = [];
                    foreach ($originalSizes as $item) {
                        $originalBySize[mb_strtolower($item['size'])] = $item;
                    }
                    $childBySize = [];
                    foreach ($sizes as $item) {
                        $key = mb_strtolower($item['size']);
                        $childBySize[$key] = $item;
                        $allocatedBySize[$key] = ($allocatedBySize[$key] ?? 0) + $item['quantity'];
                    }
                    if (array_diff_key($originalBySize, $childBySize) !== [] || array_diff_key($childBySize, $originalBySize) !== []) {
                        throw ValidationException::withMessages(['allocations' => 'Informe todos os tamanhos do lote em cada oficina.']);
                    }
                    $allocations[$index]['sizes'] = array_map(fn (array $item): array => [
                        'size' => $item['size'], 'quantity' => $childBySize[mb_strtolower($item['size'])]['quantity'],
                    ], $originalSizes);
                }
            }
            foreach ($originalSizes as $item) {
                if (($allocatedBySize[mb_strtolower($item['size'])] ?? 0) !== $item['quantity']) {
                    throw ValidationException::withMessages(['allocations' => 'A distribuição de cada tamanho deve corresponder ao lote original.']);
                }
            }
            $workshops = Workshop::query()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($workshops->count() !== count($ids) || $workshops->contains(fn (Workshop $workshop): bool => ! $workshop->is_active || $workshop->type->value !== $target->value)) {
                throw ValidationException::withMessages(['allocations' => 'Selecione oficinas ativas para a etapa de destino.']);
            }
            $batch->update(['split_at' => now(), 'version' => $batch->version + 1]);
            $this->record($batch, $batch->stage, $batch->stage, $actor, 'Lote dividido entre oficinas.', $batch->workshop, $batch->workshop, 'split');
            $children = collect();
            foreach ($allocations as $allocation) {
                $workshop = $workshops->get($allocation['workshop_id']);
                $child = ProductionBatch::query()->create([
                    'code' => 'TEMP-'.Str::uuid(), 'product_id' => $batch->product_id,
                    'parent_id' => $batch->id, 'quantity' => $allocation['quantity'],
                    'stage' => $target, 'stage_entered_at' => now(), 'workshop_id' => $workshop->id,
                    'notes' => $batch->notes, 'created_by' => $actor->id, 'version' => 1,
                ]);
                $child->update(['code' => 'L-'.str_pad((string) $child->id, 6, '0', STR_PAD_LEFT)]);
                $this->writeSizes($child, $allocation['sizes'] ?? []);
                $this->record($child, null, $target, $actor, 'Dividido do lote '.$batch->code.'.', null, $workshop, 'split_child');
                $children->push($child);
            }

            return $children;
        }, 5);
    }

    public function receive(ProductionBatch $batch, int $version, User $actor): ProductionBatch
    {
        return DB::transaction(function () use ($batch, $version, $actor): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('advance', $batch);
            $this->assertNotSplit($batch);
            $this->assertVersion($batch, $version);
            if ($batch->received_at !== null) {
                throw ValidationException::withMessages(['batch' => 'Este lote já foi recebido.']);
            }
            $batch->update(['received_at' => now(), 'received_by' => $actor->id, 'version' => $batch->version + 1]);
            $this->record($batch, $batch->stage, $batch->stage, $actor, null, $batch->workshop, $batch->workshop);

            return $batch;
        }, 5);
    }

    public function undo(ProductionBatch $batch, string $reason, int $version, User $actor): ProductionBatch
    {
        return DB::transaction(function () use ($batch, $reason, $version, $actor): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('undo', $batch);
            $this->assertNotSplit($batch);
            $this->assertVersion($batch, $version);
            $reason = trim($reason);
            if ($reason === '') {
                throw ValidationException::withMessages(['reason' => 'Informe o motivo para desfazer o avanço.']);
            }
            $last = $batch->events()->whereColumn('from_stage', '!=', 'to_stage')->reorder('id', 'desc')->first();
            if ($last?->from_stage === null || ! $last->from_stage->canMoveTo($last->to_stage)) {
                throw ValidationException::withMessages(['batch' => 'Não há avanço para desfazer.']);
            }
            $from = $batch->stage;
            $target = $last->from_stage;
            $fromWorkshop = $batch->workshop;
            $previousWorkshop = $last->from_workshop_id === null ? null : Workshop::withTrashed()->findOrFail($last->from_workshop_id);
            $batch->update(['stage' => $target, 'stage_entered_at' => now(), 'completed_at' => null, 'received_at' => now(), 'received_by' => null, 'workshop_id' => $previousWorkshop?->id, 'version' => $batch->version + 1]);
            $this->record($batch, $from, $target, $actor, $reason, $fromWorkshop, $previousWorkshop);

            return $batch;
        }, 5);
    }

    public function delete(ProductionBatch $batch, int $version, User $actor): void
    {
        DB::transaction(function () use ($batch, $version, $actor): void {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('delete', $batch);
            $this->assertNotSplit($batch);
            $this->assertVersion($batch, $version);
            if ($batch->parent_id !== null || $batch->events()->whereNotNull('from_stage')->exists()) {
                throw ValidationException::withMessages(['batch' => 'Um lote que já avançou não pode ser excluído.']);
            }
            $batch->delete();
        }, 5);
    }

    /** @param array<int, array{size: mixed, quantity: mixed}> $sizes */
    public function updateSizes(ProductionBatch $batch, array $sizes, int $version, User $actor): ProductionBatch
    {
        return DB::transaction(function () use ($batch, $sizes, $version, $actor): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('advance', $batch);
            $this->assertNotSplit($batch);
            $this->assertVersion($batch, $version);
            if ($batch->received_at === null || $batch->stage === ProductionStage::Completed) {
                throw ValidationException::withMessages(['batch' => 'A grade só pode ser alterada em um lote recebido e ainda não concluído.']);
            }
            $normalized = $this->normalizeSizes($sizes, $batch->quantity);
            $before = $this->snapshotSizes($batch);
            if ($before === $normalized) {
                return $batch;
            }
            $batch->items()->get()->each->delete();
            $this->writeSizes($batch, $normalized);
            $batch->update(['version' => $batch->version + 1]);
            $this->record($batch, $batch->stage, $batch->stage, $actor, null, $batch->workshop, $batch->workshop, 'sizes_updated', $before, $normalized);

            return $batch;
        }, 5);
    }

    /**
     * @param  array<int, array{size: mixed, quantity: mixed}>  $sizes
     * @return array<int, array{size: string, quantity: int}>
     */
    private function normalizeSizes(array $sizes, int $total): array
    {
        if ($sizes === []) {
            return [];
        }
        $result = [];
        $seen = [];
        foreach ($sizes as $row) {
            $name = is_string($row['size'] ?? null) ? trim($row['size']) : '';
            $quantity = $row['quantity'] ?? null;
            $key = mb_strtolower($name);
            if ($name === '' || mb_strlen($name) > 30 || isset($seen[$key]) || ! is_int($quantity) || $quantity < 0 || $quantity > ProductionBatch::MAX_QUANTITY) {
                throw ValidationException::withMessages(['sizes' => 'Informe tamanhos diferentes e quantidades inteiras não negativas.']);
            }
            $seen[$key] = true;
            $result[] = ['size' => $name, 'quantity' => $quantity];
        }
        if (array_sum(array_column($result, 'quantity')) !== $total) {
            throw ValidationException::withMessages(['sizes' => 'A soma dos tamanhos deve ser igual à quantidade do lote.']);
        }

        return $result;
    }

    /** @return array<int, array{size: string, quantity: int}> */
    private function snapshotSizes(ProductionBatch $batch): array
    {
        return $batch->items()->get()->map(fn ($item): array => ['size' => $item->size, 'quantity' => $item->quantity])->all();
    }

    /** @param array<int, array{size: string, quantity: int}> $sizes */
    private function writeSizes(ProductionBatch $batch, array $sizes): void
    {
        foreach ($sizes as $index => $item) {
            $batch->items()->create(['size' => $item['size'], 'quantity' => $item['quantity'], 'sort_order' => $index]);
        }
    }

    private function assertVersion(ProductionBatch $batch, int $version): void
    {
        if ($batch->version !== $version) {
            throw ValidationException::withMessages(['version' => 'Este lote foi alterado. Atualize a página e tente novamente.']);
        }
    }

    private function isValidSplitQuantity(mixed $quantity): bool
    {
        return is_int($quantity) && $quantity > 0;
    }

    private function assertNotSplit(ProductionBatch $batch): void
    {
        if ($batch->split_at !== null) {
            throw ValidationException::withMessages(['batch' => 'Este lote foi dividido e não pode ser alterado.']);
        }
    }

    /**
     * @param  array<int, array{size: string, quantity: int}>|null  $sizesBefore
     * @param  array<int, array{size: string, quantity: int}>|null  $sizesAfter
     */
    private function record(ProductionBatch $batch, ?ProductionStage $from, ProductionStage $to, User $actor, ?string $notes, ?Workshop $fromWorkshop = null, ?Workshop $toWorkshop = null, ?string $kind = null, ?array $sizesBefore = null, ?array $sizesAfter = null): void
    {
        $batch->events()->create([
            'from_stage' => $from,
            'to_stage' => $to,
            'quantity' => $batch->quantity,
            'actor_id' => $actor->id,
            'notes' => $notes,
            'occurred_at' => now(),
            'from_workshop_id' => $fromWorkshop?->id,
            'to_workshop_id' => $toWorkshop?->id,
            'from_workshop_name' => $fromWorkshop?->name,
            'to_workshop_name' => $toWorkshop?->name,
            'kind' => $kind,
            'sizes_before' => $sizesBefore,
            'sizes_after' => $sizesAfter,
        ]);
    }
}
