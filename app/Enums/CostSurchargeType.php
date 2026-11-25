<?php

namespace App\Enums;

enum CostSurchargeType: string
{
    case Percent = 'percent';
    case Fixed = 'fixed';
}
