<?php

namespace App\Enums;

enum MaterialType: string
{
    case Fabric = 'fabric';
    case Trim = 'trim';
    case Thread = 'thread';
    case Button = 'button';
    case Zipper = 'zipper';
    case Label = 'label';
    case Packaging = 'packaging';

    public function label(): string
    {
        return match ($this) {
            self::Fabric => 'Tecido',
            self::Trim => 'Aviamento',
            self::Thread => 'Linha',
            self::Button => 'Botão',
            self::Zipper => 'Zíper',
            self::Label => 'Etiqueta',
            self::Packaging => 'Embalagem',
        };
    }
}
