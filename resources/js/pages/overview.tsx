import { ACCENT, toneOf } from '@/components/calendar/status-style';
import { useStatusLabel } from '@/components/job-table';
import { Button, ButtonLink, Card, CardHeader, DurationChip, EmptyState, MechanicAvatar, StatCard, Tag } from '@/components/ui-kit';
import { WorkloadChart, type WorkloadWeek } from '@/components/workload-chart';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatShortDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useVehicleLabels } from '@/lib/vehicles';
import type { JobStatus, MechanicView } from '@/types';
import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CalendarClock,
    CalendarOff,
    CalendarRange,
    Check,
    CircleCheck,
    ClipboardList,
    HardHat,
    MoveLeft,
    Phone,
    PhoneCall,
    Plus,
    Sparkles,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';

type Card = {
    id: number;
    number: string;
    description: string;
    status: JobStatus;
    notify: 'earlier' | 'later' | null;
    warning: 'overlap' | 'mechanic_off' | null;
    duration: number;
    planned: number;
    start: { date: string; quarter: number; time: string };
    end: { date: string; time: string };
    customer: { name: string; phone: string | null };
    vehicle: { make: string; plate: string | null; type: string } | null;
    mechanic: { id: number; name: string } | null;
};
type LaneJob = Card & { from: string; to: string; todayQuarters: number };
type Lane = MechanicView & {
    off: 'holiday' | 'day_off' | 'sick' | 'not_working' | 'closed' | null;
    booked: number;
    available: number;
    jobs: LaneJob[];
    free: { from: string; to: string; quarter: number; quarters: number }[];
};
type Attention =
    | (Card & { kind: 'warning'; warning: 'overlap' | 'mechanic_off' })
    | (Card & { kind: 'call' })
    | (Card & { kind: 'earlier'; to: { date: string; quarter: number; time: string } });

interface Props {
    today: { date: string; week: number; open: boolean };
    stats: {
        jobsToday: { total: number; inProgress: number; scheduled: number; completed: number; waiting: number; bookedPercent: number };
        mechanics: { working: number; total: number; off: { name: string; reason: string | null }[]; avatars: MechanicView[] };
        warnings: { total: number; first: { number: string; vehicle: string | null; warning: string } | null };
        toCall: { total: number; earlier: number; later: number };
        bookedThisWeek: number;
        bookedNextWeek: number;
        nextFree: { date: string; time: string; mechanic: string } | null;
    };
    lanes: Lane[];
    attention: Attention[];
    workload: WorkloadWeek[];
}

function useOffLabel() {
    const t = useT();
    const labels: Record<string, string> = {
        holiday: t('Holiday'),
        day_off: t('Day off'),
        sick: t('Sick leave'),
        not_working: t('Not working'),
        closed: t('Closed'),
    };
    return (r: string | null) => (r ? (labels[r] ?? r) : '');
}

