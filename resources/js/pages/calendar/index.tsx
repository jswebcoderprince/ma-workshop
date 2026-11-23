import { Board, type View } from '@/components/calendar/board';
import { FindSlot } from '@/components/calendar/find-slot';
import { JobForm, type Prefill } from '@/components/calendar/job-form';
import { JobInspector } from '@/components/calendar/job-inspector';
import { useStatusLabel } from '@/components/job-table';
import { Button, ButtonLink, Card, DurationChip, EmptyState, MechanicAvatar, Segmented, SelectInput, Tag } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { addDays, daysLabel } from '@/lib/calendar';
import { formatDate, formatShortDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CalendarDay, CalendarJob, CalendarLane, Hours, JobDetail, MechanicView, OffReason } from '@/types';
import { router } from '@inertiajs/react';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarDays, ChevronLeft, ChevronRight, HardHat, Package, Phone, Plus, Search, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    view: View;
    anchor: string;
    today: string;
    from: string;
    days: CalendarDay[];
    mechanics: CalendarLane[];
    jobs: CalendarJob[];
    summary: { booked: number; available: number; free: number; toCall: number; warnings: number };
    filters: { mechanic: number | null };
    options: MechanicView[];
    next: { date: string; quarter: number };
    hours: Hours;
    selected: JobDetail | null;
}

type Focus = 'all' | 'in_progress' | 'waiting_parts' | 'warning' | 'call';
const STEP: Record<View, number> = { day: 1, week: 7, month: 28 };

function useMedia(query: string) {
    const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const update = () => setMatch(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [query]);
    return match;
}

/** Change one query parameter and reload only some props (the inspector), keeping the board as it is. */
function setParam(param: string, value: string | number | null, only?: string[]) {
    const url = new URL(window.location.href);
    if (value === null) url.searchParams.delete(param);
    else url.searchParams.set(param, String(value));
    router.get(url.pathname + url.search, {}, { only, preserveState: true, preserveScroll: true });
}

