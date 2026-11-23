<?php

namespace App\Enums;

enum WorkOrderStatus: string
{
    case Scheduled = 'scheduled';
    case InProgress = 'in_progress';
    case WaitingParts = 'waiting_parts';
    case Completed = 'completed';
}