export default function Overview({ today, stats, lanes, attention, workload }: Props) {
    const t = useT();
    const locale = useLocale();
    const offLabel = useOffLabel();
    const [weeks, setWeeks] = useState<8 | 4>(8);
    const j = stats.jobsToday;
    const pct = (n: number) => (j.total ? `${(n / j.total) * 100}%` : '0%');

    return (
        <AppLayout
            title={t('Workshop overview')}
            titleExtra={
                stats.nextFree && (
                    <span className="border-open-line bg-open-bg text-open-ink inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold">
                        <span className="bg-open size-1.5 animate-pulse rounded-full" />
                        {t('Next free 1-day slot')}: {formatShortDate(stats.nextFree.date, locale)} {stats.nextFree.time} · {stats.nextFree.mechanic}
                    </span>
                )
            }
            subtitle={`${t('Today’s operations')} · ${formatDate(today.date, locale)} · ${t('Week')} ${today.week}`}
            actions={
                <>
                    <ButtonLink href={route('calendar')} icon={CalendarRange}>
                        {t('Open calendar')}
                    </ButtonLink>
                    <ButtonLink href={route('calendar', { new: 1 })} variant="primary" icon={Plus}>
                        {t('New job')}
                    </ButtonLink>
                </>
            }
        >
            {/* KPI cards */}
            <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label={t('Jobs today')} icon={ClipboardList} value={j.total} note={t('on the calendar')}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11.5px] font-semibold">
                        <span className="text-muted-foreground">
                            {t(':a in progress · :b scheduled · :c done', { a: j.inProgress, b: j.scheduled, c: j.completed })}
                        </span>
                        <span className="text-p whitespace-nowrap">{t(':n% booked', { n: j.bookedPercent })}</span>
                    </div>
                    <div className="bg-subtle mt-2 h-2 overflow-hidden rounded-full">
                        <div className="grow-x flex h-full">
                            <div className="bg-ok h-full" style={{ width: pct(j.completed) }} />
                            <div className="bg-p h-full" style={{ width: pct(j.inProgress) }} />
                            <div className="bg-p-line h-full" style={{ width: pct(j.scheduled) }} />
                            <div className="bg-hold-line h-full" style={{ width: pct(j.waiting) }} />
                        </div>
                    </div>
                </StatCard>

                <StatCard
                    label={t('Mechanics working')}
                    icon={HardHat}
                    tone="ok"
                    value={t(':a of :b', { a: stats.mechanics.working, b: stats.mechanics.total })}
                    note={<span className="text-ok-ink font-medium">{t('today')}</span>}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex -space-x-2">
                            {stats.mechanics.avatars.map((m) => (
                                <span key={m.id} className="ring-panel rounded-lg ring-2">
                                    <MechanicAvatar mechanic={m} size="sm" />
                                </span>
                            ))}
                        </div>
                        <span className="text-muted-foreground truncate text-[12px]">
                            {stats.mechanics.off.length
                                ? stats.mechanics.off.map((o) => `${o.name} (${offLabel(o.reason)})`).join(', ')
                                : t('Everyone is in')}
                        </span>
                    </div>
                </StatCard>

                <StatCard label={t('Overlaps')} icon={TriangleAlert} tone={stats.warnings.total ? 'over' : 'ok'} value={stats.warnings.total}>
                    {stats.warnings.first ? (
                        <div className="bg-over-bg/70 text-over-ink flex items-center gap-2 rounded-lg p-2 text-[12px]">
                            <ArrowRight className="size-4 shrink-0" />
                            <span className="truncate">
                                #{stats.warnings.first.number} ({stats.warnings.first.vehicle}):{' '}
                                {stats.warnings.first.warning === 'overlap' ? t('overlaps another job') : t('mechanic is off')}
                            </span>
                        </div>
                    ) : (
                        <div className="bg-ok-soft text-ok-ink flex items-center gap-2 rounded-lg p-2 text-[12px] font-medium">
                            <CircleCheck className="size-4 shrink-0" />
                            {t('No overlaps in the schedule')}
                        </div>
                    )}
                </StatCard>

                <StatCard
                    label={t('Customers to call')}
                    icon={PhoneCall}
                    tone={stats.toCall.total ? 'over' : 'ok'}
                    value={stats.toCall.total}
                    note={stats.toCall.total ? t('pending') : undefined}
                >
                    <div className="flex items-center justify-between text-[12px] font-medium">
                        <span className="text-ok-ink flex items-center gap-1.5">
                            <span className="bg-ok size-1.5 rounded-full" />
                            {t(':n moved earlier', { n: stats.toCall.earlier })}
                        </span>
                        <span className="text-over-ink flex items-center gap-1.5">
                            <span className="bg-over size-1.5 rounded-full" />
                            {t(':n moved later', { n: stats.toCall.later })}
                        </span>
                    </div>
                </StatCard>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                <div className="space-y-5 lg:col-span-8">
                    <Card>
                        <CardHeader
                            title={t('Today’s schedule by mechanic')}
                            icon={CalendarClock}
                            sub={t(':n working', { n: stats.mechanics.working })}
                        >
                            <Link
                                href={route('calendar')}
                                className="text-p hover:text-p-hover group flex items-center gap-1 text-[12.5px] font-semibold"
                            >
                                {t('Open calendar')}
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        </CardHeader>
                        <div className="stagger space-y-4 px-4 pb-4">
                            {lanes.length === 0 && <EmptyState icon={HardHat} title={t('No mechanics yet')} />}
                            {lanes.map((lane) => (
                                <LaneCard key={lane.id} lane={lane} todayOpen={today.open} />
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title={t('Workload')} icon={CalendarRange} sub={t(':n% booked this week', { n: stats.bookedThisWeek })}>
                            <div className="flex h-[30px] gap-5">
                                {([8, 4] as const).map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        aria-pressed={weeks === n}
                                        onClick={() => setWeeks(n)}
                                        className={cn(
                                            'text-muted-foreground border-b-2 border-transparent px-0.5 text-[13px] font-semibold',
                                            weeks === n && 'border-p text-fg',
                                        )}
                                    >
                                        {n === 8 ? t('8 weeks') : t('4 weeks')}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <div className="text-fg-2 flex gap-4 px-4 pb-1 text-[12.5px]">
                            <span className="inline-flex items-center gap-1.5">
                                <i className="bg-p size-3 rounded-[3px]" />
                                {t('Booked')}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <i className="size-3 rounded-[3px] bg-[#3fc6a0]" />
                                {t('Available')}
                            </span>
                        </div>
                        <div className="px-3 pb-3">
                            <WorkloadChart weeks={workload.slice(0, weeks)} />
                        </div>
                    </Card>
                </div>

                <div className="space-y-5 lg:col-span-4">
                    <Card>
                        <CardHeader title={t('Needs attention')} icon={BellRing}>
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums',
                                    attention.length ? 'bg-over-bg text-over-ink' : 'bg-ok-soft text-ok-ink',
                                )}
                            >
                                {t(':n items', { n: attention.length })}
                            </span>
                        </CardHeader>
                        <div className="stagger space-y-2.5 px-4 pb-4">
                            {attention.length === 0 && (
                                <div className="bg-ok-soft text-ok-ink flex items-center gap-2 rounded-lg p-3 text-[13px] font-medium">
                                    <CircleCheck className="size-5" />
                                    {t('Nothing needs attention right now.')}
                                </div>
                            )}
                            {attention.map((a) => (
                                <AttentionItem key={`${a.kind}-${a.id}`} item={a} />
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );

    function LaneCard({ lane, todayOpen }: { lane: Lane; todayOpen: boolean }) {
        const types = useVehicleLabels();
        const status = useStatusLabel();
        if (lane.off) {
            return (
                <div className="bg-subtle/80 flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <MechanicAvatar mechanic={lane} muted />
                        <div>
                            <div className="text-muted-foreground text-[15px] font-semibold">{lane.name}</div>
                            <div className="text-muted-foreground text-[12px]">{lane.vehicleTypes.map(types).join(', ')}</div>
                        </div>
                    </div>
                    <span className="bg-panel text-hold-ink flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-semibold">
                        <CalendarOff className="size-4" />
                        {todayOpen ? offLabel(lane.off) : t('Workshop closed today')}
                    </span>
                </div>
            );
        }
        const loadPct = lane.available ? Math.round((lane.booked / lane.available) * 100) : 0;
        const tone = loadPct >= 100 ? 'over' : loadPct >= 75 ? 'parts' : 'ok';
        return (
            <div className="bg-tint rounded-lg p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <MechanicAvatar mechanic={lane} />
                        <div>
                            <div className="text-[15px] font-semibold">{lane.name}</div>
                            <div className="text-muted-foreground text-[12px]">{lane.vehicleTypes.map(types).join(', ')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                            <div className="font-mono text-[12px] font-semibold">
                                {(lane.booked / 4).toFixed(2).replace(/0$/, '')}d / {(lane.available / 4).toFixed(1)}d
                            </div>
                            <div
                                className={cn(
                                    'text-[11.5px] font-medium',
                                    tone === 'over' ? 'text-over-ink' : tone === 'parts' ? 'text-parts-ink' : 'text-ok-ink',
                                )}
                            >
                                {loadPct >= 100 ? t('Fully booked') : t(':n% booked', { n: loadPct })}
                            </div>
                        </div>
                        <div className="bg-panel h-2 w-16 overflow-hidden rounded-full">
                            <div
                                className={cn('grow-x h-full rounded-full', tone === 'over' ? 'bg-over' : tone === 'parts' ? 'bg-parts' : 'bg-ok')}
                                style={{ width: `${Math.min(100, loadPct)}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {lane.jobs.map((job) => {
                        return (
                            <Link
                                key={job.id}
                                href={route('jobs.show', job.id)}
                                className={cn(
                                    'lift press relative block overflow-hidden rounded-md p-2.5 pl-4 shadow-[0_1px_2px_rgba(15,23,42,.06)]',
                                    job.warning ? 'bg-over-bg' : 'bg-panel',
                                )}
                            >
                                <span className={cn('absolute inset-y-0 left-0 w-[3px]', ACCENT[toneOf(job)])} />
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[12.5px] font-semibold">
                                        <span className="text-p font-mono">#{job.number}</span> · {job.vehicle?.make ?? job.customer.name}
                                    </span>
                                    <DurationChip quarters={job.duration} />
                                </div>
                                <div className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-[11.5px]">
                                    <span className="font-mono">
                                        {job.from} – {job.to}
                                    </span>
                                    {job.warning ? (
                                        <span className="text-over-ink flex items-center gap-1 font-semibold">
                                            <TriangleAlert className="size-3.5" />
                                            {job.warning === 'overlap' ? t('Overlap') : t('Mechanic off')}
                                        </span>
                                    ) : (
                                        <span className="truncate font-medium">{status(job.status)}</span>
                                    )}
                                </div>
                                <div className="text-fg-2 mt-0.5 truncate text-[12px]">{job.description}</div>
                            </Link>
                        );
                    })}
                    {lane.free.map((f) => (
                        <div
                            key={f.from}
                            className="border-open-line bg-open-bg/80 flex flex-col justify-between gap-2 rounded-md border border-dashed p-2.5"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-open-ink text-[12px] font-semibold">{t('Open slot')}</span>
                                <span className="text-open-ink font-mono text-[11px] font-semibold">
                                    {(f.quarters / 4).toFixed(2).replace(/0$/, '')}d
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-open-ink font-mono text-[11.5px]">
                                    {f.from} – {f.to}
                                </span>
                                <Link
                                    href={route('calendar', {
                                        view: 'day',
                                        date: today.date,
                                        new: 1,
                                        m: lane.id,
                                        d: today.date,
                                        q: f.quarter,
                                        len: f.quarters,
                                    })}
                                    className="bg-open press rounded px-2 py-1 text-[11px] font-semibold text-white transition-[filter,transform] hover:brightness-110"
                                >
                                    + {t('Book')}
                                </Link>
                            </div>
                        </div>
                    ))}
                    {lane.jobs.length === 0 && lane.free.length === 0 && (
                        <p className="text-muted-foreground text-[12.5px]">{t('Nothing planned for the rest of today.')}</p>
                    )}
                </div>
            </div>
        );
    }

    function AttentionItem({ item }: { item: Attention }) {
        const when = `${formatDate(item.start.date, locale)} ${item.start.time}`;
        const title = `#${item.number} · ${item.vehicle?.make ?? item.customer.name}`;

        if (item.kind === 'warning') {
            return (
                <div className="bg-over-bg/40 space-y-1.5 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <Tag tone="over" icon={TriangleAlert}>
                            {item.warning === 'overlap' ? t('Overlap') : t('Mechanic off')}
                        </Tag>
                        <span className="text-muted-foreground text-[11.5px]">{item.mechanic?.name}</span>
                    </div>
                    <p className="text-[14px] leading-snug font-semibold">{title}</p>
                    <p className="text-fg-2 text-[12.5px]">
                        {item.description} · {when} → {formatShortDate(item.end.date, locale)} {item.end.time}
                    </p>
                    <ButtonLink href={route('calendar', { date: item.start.date, job: item.id })} size="sm" className="mt-1 w-full">
                        {t('Open in calendar')}
                    </ButtonLink>
                </div>
            );
        }

        if (item.kind === 'call') {
            return (
                <div className="bg-over-bg/40 space-y-1.5 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                        <Tag tone={item.notify === 'earlier' ? 'ok' : 'over'}>
                            {item.notify === 'earlier' ? t('Moved earlier') : t('Moved later')}
                        </Tag>
                        <span className="text-over-ink text-[11.5px] font-bold">{t('Not informed')}</span>
                    </div>
                    <p className="text-[14px] leading-snug font-semibold">
                        {item.customer.name} · {item.vehicle?.make}
                    </p>
                    <p className="text-fg-2 text-[12.5px]">
                        {t('New start')}: <b className="font-semibold">{when}</b>
                    </p>
                    <div className="flex flex-col gap-1.5 pt-1">
                        {item.customer.phone && (
                            <a
                                href={`tel:${item.customer.phone.replace(/\s/g, '')}`}
                                className="bg-parts flex h-8 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold text-white hover:brightness-110"
                            >
                                <Phone className="size-4" />
                                {t('Call')} {item.customer.phone}
                            </a>
                        )}
                        <Button size="sm" icon={Check} onClick={() => router.post(route('jobs.informed', item.id), {}, { preserveScroll: true })}>
                            {t('Mark informed')}
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-open-bg/60 space-y-1.5 rounded-lg p-3">
                <div className="flex items-center justify-between">
                    <Tag tone="open" icon={Sparkles}>
                        {t('Could start earlier')}
                    </Tag>
                    <span className="text-muted-foreground text-[11.5px]">{item.mechanic?.name}</span>
                </div>
                <p className="text-[14px] leading-snug font-semibold">{title}</p>
                <p className="text-fg-2 text-[12.5px]">
                    <s className="text-muted-foreground">{when}</s> →{' '}
                    <b className="font-semibold">{`${formatDate(item.to.date, locale)} ${item.to.time}`}</b>
                </p>
                <Button
                    size="sm"
                    variant="primary"
                    icon={MoveLeft}
                    className="mt-1 w-full"
                    onClick={() =>
                        router.post(
                            route('jobs.move', item.id),
                            { mechanic_id: item.mechanic?.id, date: item.to.date, quarter: item.to.quarter },
                            { preserveScroll: true },
                        )
                    }
                >
                    {t('Move to :when', { when: `${formatShortDate(item.to.date, locale)} ${item.to.time}` })}
                </Button>
            </div>
        );
    }
}
