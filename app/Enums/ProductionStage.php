<?php

namespace App\Enums;

enum ProductionStage: string
{
    case Cutting = 'cutting';
    case Sewing = 'sewing';
    case Washing = 'washing';
    case Dyeing = 'dyeing';
    case Finishing = 'finishing';
    case Bagging = 'bagging';
    case Completed = 'completed';

    public function label(): string
    {
        return match ($this) {
            self::Cutting => 'Corte',
            self::Sewing => 'Costura',
            self::Washing => 'Lavagem',
            self::Dyeing => 'Tinturaria',
            self::Finishing => 'Acabamento',
            self::Bagging => 'Ensacamento',
            self::Completed => 'Concluído',
        };
    }

    public function position(): int
    {
        return match ($this) {
            self::Cutting => 0,
            self::Sewing => 1,
            self::Washing => 2,
            self::Dyeing => 3,
            self::Finishing => 4,
            self::Bagging => 5,
            self::Completed => 6,
        };
    }

    public function canMoveTo(self $target): bool
    {
        return $target->position() === $this->position() + 1;
    }
}
