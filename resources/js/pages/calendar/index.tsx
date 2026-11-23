import { Board, BoardLegend, type View } from '@/components/calendar/board';
import { FindSlot } from '@/components/calendar/find-slot';
import { JobForm, type Prefill } from '@/components/calendar/job-form';
import { JobInspector } from '@/components/calendar/job-inspector';
import { ACCENT, BAR, toneOf } from '@/components/calendar/status-style';
import { useStatusLabel } from '@/components/job-table';
import { Button, ButtonLink, Card, EmptyState, MechanicAvatar, Segmented, SelectInput, Tag } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { addDays } from '@/lib/calendar';
import { formatDate, formatDays, formatShortDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CalendarDay, CalendarJob, CalendarLane, Hours, JobDetail, MechanicView, OffReason } from '@/types';
import { router } from '@inertiajs/react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, HardHat, MousePointerClick, Package, Phone, Plus, Search, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

    // Esc closes the job panel (on desktop it floats over the board and has no backdrop to click).
    useEffect(() => {
        if (!selected || !desktop) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !(e.target as HTMLElement).closest('[role="dialog"]')) closeJob();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected, desktop]);

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
            <Card className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
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
                    <div className="flex items-baseline gap-2 px-1">
                        <span className="text-[16px] font-semibold tracking-[-0.01em]">{range}</span>
                        <span className="text-muted-foreground text-[12.5px]">{weekLabel}</span>
                    </div>
                </div>
                <span className="flex-1" />
                <div className="flex flex-wrap items-center gap-3">
                    {summary.available > 0 && (
                        <span className="text-muted-foreground hidden text-[12.5px] whitespace-nowrap xl:inline">
                            {t('Booked')} <b className="text-fg font-semibold">{pct}%</b>
                            <span className="text-line-strong mx-2">|</span>
                            {t('Free time')} <b className="text-open-ink font-semibold">{formatDays(summary.free, locale)}</b>
                        </span>
                    )}
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

            {/* show only some jobs (the rest fade); phones: one row that scrolls sideways */}
            <div className="-mx-4 flex max-w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 pb-0.5 whitespace-nowrap md:mx-0 md:max-w-none md:flex-wrap md:overflow-visible md:px-0">
                {(Object.keys(focusLabel) as Focus[]).map((f) => (
                    <button
                        key={f}
                        type="button"
                        aria-pressed={focus === f}
                        onClick={() => setFocus(focus === f && f !== 'all' ? 'all' : f)}
                        className={cn(
                            'relative flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[.96]',
                            focus === f ? 'text-panel border-transparent' : 'border-line bg-panel text-fg-2 hover:border-line-strong',
                        )}
                    >
                        {focus === f && (
                            <motion.span
                                layoutId="calendar-focus"
                                className="bg-fg absolute inset-0 rounded-full"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                            />
                        )}
                        <span className="relative flex items-center gap-1.5">
                            {f === 'warning' && <TriangleAlert className={cn('size-3.5', focus !== f && 'text-over')} />}
                            {f === 'call' && <Phone className={cn('size-3.5', focus !== f && 'text-over')} />}
                            {f === 'waiting_parts' && <Package className={cn('size-3.5', focus !== f && 'text-parts')} />}
                            {focusLabel[f]}
                            <span className={cn('text-[11.5px] tabular-nums', focus === f ? 'opacity-70' : 'text-muted-foreground')}>{count(f)}</span>
                        </span>
                    </button>
                ))}
            </div>

            <div>
                <div className="min-w-0">
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
                                key={`${view}-${from}`}
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
                            <div className="border-line flex flex-wrap items-center gap-x-6 gap-y-2 border-t px-4 py-3">
                                <BoardLegend view={view} />
                                <span className="flex-1" />
                                <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                                    <MousePointerClick className="size-3.5" />
                                    {t('Click an empty spot to book there.')}
                                </span>
                            </div>
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
                </div>
            </div>

            {/* desktop: the job floats in from the right over the board, which keeps its full width */}
            {desktop && (
                <AnimatePresence>
                    {selected && (
                        <motion.aside
                            key="inspector"
                            aria-label={`#${selected.number}`}
                            initial={{ opacity: 0, x: 48 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 48, transition: { duration: 0.16, ease: [0.65, 0, 0.35, 1] } }}
                            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                            className="border-line bg-panel fixed top-[76px] right-4 bottom-4 z-40 w-[380px] overflow-hidden rounded-xl border shadow-[0_24px_60px_-20px_rgba(15,23,42,.45)]"
                        >
                            <motion.div
                                key={selected.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.18 }}
                                className="h-full"
                            >
                                {inspector}
                            </motion.div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            )}

            {/* phones: the job slides up as a sheet */}
            {!desktop && (
                <Dialog.Root open={!!selected} onOpenChange={(v) => !v && closeJob()}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-[rgba(15,23,42,.35)]" />
                        <Dialog.Content
                            aria-describedby={undefined}
                            className="bg-panel data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[16px] shadow-xl outline-none data-[state=closed]:duration-200 data-[state=open]:duration-300"
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
                                <span className="text-open-ink text-[12px] font-medium">{t(':free free', { free: formatDays(d.free, locale) })}</span>
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
                                        'relative flex flex-col gap-0.5 overflow-hidden rounded-md border py-2 pr-3 pl-4 text-left transition-[transform,opacity] duration-150 active:scale-[.98]',
                                        BAR[toneOf(j)],
                                        dim(j) && 'opacity-30',
                                    )}
                                >
                                    <span className={cn('absolute inset-y-0 left-0 w-[3px]', ACCENT[toneOf(j)])} />
                                    <span className="flex items-center gap-2">
                                        <span className="text-[12.5px] font-semibold tabular-nums">
                                            {d.times[first]}–{d.times[last + 1] ?? d.close}
                                        </span>
                                        <span className="text-muted-foreground text-[12px] tabular-nums">#{j.number}</span>
                                        {j.notify && <Phone className="text-over size-3.5" />}
                                        <span className="flex-1" />
                                        <span className="text-muted-foreground text-[12px]">{formatDays(j.duration, locale)}</span>
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
