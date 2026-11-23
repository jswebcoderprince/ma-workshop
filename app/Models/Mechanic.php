<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Mechanic extends Model
{
    protected $fillable = ['name', 'vehicle_types', 'work_days', 'color', 'sort_order', 'active'];

    protected function casts(): array
    {
        return [
            'vehicle_types' => 'array',
            'work_days' => 'array',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function timeOff(): HasMany
    {
        return $this->hasMany(TimeOff::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy('sort_order')->orderBy('name');
    }

    public function worksOn(string $vehicleType): bool
    {
        return in_array($vehicleType, $this->vehicle_types ?? [], true);
    }
}
