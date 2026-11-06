<?php

namespace Database\Seeders;

use App\Actions\Production\ManageProductionBatch;
use App\Actions\Users\SyncProductionStages;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProductionDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $this->seedSectorUsers();

        $actor = User::query()->where('role', UserRole::Admin)->where('is_active', true)->orderBy('id')->first();
        $product = Product::query()->where('is_active', true)->orderBy('id')->first();
        if ($actor === null || $product === null) {
            return;
        }
        $longNameProduct = Product::query()->where('is_active', true)->orderByRaw('length(name) desc')->first() ?? $product;
        $action = app(ManageProductionBatch::class);
        $workshops = collect(WorkshopType::cases())->mapWithKeys(fn (WorkshopType $type): array => [
            $type->value => Workshop::query()->firstOrCreate(
                ['slug' => Str::slug('Oficina Demonstração '.$type->label()), 'type' => $type],
                ['name' => 'Oficina Demonstração '.$type->label(), 'is_active' => true],
            ),
        ]);
        $stages = ProductionStage::cases();
        foreach ($stages as $index => $stage) {
            $marker = 'Demonstração de produção: '.$stage->value;
            if (ProductionBatch::withTrashed()->where('notes', $marker)->exists()) {
                continue;
            }
            $batch = $action->create($index === 1 ? $longNameProduct : $product, match ($index) {
                0 => 1, 6 => 1000000, default => ($index + 1) * 24
            }, $marker, $actor, match ($index) {
                0 => [['size' => '36', 'quantity' => 1]],
                1 => [['size' => 'P', 'quantity' => 24], ['size' => 'GG', 'quantity' => 24]],
                default => [],
            });
            for ($i = 1; $i <= $index; $i++) {
                if ($batch->received_at === null) {
                    $batch = $action->receive($batch, $batch->version, $actor);
                }
                $workshop = $stages[$i] === $stage ? $workshops->get($stage->value) : null;
                if ($workshop !== null && ! $workshop->is_active) {
                    $workshop = null;
                }
                $batch = $action->advance($batch, $batch->stage, $stages[$i], $batch->version, $actor, $workshop?->id);
            }
            if (in_array($stage, [ProductionStage::Washing, ProductionStage::Finishing], true)) {
                $action->receive($batch, $batch->version, $actor);
            }
            if ($stage === ProductionStage::Sewing) {
                $batch->update(['stage_entered_at' => now()->subDays(ProductionBatch::STALLED_AFTER_DAYS + 4)]);
            }
        }

        $marker = 'Demonstração de produção: divisão entre oficinas';
        $firstWorkshop = $workshops->get(WorkshopType::Sewing->value);
        $secondWorkshop = Workshop::query()->firstOrCreate(
            ['slug' => Str::slug('Oficina Demonstração Costura Complementar'), 'type' => WorkshopType::Sewing],
            ['name' => 'Oficina Demonstração Costura Complementar', 'is_active' => true],
        );
        if ($firstWorkshop !== null && $firstWorkshop->is_active && $secondWorkshop->is_active
            && ! ProductionBatch::withTrashed()->where('notes', $marker)->exists()) {
            $batch = $action->create($longNameProduct, 1000, $marker, $actor, [['size' => '36', 'quantity' => 1], ['size' => 'GG', 'quantity' => 999]]);
            $action->split($batch, ProductionStage::Cutting, ProductionStage::Sewing, $batch->version, $actor, [
                ['workshop_id' => $firstWorkshop->id, 'quantity' => 1, 'sizes' => [['size' => '36', 'quantity' => 1], ['size' => 'GG', 'quantity' => 0]]],
                ['workshop_id' => $secondWorkshop->id, 'quantity' => 999, 'sizes' => [['size' => '36', 'quantity' => 0], ['size' => 'GG', 'quantity' => 999]]],
            ]);
        }

        $this->seedBoardBatches($action, $actor, $workshops);
    }

    /**
     * One login per production sector, so each sector's view can be tested.
     * All demo passwords are "password".
     */
    private function seedSectorUsers(): void
    {
        $sync = app(SyncProductionStages::class);
        foreach ([
            'corte@example.com' => ['Responsável do Corte', [ProductionStage::Cutting]],
            'costura@example.com' => ['Responsável da Costura', [ProductionStage::Sewing]],
            'lavagem@example.com' => ['Responsável da Lavagem', [ProductionStage::Washing]],
            'tinturaria@example.com' => ['Responsável da Tinturaria', [ProductionStage::Dyeing]],
            'acabamento@example.com' => ['Responsável do Acabamento', [ProductionStage::Finishing]],
            'ensacamento@example.com' => ['Responsável do Ensacamento', [ProductionStage::Bagging]],
            'multissetor@example.com' => ['Responsável da Lavagem e da Tinturaria', [ProductionStage::Washing, ProductionStage::Dyeing]],
        ] as $email => [$name, $stages]) {
            $user = User::query()->firstOrNew(['email' => $email]);
            if ($user->exists) {
                continue;
            }
            $user->fill(['name' => $name, 'password' => 'password']);
            $user->forceFill(['email_verified_at' => now(), 'role' => UserRole::Production]);
            $user->save();
            $sync->handle($user, array_map(fn (ProductionStage $stage): string => $stage->value, $stages));
        }
    }

    /**
     * Several products spread over the sectors, with different ages, pending
     * receipts and stalled batches, so the admin board looks like a real day.
     *
     * @param  Collection<string, Workshop>  $workshops
     */
    private function seedBoardBatches(ManageProductionBatch $action, User $actor, Collection $workshops): void
    {
        $products = Product::query()->where('is_active', true)->orderBy('id')->limit(8)->get();
        $stages = ProductionStage::cases();
        // [stage position, pieces, days in the stage, already received by the sector]
        $scenarios = [
            [0, 150, 0, true], [0, 25, 2, true],
            [1, 60, 1, true], [1, 35, 8, true], [1, 80, 0, false],
            [2, 120, 2, true], [2, 45, 0, false],
            [3, 30, 9, true],
            [4, 200, 3, true], [4, 15, 0, false],
            [5, 90, 1, true], [5, 40, 6, true],
            [6, 75, 4, true],
        ];
        foreach ($scenarios as $index => [$position, $quantity, $days, $received]) {
            $marker = 'Demonstração de produção: quadro '.($index + 1);
            if (ProductionBatch::withTrashed()->where('notes', $marker)->exists()) {
                continue;
            }
            $batch = $action->create($products[$index % $products->count()], $quantity, $marker, $actor);
            for ($i = 1; $i <= $position; $i++) {
                if ($batch->received_at === null) {
                    $batch = $action->receive($batch, $batch->version, $actor);
                }
                $workshop = $workshops->get($stages[$i]->value);
                $batch = $action->advance($batch, $batch->stage, $stages[$i], $batch->version, $actor, $workshop?->is_active ? $workshop->id : null);
            }
            if ($received && $batch->received_at === null) {
                $batch = $action->receive($batch, $batch->version, $actor);
            }
            $batch->update(['stage_entered_at' => now()->subDays($days)->subHours($index)]);
        }
    }
}
