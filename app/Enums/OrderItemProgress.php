<?php

namespace App\Enums;

enum OrderItemProgress: string
{
    case Separate = 'separate';
    case UndoSeparation = 'undo_separation';
    case Check = 'check';
    case UndoCheck = 'undo_check';
    case ReportDivergence = 'report_divergence';
    case ResolveDivergence = 'resolve_divergence';
}
