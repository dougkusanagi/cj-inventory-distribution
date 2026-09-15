<?php

namespace App\Enums;

enum StockMovementSource: string
{
    case Manual = 'manual';
    case Adjustment = 'adjustment';
    case Order = 'order';
    case Opening = 'opening';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Manual',
            self::Adjustment => 'Ajuste por tamanho',
            self::Order => 'Pedido',
            self::Opening => 'Abertura inicial',
        };
    }
}
