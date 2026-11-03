<?php

namespace App\Enums;

enum WorkshopType: string
{
    case Sewing = 'sewing';
    case Washing = 'washing';
    case Dyeing = 'dyeing';

    public function label(): string
    {
        return match ($this) {
            self::Sewing => 'Costura',
            self::Washing => 'Lavanderia',
            self::Dyeing => 'Tinturaria',
        };
    }
}
