<?php

namespace App\Models;

use App\Enums\VehicleType;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vehicle extends Model
{
    protected $fillable = ['customer_id', 'type', 'make_model', 'year', 'plate', 'vin'];

    protected function casts(): array
    {
        return ['type' => VehicleType::class, 'year' => 'integer'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Stored upper-case without spaces so "abc 123" and "ABC123" match. */
    protected function plate(): Attribute
    {
        return Attribute::make(set: fn (?string $v) => $v === null || trim($v) === '' ? null : self::normalizePlate($v));
    }

    protected function vin(): Attribute
    {
        return Attribute::make(set: fn (?string $v) => $v === null || trim($v) === '' ? null : strtoupper(preg_replace('/\s+/', '', $v)));
    }

    public static function normalizePlate(string $plate): string
    {
        return mb_strtoupper(preg_replace('/[\s-]+/', '', $plate));
    }

    /** ABC123 → ABC 123, 12ABC → 12 ABC (Lithuanian layouts); anything else unchanged. */
    public static function formatPlate(?string $plate): ?string
    {
        if ($plate === null) {
            return null;
        }
        if (preg_match('/^([A-Z]{3})(\d{3})$/u', $plate, $m) || preg_match('/^(\d{2,3})([A-Z]{2,3})$/u', $plate, $m)) {
            return $m[1].' '.$m[2];
        }

        return $plate;
    }

    public function label(): string
    {
        return trim($this->make_model
            .($this->year ? ' '.$this->year : '')
            .($this->plate ? ' · '.self::formatPlate($this->plate) : ''));
    }
}
