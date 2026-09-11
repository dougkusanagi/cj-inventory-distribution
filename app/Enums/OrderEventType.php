<?php

namespace App\Enums;

enum OrderEventType: string
{
    case Created = 'created';
    case Updated = 'updated';
    case Canceled = 'canceled';
    case Completed = 'completed';
    case Separated = 'separated';
    case SeparationUndone = 'separation_undone';
    case Checked = 'checked';
    case CheckUndone = 'check_undone';
    case DivergenceReported = 'divergence_reported';
    case DivergenceResolved = 'divergence_resolved';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Pedido registrado',
            self::Updated => 'Dados do pedido atualizados',
            self::Canceled => 'Pedido cancelado',
            self::Completed => 'Pedido finalizado',
            self::Separated => 'Saco marcado como separado',
            self::SeparationUndone => 'Separação desfeita',
            self::Checked => 'Saco conferido',
            self::CheckUndone => 'Conferência desfeita',
            self::DivergenceReported => 'Divergência registrada',
            self::DivergenceResolved => 'Divergência resolvida',
        };
    }
}
