<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Key-value settings. Read them through App\Support\Settings, which adds defaults and caching. */
class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }
}
