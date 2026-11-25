<?php

namespace App\Enums;

enum MaterialUnit: string
{
    case Meter = 'm';
    case Centimeter = 'cm';
    case Unit = 'un';
    case Pair = 'par';
    case Kilogram = 'kg';
    case Gram = 'g';

    public function label(): string
    {
        return match ($this) {
            self::Meter => 'Metro (m)',
            self::Centimeter => 'Centímetro (cm)',
            self::Unit => 'Unidade (un)',
            self::Pair => 'Par',
            self::Kilogram => 'Quilograma (kg)',
            self::Gram => 'Grama (g)',
        };
    }
}
