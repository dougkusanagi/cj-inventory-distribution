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

    /**
     * Determine whether this offer type tracks the number of available sacks.
     */
    public function requiresVolumes(): bool
    {
        return match ($this) {
            self::Replenishment, self::BrokenGrade => true,
            self::NewGrade => false,
        };
    }
}
