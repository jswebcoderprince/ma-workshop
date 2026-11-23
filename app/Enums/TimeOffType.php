<?php

namespace App\Enums;

enum TimeOffType: string
{
    case Holiday = 'holiday';
    case DayOff = 'day_off';
    case Sick = 'sick';
}
