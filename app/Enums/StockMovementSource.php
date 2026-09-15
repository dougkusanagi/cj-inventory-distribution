<?php

namespace App\Enums;

enum StockMovementSource: string
{
    case Manual = 'manual';
    case Order = 'order';
    case Opening = 'opening';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Manual',
            self::Order => 'Pedido',
            self::Opening => 'Abertura inicial',
        };
    }
}
