<?php

namespace Database\Seeders;

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductionDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

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
    }
}
