<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A day the whole workshop is closed (public holiday). */
class Closure extends Model
{
    protected $fillable = ['date', 'name'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }
}