export default function Calendar(props: Props) {
    const { view, anchor, today, from, days, mechanics, jobs, summary, filters, options, next, hours, selected } = props;
    const t = useT();
    const locale = useLocale();
    const wide = useMedia('(min-width: 1280px)');
    const desktop = useMedia('(min-width: 768px)');
    const [focus, setFocus] = useState<Focus>('all');
    const [form, setForm] = useState<{ open: boolean; key: number; prefill: Prefill }>({ open: false, key: 0, prefill: {} });
    const [finding, setFinding] = useState(false);

    const openForm = (prefill: Prefill = {}) => {
        setFinding(false);
        setForm((f) => ({ open: true, key: f.key + 1, prefill }));
    };

    // ?new=1 (from the overview or a customer's sheet) opens the form once, then is removed from the address.
    useEffect(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('new') !== '1') return;
        const num = (k: string) => (url.searchParams.get(k) !== null ? Number(url.searchParams.get(k)) : undefined);
        openForm({
            mechanicId: num('m'),
            date: url.searchParams.get('d') ?? undefined,
            quarter: num('q'),
            duration: num('len'),
            customerId: num('customer'),
        });
        ['new', 'm', 'd', 'q', 'len', 'customer'].forEach((k) => url.searchParams.delete(k));
        window.history.replaceState(window.history.state, '', url.pathname + url.search);
    }, []);

    // N = new job (when not typing and nothing else is open).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement;
            if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || el.closest('input, textarea, select, [role="dialog"]')) return;
            e.preventDefault();
            openForm();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const go = (params: Record<string, string | number | undefined>) =>
        router.get(
            route('calendar'),
            { view, date: anchor, mechanic: filters.mechanic ?? undefined, job: selected?.id, ...params },
            { preserveState: true, preserveScroll: true },
        );
    const openJob = (id: number) => (selected?.id === id ? setParam('job', null, ['selected']) : setParam('job', id, ['selected']));
    const closeJob = () => setParam('job', null, ['selected']);

    const dim = (j: CalendarJob) =>
        focus === 'all' ? false : focus === 'warning' ? j.warning === null : focus === 'call' ? j.notify === null : j.status !== focus;

    const last = days[days.length - 1]?.date ?? from;
    const range = view === 'day' ? formatDate(from, locale) : `${formatShortDate(from, locale)} – ${formatShortDate(last, locale)}`;
    const weekLabel =
        view === 'month' ? `${t('W:n', { n: days[0]?.week ?? '' })}–${days[days.length - 1]?.week}` : t('W:n', { n: days[0]?.week ?? '' });
    const pct = summary.available ? Math.round((summary.booked / summary.available) * 100) : 0;
    const count = (f: Focus) =>
        f === 'all' ? jobs.length : f === 'warning' ? summary.warnings : f === 'call' ? summary.toCall : jobs.filter((j) => j.status === f).length;
    const focusLabel: Record<Focus, string> = {
        all: t('All jobs'),
        in_progress: t('In progress'),
        waiting_parts: t('Waiting for parts'),
        warning: t('Overlaps'),
        call: t('To call'),
    };

    const inspector = selected && (
        <JobInspector
            job={selected}
            mechanics={options}
            hours={hours}
            context={{ view, date: anchor, mechanic: filters.mechanic }}
            onClose={closeJob}
        />
    );

    return (
        <AppLayout
            title={t('Calendar')}
            subtitle={t('Plan by quarter day. Nothing moves by itself: overlaps only warn.')}
            actions={
                <>
                    <Button icon={Search} onClick={() => setFinding(true)}>
                        {t('Find a slot')}
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={() => openForm()} title={t('Shortcut: N')}>
                        {t('New job')}
                    </Button>
                </>
            }
        >
            {/* toolbar */}
            <Card className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-2">
                    <Segmented<View>
                        value={view}
                        onChange={(v) => go({ view: v })}
                        options={[
                            { value: 'day', label: t('Day') },
                            { value: 'week', label: t('Week') },
                            { value: 'month', label: t('Month') },
                        ]}
                    />
                    <div className="border-line bg-panel flex h-[38px] items-center rounded-lg border">
                        <button
                            type="button"
                            aria-label={t('Previous')}
                            onClick={() => go({ date: addDays(anchor, -STEP[view]) })}
                            className="hover:bg-subtle grid h-full w-9 place-items-center rounded-l-lg"
                        >
                            <ChevronLeft className="size-[18px]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => go({ date: today })}
                            className="border-line hover:bg-subtle h-full border-x px-3 text-[12.5px] font-semibold"
                        >
                            {t('Today')}
                        </button>
                        <button
                            type="button"
                            aria-label={t('Next')}
                            onClick={() => go({ date: addDays(anchor, STEP[view]) })}
                            className="hover:bg-subtle grid h-full w-9 place-items-center rounded-r-lg"
                        >
                            <ChevronRight className="size-[18px]" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <CalendarDays className="text-p size-[18px]" />
                        <span className="text-[14.5px] font-bold">{range}</span>
                        <span className="bg-p-soft text-p-ink rounded px-1.5 py-0.5 font-mono text-[11px] font-bold">{weekLabel}</span>
                    </div>
                </div>
                <span className="flex-1" />
                <div className="flex flex-wrap items-center gap-2">
                    <SelectInput
                        aria-label={t('Mechanic')}
                        className="h-[34px] w-auto min-w-[160px] text-[13px]"
                        value={filters.mechanic ?? ''}
                        onChange={(e) => go({ mechanic: e.target.value ? Number(e.target.value) : undefined })}
                    >
                        <option value="">{t('All mechanics')}</option>
                        {options.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </SelectInput>
                </div>
            </Card>

            {/* focus filters + legend */}
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* phones: one row that scrolls sideways */}
                <div className="-mx-4 flex max-w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 whitespace-nowrap md:mx-0 md:max-w-none md:flex-wrap md:overflow-visible md:px-0">
                    {(Object.keys(focusLabel) as Focus[]).map((f) => (
                        <button
                            key={f}
                            type="button"
                            aria-pressed={focus === f}
                            onClick={() => setFocus(f)}
                            className={cn(
                                'flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold',
                                focus === f ? 'border-fg bg-fg text-panel' : 'border-line bg-panel text-fg-2 hover:bg-subtle',
                            )}
                        >
                            {f === 'warning' && <TriangleAlert className={cn('size-3.5', focus !== f && 'text-parts')} />}
                            {f === 'call' && <Phone className={cn('size-3.5', focus !== f && 'text-over')} />}
                            {f === 'waiting_parts' && <Package className="size-3.5" />}
                            {focusLabel[f]}
                            <span className={cn('font-mono text-[11px]', focus === f ? 'opacity-80' : 'text-muted-foreground')}>{count(f)}</span>
                        </button>
                    ))}
                </div>
                <span className="flex-1" />
                <div className="hidden md:block">
                    <Legend />
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    {mechanics.length === 0 ? (
                        <Card>
                            <EmptyState icon={HardHat} title={t('No mechanics yet')}>
                                <p className="mb-3">{t('Add mechanics first, then book jobs for them.')}</p>
                                <ButtonLink href={route('mechanics')} variant="primary">
                                    {t('Go to mechanics')}
                                </ButtonLink>
                            </EmptyState>
                        </Card>
                    ) : desktop ? (
                        <Card className="overflow-hidden">
                            <Board
                                view={view}
                                days={days}
                                lanes={mechanics}
                                jobs={jobs}
                                today={today}
                                selectedId={selected?.id ?? null}
                                dim={dim}
                                onJob={openJob}
                                onEmpty={(m, d, q) => openForm({ mechanicId: m, date: d, quarter: q })}
                            />
                        </Card>
                    ) : (
                        <Agenda
                            days={days}
                            lanes={mechanics}
                            jobs={jobs}
                            today={today}
                            dim={dim}
                            onJob={openJob}
                            onAdd={(d) => openForm({ date: d })}
                        />
                    )}

                    {/* footer metrics */}
                    <div className="text-fg-2 mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
                        <span>
                            {t('Booked')}: <b className="font-mono">{pct}%</b>{' '}
                            <span className="text-muted-foreground font-mono">
                                ({daysLabel(summary.booked)} / {daysLabel(summary.available)})
                            </span>
                        </span>
                        <span>
                            {t('Free time')}: <b className="text-open-ink font-mono">{daysLabel(summary.free)}</b>
                        </span>
                        {summary.toCall > 0 && (
                            <span className="text-over-ink font-semibold">
                                <Phone className="mr-1 inline size-3.5" />
                                {t('Customers to call: :n', { n: summary.toCall })}
                            </span>
                        )}
                        {summary.warnings > 0 && (
                            <span className="text-parts-ink font-semibold">
                                <TriangleAlert className="mr-1 inline size-3.5" />
                                {t('Overlaps: :n', { n: summary.warnings })}
                            </span>
                        )}
                        <span className="flex-1" />
                        <span className="text-muted-foreground hidden md:inline">{t('Click an empty spot to book there.')}</span>
                    </div>
                </div>

                {/* docked inspector on wide screens */}
                {wide && selected && (
                    <aside
                        className="border-line bg-panel sticky top-4 w-[360px] shrink-0 overflow-hidden rounded-lg border shadow-[0_4px_12px_-2px_rgba(15,23,42,.08)]"
                        style={{ height: 'calc(100vh - 140px)' }}
                    >
                        {inspector}
                    </aside>
                )}
            </div>

            {/* inspector as a drawer on smaller screens */}
            {!wide && (
                <Dialog.Root open={!!selected} onOpenChange={(v) => !v && closeJob()}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(15,23,42,.35)]" />
                        <Dialog.Content
                            aria-describedby={undefined}
                            className="bg-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[16px] shadow-xl outline-none md:inset-x-auto md:top-2.5 md:right-2.5 md:bottom-2.5 md:max-h-none md:w-[400px] md:rounded-[14px]"
                        >
                            <Dialog.Title className="sr-only">{selected ? `#${selected.number}` : t('Job')}</Dialog.Title>
                            {inspector}
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}

            <JobForm
                key={form.key}
                open={form.open}
                onClose={() => setForm((f) => ({ ...f, open: false }))}
                prefill={form.prefill}
                mechanics={options}
                hours={hours}
                next={next}
                view={view}
            />
            <FindSlot open={finding} onClose={() => setFinding(false)} onBook={openForm} />
        </AppLayout>
    );
}

