<?php

namespace App\Enums;

enum ProductionStage: string
{
    case Planning = 'planning';
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
            self::Planning => 'Planejamento',
            self::Cutting => 'Corte',
            self::Sewing => 'Costura',
            self::Washing => 'Lavanderia',
            self::Dyeing => 'Tinturaria',
            self::Finishing => 'Acabamento',
            self::Bagging => 'Ensacamento',
            self::Completed => 'Estoque',
        };
    }

    public function position(): int
    {
        $position = array_search($this, self::active(), true);

        return $position === false ? -1 : $position;
    }

    /** @return list<self> */
    public static function active(): array
    {
        return [self::Planning, self::Cutting, self::Sewing, self::Washing, self::Finishing, self::Completed];
    }

    public function canMoveTo(self $target): bool
    {
        return in_array($this, self::active(), true) && in_array($target, self::active(), true) && $target->position() === $this->position() + 1;
    }
}
