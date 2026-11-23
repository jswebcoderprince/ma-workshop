<?php

namespace App\Models;

use App\Enums\NotifyDirection;
use App\Enums\WorkOrderStatus;
use App\Scheduling\Position;
use App\Scheduling\ScheduledJob;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** A job in the UI ("Darbas"). Laravel's queue owns the `jobs` table, hence the name. */
class WorkOrder extends Model
{
    protected $fillable = [
        'number', 'customer_id', 'vehicle_id', 'mechanic_id', 'description',
        'start_date', 'start_quarter', 'duration_quarters', 'planned_quarters',
        'status', 'notify_customer', 'mileage', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'start_quarter' => 'integer',
            'duration_quarters' => 'integer',
            'planned_quarters' => 'integer',
            'status' => WorkOrderStatus::class,
            'notify_customer' => NotifyDirection::class,
            'mileage' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (WorkOrder $w) {
            // Callers that can race (two quick saves) create inside a transaction; see CreateWorkOrder.
            $w->number ??= (int) static::query()->lockForUpdate()->max('number') + 1;
            $w->planned_quarters ??= $w->duration_quarters;
            $w->status ??= WorkOrderStatus::Scheduled;
        });
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function mechanic(): BelongsTo
    {
        return $this->belongsTo(Mechanic::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(WorkOrderLine::class)->orderBy('sort_order')->orderBy('id');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function startPosition(): Position
    {
        return new Position($this->start_date->format('Y-m-d'), $this->start_quarter);
    }

    public function toScheduled(): ScheduledJob
    {
        return new ScheduledJob(
            $this->id,
            $this->mechanic_id,
            $this->startPosition(),
            $this->duration_quarters,
            $this->status->value,
            $this->notify_customer?->value,
        );
    }

    public function displayNumber(): string
    {
        return str_pad((string) $this->number, 4, '0', STR_PAD_LEFT);
    }
}
