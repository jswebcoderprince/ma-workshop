<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = ['name', 'phone', 'email', 'company_code', 'vat_code', 'address', 'notes'];

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    /** Name, phone (any formatting) or plate. */
    public function scopeSearch(Builder $q, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $q;
        }
        $digits = preg_replace('/\D+/', '', $term);
        $plate = Vehicle::normalizePlate($term);

        return $q->where(function (Builder $w) use ($term, $digits, $plate) {
            $w->where('name', 'like', '%'.$term.'%')
                ->orWhereHas('vehicles', fn (Builder $v) => $v
                    ->where('plate', 'like', '%'.$plate.'%')
                    ->orWhere('make_model', 'like', '%'.$term.'%'));
            // Only digit-only input is a phone search; otherwise "KHR370" would match every +370 number.
            if (strlen($digits) >= 3 && ! preg_match('/\p{L}/u', $term)) {
                $w->orWhereRaw("REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', '') like ?", ['%'.$digits.'%']);
            }
        });
    }
}
