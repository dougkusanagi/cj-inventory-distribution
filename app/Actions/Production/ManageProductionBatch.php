<?php

namespace App\Actions\Production;

use App\Enums\ProductionStage;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ManageProductionBatch
{
    public function create(Product $product, int $quantity, ?string $notes, User $actor): ProductionBatch
    {
        return DB::transaction(function () use ($product, $quantity, $notes, $actor): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('create', ProductionBatch::class);
            $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            if (! $product->is_active) {
                throw ValidationException::withMessages(['product_id' => 'Selecione um produto ativo.']);
            }
            if ($quantity < 1 || $quantity > ProductionBatch::MAX_QUANTITY) {
                throw ValidationException::withMessages(['quantity' => 'Informe uma quantidade entre 1 e 1.000.000 de peças.']);
            }

            $batch = ProductionBatch::query()->create([
                'code' => 'TEMP-'.Str::uuid(),
                'product_id' => $product->id,
                'quantity' => $quantity,
                'stage' => ProductionStage::Cutting,
                'stage_entered_at' => now(),
                'notes' => $notes,
                'created_by' => $actor->id,
                'version' => 1,
            ]);
            $batch->update(['code' => 'L-'.str_pad((string) $batch->id, 6, '0', STR_PAD_LEFT)]);
            $this->record($batch, null, ProductionStage::Cutting, $actor, null);

            return $batch;
        }, 5);
    }

    public function advance(ProductionBatch $batch, ProductionStage $expected, ProductionStage $target, int $version, User $actor): ProductionBatch
    {
        return DB::transaction(function () use ($batch, $expected, $target, $version, $actor): ProductionBatch {
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
            if (! $batch->stage->canMoveTo($target)) {
                throw ValidationException::withMessages(['stage' => 'O lote só pode seguir para a próxima etapa.']);
            }

            $from = $batch->stage;
            $batch->update([
                'stage' => $target,
                'stage_entered_at' => now(),
                'completed_at' => $target === ProductionStage::Completed ? now() : null,
                'version' => $batch->version + 1,
            ]);
            $this->record($batch, $from, $target, $actor, null);

            return $batch;
        }, 5);
    }

    public function undo(ProductionBatch $batch, string $reason, int $version, User $actor): ProductionBatch
    {
        return DB::transaction(function () use ($batch, $reason, $version, $actor): ProductionBatch {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('undo', $batch);
            $this->assertVersion($batch, $version);
            $reason = trim($reason);
            if ($reason === '') {
                throw ValidationException::withMessages(['reason' => 'Informe o motivo para desfazer o avanço.']);
            }
            $last = $batch->events()->reorder('id', 'desc')->first();
            if ($last?->from_stage === null || ! $last->from_stage->canMoveTo($last->to_stage)) {
                throw ValidationException::withMessages(['batch' => 'Não há avanço para desfazer.']);
            }
            $from = $batch->stage;
            $target = $last->from_stage;
            $batch->update(['stage' => $target, 'stage_entered_at' => now(), 'completed_at' => null, 'version' => $batch->version + 1]);
            $this->record($batch, $from, $target, $actor, $reason);

            return $batch;
        }, 5);
    }

    public function delete(ProductionBatch $batch, int $version, User $actor): void
    {
        DB::transaction(function () use ($batch, $version, $actor): void {
            $actor = User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $batch = ProductionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('delete', $batch);
            $this->assertVersion($batch, $version);
            if ($batch->events()->whereNotNull('from_stage')->exists()) {
                throw ValidationException::withMessages(['batch' => 'Um lote que já avançou não pode ser excluído.']);
            }
            $batch->delete();
        }, 5);
    }

    private function assertVersion(ProductionBatch $batch, int $version): void
    {
        if ($batch->version !== $version) {
            throw ValidationException::withMessages(['version' => 'Este lote foi alterado. Atualize a página e tente novamente.']);
        }
    }

    private function record(ProductionBatch $batch, ?ProductionStage $from, ProductionStage $to, User $actor, ?string $notes): void
    {
        $batch->events()->create([
            'from_stage' => $from,
            'to_stage' => $to,
            'quantity' => $batch->quantity,
            'actor_id' => $actor->id,
            'notes' => $notes,
            'occurred_at' => now(),
        ]);
    }
}
