<?php

namespace App\Enums;

enum StockOfferType: string
{
    case Replenishment = 'replenishment';
    case NewGrade = 'new_grade';
    case BrokenGrade = 'broken_grade';

    public function label(): string
    {
        return match ($this) {
            self::Replenishment => 'Reposição',
            self::NewGrade => 'Grade Nova',
            self::BrokenGrade => 'Grade Furada',
        };
    }
}
