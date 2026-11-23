<?php

namespace App\Scheduling;

/**
 * What the scheduling maths needs to know about one job (a WorkOrder in the database).
 */
final readonly class ScheduledJob
{
    public const SCHEDULED = 'scheduled';

    public const IN_PROGRESS = 'in_progress';

    public const WAITING_PARTS = 'waiting_parts';

    public const COMPLETED = 'completed';

    public function __construct(
        public int $id,
        public int $mechanicId,
        public Position $start,
        public int $duration,
        public string $status = self::SCHEDULED,
        public ?string $notify = null,
    ) {}

    /** Jobs waiting for parts do not hold the mechanic's time. */
    public function blocksTime(): bool
    {
        return $this->status !== self::WAITING_PARTS;
    }

    public function canWarn(): bool
    {
        return $this->status !== self::WAITING_PARTS && $this->status !== self::COMPLETED;
    }
}