function Legend() {
    const t = useT();
    const item = (cls: string, label: string) => (
        <span className="inline-flex items-center gap-1.5">
            <i className={cn('h-3 w-1 rounded-sm', cls)} />
            {label}
        </span>
    );
    return (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
            {item('bg-p/70', t('Scheduled'))}
            {item('bg-p', t('In progress'))}
            {item('bg-hold', t('Waiting for parts'))}
            {item('bg-ok', t('Completed'))}
            {item('bg-parts', t('Overlap'))}
            <span className="inline-flex items-center gap-1.5">
                <i className="hatch border-line size-3 rounded-sm border" />
                {t('Off or closed')}
            </span>
        </div>
    );
}

/** Phones: one list per day instead of the wide board. */
function Agenda({
    days,
    lanes,
    jobs,
    today,
    dim,
    onJob,
    onAdd,
}: {
    days: CalendarDay[];
    lanes: CalendarLane[];
    jobs: CalendarJob[];
    today: string;
    dim: (j: CalendarJob) => boolean;
    onJob: (id: number) => void;
    onAdd: (date: string) => void;
}) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const offLabel: Record<OffReason, string> = {
        holiday: t('Holiday'),
        day_off: t('Day off'),
        sick: t('Sick leave'),
        not_working: t('Not working'),
    };

    return (
        <div className="flex flex-col gap-3">
            {days.map((d) => {
                const items = jobs
                    .map((j) => {
                        const qs = j.cells.filter(([cd]) => cd === d.date).map(([, q]) => q);
                        return qs.length ? { j, first: Math.min(...qs), last: Math.max(...qs) } : null;
                    })
                    .filter((x): x is { j: CalendarJob; first: number; last: number } => x !== null)
                    .sort((a, b) => a.first - b.first || (a.j.mechanic?.name ?? '').localeCompare(b.j.mechanic?.name ?? ''));
                const off = lanes.filter((l) => l.off[d.date]);
                if (d.quarters === 0 && items.length === 0) {
                    if (d.weekday === 7) return null;
                    return (
                        <div key={d.date} className="hatch border-line text-hold-ink rounded-lg border px-3 py-2 text-[12.5px] font-semibold">
                            {formatDate(d.date, locale)} · {d.closure ?? t('Closed')}
                        </div>
                    );
                }
                return (
                    <Card key={d.date} className={cn(d.date === today && 'ring-p/40 ring-2')}>
                        <div className="border-line flex items-center gap-2 border-b px-3 py-2">
                            <span className={cn('text-[13.5px] font-bold', d.date === today && 'text-p')}>{formatDate(d.date, locale)}</span>
                            {d.quarters > 0 && d.date >= today && (
                                <span className="text-open-ink font-mono text-[11px] font-semibold">
                                    {t(':free free', { free: daysLabel(d.free) })}
                                </span>
                            )}
                            <span className="flex-1" />
                            {d.quarters > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onAdd(d.date)}
                                    aria-label={t('New job')}
                                    className="text-p hover:bg-p-soft grid size-8 place-items-center rounded-md"
                                >
                                    <Plus className="size-[18px]" />
                                </button>
                            )}
                        </div>
                        {off.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                                {off.map((l) => (
                                    <Tag key={l.id} tone="hold">
                                        {l.name}: {offLabel[l.off[d.date]]}
                                    </Tag>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-col gap-2 p-3">
                            {items.length === 0 && <p className="text-muted-foreground text-[12.5px]">{t('No jobs.')}</p>}
                            {items.map(({ j, first, last }) => (
                                <button
                                    key={j.id}
                                    type="button"
                                    onClick={() => onJob(j.id)}
                                    className={cn(
                                        'border-line bg-panel relative flex flex-col gap-0.5 overflow-hidden rounded-md border py-2 pr-3 pl-4 text-left',
                                        j.warning && 'border-parts-line bg-parts-bg/50',
                                        dim(j) && 'opacity-30',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'absolute inset-y-0 left-0 w-1',
                                            j.warning
                                                ? 'bg-parts'
                                                : j.status === 'completed'
                                                  ? 'bg-ok'
                                                  : j.status === 'waiting_parts'
                                                    ? 'bg-hold'
                                                    : j.status === 'in_progress'
                                                      ? 'bg-p'
                                                      : 'bg-p/70',
                                        )}
                                    />
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono text-[12px] font-bold">
                                            {d.times[first]}–{d.times[last + 1] ?? d.close}
                                        </span>
                                        <span className="text-p font-mono text-[11.5px] font-bold">#{j.number}</span>
                                        {j.notify && <Phone className="text-over size-3.5" />}
                                        <span className="flex-1" />
                                        <DurationChip quarters={j.duration} />
                                    </span>
                                    <span className="truncate text-[13px] font-semibold">
                                        {j.vehicle?.make} · {j.customer.name}
                                    </span>
                                    <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                                        {j.mechanic && <MechanicAvatar mechanic={j.mechanic} size="sm" />}
                                        <span className="truncate">
                                            {j.mechanic?.name} ·{' '}
                                            {j.warning ? (j.warning === 'overlap' ? t('Overlap') : t('Mechanic off')) : status(j.status)}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
