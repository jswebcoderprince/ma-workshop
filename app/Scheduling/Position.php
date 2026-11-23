<?php

namespace App\Scheduling;

/**
 * One working quarter: a date (Y-m-d, workshop-local) and a 0-based quarter number.
 */
final readonly class Position
{
    public function __construct(
        public string $date,
        public int $quarter,
    ) {}

    public function key(): string
    {
        return $this->date.'#'.$this->quarter;
    }

    public function compare(self $other): int
    {
        return [$this->date, $this->quarter] <=> [$other->date, $other->quarter];
    }

    public function isBefore(self $other): bool
    {
        return $this->compare($other) < 0;
    }

    public function equals(self $other): bool
    {
        return $this->compare($other) === 0;
    }

    /** @return array{date: string, quarter: int} */
    public function toArray(): array
    {
        return ['date' => $this->date, 'quarter' => $this->quarter];
    }
}
