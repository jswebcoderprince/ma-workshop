<?php

namespace App\Models;

use App\Enums\LineKind;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceLine extends Model
{
    protected $fillable = ['invoice_id', 'kind', 'description', 'quantity', 'unit', 'unit_price_cents', 'line_total_cents', 'sort_order'];

    protected function casts(): array
    {
        return [
            'kind' => LineKind::class,
            'quantity' => 'decimal:2',
            'unit_price_cents' => 'integer',
            'line_total_cents' => 'integer',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
