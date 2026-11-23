<?php

namespace App\Models;

use App\Enums\LineKind;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkOrderLine extends Model
{
    protected $fillable = ['work_order_id', 'kind', 'description', 'quantity', 'unit', 'unit_price_cents', 'sort_order'];

    protected function casts(): array
    {
        return ['kind' => LineKind::class, 'quantity' => 'decimal:2', 'unit_price_cents' => 'integer'];
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function totalCents(): int
    {
        return (int) round((float) $this->quantity * $this->unit_price_cents);
    }
}
