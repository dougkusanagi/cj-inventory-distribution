<?php

namespace App\Enums;

enum ProductLine: string
{
    case Slim = 'slim';
    case Plus = 'plus';

    public function label(): string
    {
        return match ($this) {
            self::Slim => 'Slim',
            self::Plus => 'Plus',
        };
    }
}
