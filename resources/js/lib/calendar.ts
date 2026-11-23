import type { Hours } from '@/types';

/** Client-side date and quarter helpers. Dates are plain Y-m-d strings in workshop time. */

export const QUARTER_MINUTES = 150;

export function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number);
    const js = new Date(Date.UTC(y, m - 1, d + days));
    return js.toISOString().slice(0, 10);
}

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

/** Quarters the workshop has on that weekday (closures are checked by the server). */
export function quartersOn(hours: Hours, date: string): number {
    return hours[String(isoWeekday(date))]?.quarters ?? 0;
}

/** "HH:MM" at the start of quarter q (q = quarters gives the closing time). */
export function quarterTime(hours: Hours, date: string, q: number): string {
    const open = hours[String(isoWeekday(date))]?.open ?? '08:00';
    const [h, m] = open.split(':').map(Number);
    const minutes = h * 60 + m + q * QUARTER_MINUTES;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** 0.25d, 0.5d, 1d, 1.75d … as Stitch shows durations. */
export function daysLabel(quarters: number): string {
    return `${String(+(quarters / 4).toFixed(2))}d`;
}

export const DURATION_PRESETS = [1, 2, 3, 4, 6, 8, 12, 20];

/** GET a JSON endpoint of our own app (session cookie included). */
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
}

export interface Slot {
    mechanic: { id: number; name: string; color: string; vehicleTypes: string[]; workDays: number[] };
    start: { date: string; quarter: number; time: string } | null;
    end: { date: string; time: string } | null;
}

export interface Check {
    valid: boolean;
    end: { date: string; time: string } | null;
    warning: 'overlap' | 'mechanic_off' | null;
}
