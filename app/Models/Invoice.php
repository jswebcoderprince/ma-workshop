<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Frozen at issue time: seller, buyer and lines are copies. */
class Invoice extends Model
{
    protected $fillable = [
        'work_order_id', 'series', 'number', 'issued_on', 'due_on', 'seller', 'buyer',
        'vat_payer', 'vat_rate', 'subtotal_cents', 'vat_cents', 'total_cents', 'voided_at',
    ];

    protected function casts(): array
    {
        return [
            'issued_on' => 'date:Y-m-d',
            'due_on' => 'date:Y-m-d',
            'seller' => 'array',
            'buyer' => 'array',
            'vat_payer' => 'boolean',
            'vat_rate' => 'decimal:2',
            'subtotal_cents' => 'integer',
            'vat_cents' => 'integer',
            'total_cents' => 'integer',
            'voided_at' => 'datetime',
        ];
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class)->orderBy('sort_order')->orderBy('id');
    }

    public function displayNumber(): string
    {
        return $this->series.'-'.str_pad((string) $this->number, 4, '0', STR_PAD_LEFT);
    }
}
