<?php

namespace App\Support;

use App\Models\Mechanic;
use App\Models\WorkOrder;
use App\Scheduling\Availability;
use App\Scheduling\Position;

/**
 * What the app frame shows on every page (design/stitch): today's opening hours,
 * the mechanics' status today in the sidebar, and the small counters.
 */
final class ShellData
{
    /** @return array<string, mixed> */
    public static function for(Workshop $workshop): array
    {
        $cal = $workshop->calendar();
        $today = $workshop->today();
        $quarters = $cal->quartersOn($today);
        $schedule = $workshop->schedule();
        $availability = $workshop->availability();

        $roster = Mechanic::query()->where('active', true)->ordered()->get()->map(function (Mechanic $m) use ($cal, $today, $quarters, $schedule, $availability) {
            $status = ! $cal->isOpen($today) ? 'closed' : ($availability->offReason($m->id, $today) ?? 'working');
            if ($status === Availability::NOT_WORKING) {
                $status = 'not_working';
            }
            // One flag per quarter of today, so the sidebar can draw the day as four small cells.
            $slots = [];
            if ($status === 'working') {
                for ($q = 0; $q < $quarters; $q++) {
                    $slots[] = ! $schedule->isFree($m->id, new Position($today, $q));
                }
            }
            $booked = count(array_filter($slots));

            return JobView::mechanic($m) + [
                'status' => $status,
                'booked' => $booked,
                'available' => $status === 'working' ? $quarters : 0,
                'slots' => $slots,
            ];
        })->values();

        $jobs = WorkOrder::query()->where('status', '!=', 'completed')->get(['id', 'notify_customer']);

        return [
            'today' => $today,
            'week' => (int) date('W', strtotime($today)),
            'hours' => $quarters > 0 ? ['open' => $cal->quarterStart($today, 0), 'close' => $cal->quarterEnd($today, $quarters - 1)] : null,
            'roster' => $roster,
            'counts' => [
                'openJobs' => $jobs->count(),
                'toCall' => $jobs->whereNotNull('notify_customer')->count(),
                'warnings' => $jobs->filter(fn (WorkOrder $w) => $schedule->warning($w->id) !== null)->count(),
            ],
        ];
    }
}
