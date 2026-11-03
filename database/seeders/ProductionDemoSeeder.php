<?php

namespace Database\Seeders;

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Database\Seeder;

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
        $stages = ProductionStage::cases();
        foreach ($stages as $index => $stage) {
            $marker = 'Demonstração de produção: '.$stage->value;
            if (ProductionBatch::withTrashed()->where('notes', $marker)->exists()) {
                continue;
            }
            $batch = $action->create($index === 1 ? $longNameProduct : $product, match ($index) {
                0 => 1, 6 => 1000000, default => ($index + 1) * 24
            }, $marker, $actor);
            for ($i = 1; $i <= $index; $i++) {
                $batch = $action->advance($batch, $batch->stage, $stages[$i], $batch->version, $actor);
            }
        }
    }
}
