<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'activity_log';

    protected $fillable = ['user_id', 'subject_type', 'subject_id', 'action', 'changes'];

    protected function casts(): array
    {
        return ['changes' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** @param  array<string, mixed>|null  $changes */
    public static function record(string $action, ?Model $subject = null, ?array $changes = null): self
    {
        return self::create([
            'user_id' => auth()->id(),
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'action' => $action,
            'changes' => $changes,
        ]);
    }
}
