export interface User {
    id: number;
    name: string;
    email: string;
}

export interface SharedData {
    auth: { user: User | null };
    locale: 'en' | 'lt';
    translations: Record<string, string>;
    workshop: { name: string; accent: 'cobalt' | 'teal'; timezone: string };
    shell: {
        today: string;
        week: number;
        hours: { open: string; close: string } | null;
        roster: RosterEntry[];
        counts: { openJobs: number; toCall: number; warnings: number };
    } | null;
    flash: { status: string | null; warning: string | null };
    [key: string]: unknown;
}

export interface RosterEntry {
    id: number;
    name: string;
    color: string;
    status: 'working' | 'holiday' | 'day_off' | 'sick' | 'not_working' | 'closed';
    booked: number;
    available: number;
}

export type JobStatus = 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed';
export type VehicleType = 'car' | 'moto' | 'water';

export interface MechanicView {
    id: number;
    name: string;
    color: string;
    vehicleTypes: VehicleType[];
    workDays: number[];
}

export interface VehicleView {
    id: number;
    type: VehicleType;
    make: string;
    year: number | null;
    plate: string | null;
    vin: string | null;
    canDelete?: boolean;
}

export interface TimeOffView {
    id: number;
    type: 'holiday' | 'day_off' | 'sick';
    from: string;
    to: string;
    note: string | null;
}

export interface JobRow {
    id: number;
    number: string;
    description: string;
    status: JobStatus;
    notify: 'earlier' | 'later' | null;
    warning: 'overlap' | 'mechanic_off' | null;
    duration: number;
    planned: number;
    start: { date: string; quarter: number; time: string };
    end: { date: string; quarter: number; time: string };
    customer: { id: number; name: string; phone: string | null };
    vehicle: { type: VehicleType; make: string; year: number | null; plate: string | null } | null;
    mechanic: MechanicView | null;
}

export interface CalendarDay {
    date: string;
    weekday: number;
    week: number;
    quarters: number;
    times: string[];
    close: string | null;
    closure: string | null;
    free: number;
}

export type OffReason = 'holiday' | 'day_off' | 'sick' | 'not_working';

export interface CalendarLane extends MechanicView {
    off: Record<string, OffReason>;
    booked: number;
    available: number;
}

export interface CalendarJob extends JobRow {
    cells: [string, number][];
}

export interface JobDetail extends JobRow {
    mileage: number | null;
    customer: { id: number; name: string; phone: string | null; email: string | null };
    vehicle: { id: number; type: VehicleType; make: string; year: number | null; plate: string | null; vin: string | null } | null;
    earlier: { date: string; quarter: number; time: string } | null;
    log: { action: string; at: string | null; changes: Record<string, unknown> | null }[];
}

export type Hours = Record<string, { open: string; quarters: number }>;
