<?php

namespace App\Support;

use App\Models\Mechanic;
use App\Models\Vehicle;
use App\Models\WorkOrder;
use App\Scheduling\Schedule;

/** Shapes work orders and mechanics for the React pages. */
final class JobView
{
    private const PALETTE = ['#6c5dd3', '#3b82f6', '#22b07d', '#ec4899', '#e59a1a', '#0ea5e9', '#8b5cf6', '#14b8a6'];

    /** @return array<string, mixed> */
    public static function row(WorkOrder $w, Schedule $schedule): array
    {
        $cal = $schedule->calendar;
        $end = $schedule->end($w->id) ?? $cal->end($w->startPosition(), $w->duration_quarters);
        $start = $cal->normalize($w->startPosition());

        return [
            'id' => $w->id,
            'number' => $w->displayNumber(),
            'description' => $w->description,
            'status' => $w->status->value,
            'notify' => $w->notify_customer?->value,
            'warning' => $schedule->warning($w->id),
            'duration' => $w->duration_quarters,
            'planned' => $w->planned_quarters,
            'start' => ['date' => $start->date, 'quarter' => $start->quarter, 'time' => $cal->quarterStart($start->date, $start->quarter)],
            'end' => ['date' => $end->date, 'quarter' => $end->quarter, 'time' => $cal->quarterEnd($end->date, $end->quarter)],
            'customer' => ['id' => $w->customer_id, 'name' => $w->customer?->name, 'phone' => $w->customer?->phone],
            'vehicle' => $w->vehicle ? [
                'type' => $w->vehicle->type->value,
                'make' => $w->vehicle->make_model,
                'year' => $w->vehicle->year,
                'plate' => Vehicle::formatPlate($w->vehicle->plate),
            ] : null,
            'mechanic' => $w->mechanic ? self::mechanic($w->mechanic) : null,
        ];
    }

    /** @return array{id: int, name: string, color: string, vehicleTypes: list<string>, workDays: list<int>} */
    public static function mechanic(Mechanic $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'color' => $m->color ?: self::PALETTE[$m->sort_order % count(self::PALETTE)],
            'vehicleTypes' => array_values($m->vehicle_types ?? []),
            'workDays' => array_values(array_map('intval', $m->work_days ?? [])),
        ];
    }
}
