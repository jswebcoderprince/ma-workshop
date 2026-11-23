<?php

namespace App\Enums;

/** Why the customer should be called: their booking moved earlier or later. */
enum NotifyDirection: string
{
    case Earlier = 'earlier';
    case Later = 'later';
}
