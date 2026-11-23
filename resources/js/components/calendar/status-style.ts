import type { CalendarJob } from '@/types';

/**
 * One look per job state, shared by the board, the phone agenda and the legend.
 * A warning (overlap or mechanic off) wins over the status, so it is never missed.
 */
export type Tone = 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'warning';

export function toneOf(job: Pick<CalendarJob, 'status' | 'warning'>): Tone {
    return job.warning ? 'warning' : job.status;
}

/** Job bar body (week and day views, phone agenda). */
export const BAR: Record<Tone, string> = {
    scheduled: 'border-line bg-panel text-fg',
    in_progress: 'border-p-line bg-p-soft text-fg',
    waiting_parts: 'border-parts-line stripes-parts text-fg',
    completed: 'border-line bg-subtle text-muted-foreground',
    warning: 'border-over-line bg-over-bg text-fg',
};

/** The 3px strip on the left of a bar. */
export const ACCENT: Record<Tone, string> = {
    scheduled: 'bg-p/45',
    in_progress: 'bg-p',
    waiting_parts: 'bg-parts',
    completed: 'bg-ok',
    warning: 'bg-over',
};

/** A booked quarter in the month view. */
export const CELL: Record<Tone, string> = {
    scheduled: 'bg-p/35',
    in_progress: 'bg-p',
    waiting_parts: 'stripes-parts-strong',
    completed: 'bg-line-strong',
    warning: 'bg-over',
};

export const TONE_ORDER: Tone[] = ['scheduled', 'in_progress', 'waiting_parts', 'completed', 'warning'];
