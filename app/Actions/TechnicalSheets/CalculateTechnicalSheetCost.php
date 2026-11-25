<?php

namespace App\Actions\TechnicalSheets;

use App\Enums\CostSurchargeType;
use App\Enums\TechnicalMaterialRole;
use App\Models\TechnicalSheet;
use App\Models\TechnicalSheetCost;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;

class CalculateTechnicalSheetCost
{
    /**
     * @return array{baseTotal:?string, lines: list<array{id:int, unit_price:?string, sale_price:?string, material_cost:?string, total:?string, profit:?string, margin:?string}>}
     */
    public function handle(TechnicalSheet $sheet): array
    {
        $sheet->loadMissing(['costs', 'materials']);
        if ($sheet->isOpen()) {
            $sheet->loadMissing('materials.material.effectivePrice');
        }

        $base = BigDecimal::zero();
        foreach ($sheet->costs as $cost) {
            $base = $base->plus($this->operationCost($cost));
        }

        $missingSharedPrice = false;
        $lines = [];
        foreach ($sheet->materials as $line) {
            $price = $sheet->isOpen() ? $line->material?->effectivePrice?->unit_price : $line->unit_price_snapshot;
            $cost = $price === null ? null : BigDecimal::of($price)->multipliedBy($line->quantity)->toScale(2, RoundingMode::HalfUp);
            if ($line->role === TechnicalMaterialRole::Component) {
                $missingSharedPrice = $missingSharedPrice || $cost === null;
                $base = $base->plus($cost ?? 0);
            }
            $lines[] = [$line, $price, $cost];
        }

        return [
            'baseTotal' => $missingSharedPrice ? null : (string) $base->toScale(2, RoundingMode::HalfUp),
            'lines' => array_map(function (array $data) use ($base, $missingSharedPrice): array {
                [$line, $price, $cost] = $data;
                $total = $line->role === TechnicalMaterialRole::FabricOption && ! $missingSharedPrice && $cost !== null
                    ? $base->plus($cost)->toScale(2, RoundingMode::HalfUp) : null;
                $sale = $line->sale_price === null ? null : BigDecimal::of($line->sale_price);
                $profit = $total === null || $sale === null ? null : $sale->minus($total)->toScale(2, RoundingMode::HalfUp);

                return [
                    'id' => $line->id,
                    'unit_price' => $price,
                    'sale_price' => $line->sale_price,
                    'material_cost' => $cost?->__toString(),
                    'total' => $total?->__toString(),
                    'profit' => $profit?->__toString(),
                    'margin' => $profit === null || $sale->isZero() ? null
                        : (string) $profit->multipliedBy(100)->dividedBy($sale, 2, RoundingMode::HalfUp),
                ];
            }, $lines),
        ];
    }

    private function operationCost(TechnicalSheetCost $cost): BigDecimal
    {
        $base = BigDecimal::of($cost->amount);
        $surcharge = BigDecimal::of($cost->surcharge_value ?? 0);
        $adjustment = match ($cost->surcharge_type) {
            CostSurchargeType::Percent => $base->multipliedBy($surcharge)->dividedBy(100, 2, RoundingMode::HalfUp),
            CostSurchargeType::Fixed => $surcharge,
            null => BigDecimal::zero(),
        };

        return $base->plus($adjustment)->toScale(2, RoundingMode::HalfUp);
    }
}
