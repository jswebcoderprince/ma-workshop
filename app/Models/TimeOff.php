<?php

namespace App\Models;

use App\Enums\TimeOffType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeOff extends Model
{
    protected $table = 'time_off';

    protected $fillable = ['mechanic_id', 'type', 'starts_on', 'ends_on', 'note'];

    protected function casts(): array
    {
        return [
            'type' => TimeOffType::class,
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
        ];
    }

    public function mechanic(): BelongsTo
    {
        return $this->belongsTo(Mechanic::class);
    }
}
