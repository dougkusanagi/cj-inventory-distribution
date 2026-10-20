<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Stock = 'stock';
    case Marketing = 'marketing';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Stock => 'Estoque',
            self::Marketing => 'Marketing',
        };
    }

    /**
     * Whether the role operates products, stock, orders and catalog settings.
     */
    public function managesOperations(): bool
    {
        return $this === self::Admin || $this === self::Stock;
    }

    /**
     * Whether the role uses the dedicated product photo screen.
     */
    public function managesPhotos(): bool
    {
        return $this === self::Admin || $this === self::Marketing;
    }
}
