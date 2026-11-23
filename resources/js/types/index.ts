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
