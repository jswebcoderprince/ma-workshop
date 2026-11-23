import { useStatusLabel } from '@/components/job-table';
import { MechanicAvatar, Plate } from '@/components/ui-kit';
import { formatDate, formatDays, formatShortDate, weekdayShort } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useVehicleLabels } from '@/lib/vehicles';
import type { CalendarDay, CalendarJob, CalendarLane, OffReason } from '@/types';
import { CalendarOff, Check, Package, Palmtree, Phone, Plus, Stethoscope, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ACCENT, BAR, CELL, TONE_ORDER, toneOf, type Tone } from './status-style';

export type View = 'day' | 'week' | 'month';

interface Props {
    view: View;
    days: CalendarDay[];
    lanes: CalendarLane[];
    jobs: CalendarJob[];
    today: string;
    selectedId: number | null;
    dim: (job: CalendarJob) => boolean;
    onJob: (id: number) => void;
    onEmpty: (mechanicId: number, date: string, quarter: number) => void;
}

/**
 * The schedule board (docs/DESIGN.md "Calendar"): one row per mechanic, days split in quarter columns.
 * Week and day views draw each job as a bar. The month view draws every quarter as a small cell
 * (booked = coloured), like the sidebar, because bars that narrow can no longer carry text.
 * Details of a job come in a hover card; an empty quarter shows "+ time" and books there.
 */
const GEOMETRY: Record<View, { unit: number; name: number; row: number; header: string; free: string }> = {
    month: { unit: 8, name: 176, row: 44, header: '26px 30px', free: '30px' },
    week: { unit: 40, name: 188, row: 58, header: '46px', free: '34px' },
    day: { unit: 170, name: 220, row: 104, header: '40px', free: '' },
};

/** Width of a day in quarter columns. Closed days stay visible but narrow. */
function unitsOf(d: CalendarDay) {
    return d.quarters > 0 ? d.quarters : d.weekday === 7 ? 1 : 2;
}

const OFF_ICON: Record<OffReason, typeof Palmtree> = { holiday: Palmtree, day_off: CalendarOff, sick: Stethoscope, not_working: CalendarOff };
const STATUS_ICON: Partial<Record<Tone, typeof Check>> = { warning: TriangleAlert, waiting_parts: Package, completed: Check };
const ICON_COLOR: Partial<Record<Tone, string>> = { warning: 'text-over', waiting_parts: 'text-parts', completed: 'text-ok' };

type Hover = { job: CalendarJob; rect: DOMRect } | null;

export function Board({ view, days, lanes, jobs, today, selectedId, dim, onJob, onEmpty }: Props) {
    const t = useT();
    const locale = useLocale();
    const types = useVehicleLabels();
    const g = GEOMETRY[view];
    const offLabel: Record<OffReason, string> = {
        holiday: t('Holiday'),
        day_off: t('Day off'),
        sick: t('Sick leave'),
        not_working: t('Not working'),
    };

    // Hover card: one for the whole board, shown after a short pause so it does not flicker while the mouse travels.
    const [hover, setHover] = useState<Hover>(null);
    const timer = useRef<number | undefined>(undefined);
    const showCard = (job: CalendarJob, el: Element) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setHover({ job, rect: el.getBoundingClientRect() }), 140);
    };
    const hideCard = () => {
        window.clearTimeout(timer.current);
        setHover(null);
    };
    useEffect(() => {
        const off = () => hideCard();
        window.addEventListener('scroll', off, true);
        return () => {
            window.removeEventListener('scroll', off, true);
            window.clearTimeout(timer.current);
        };
    }, []);
    const hoverProps = (job: CalendarJob) => ({
        onMouseEnter: (e: MouseEvent<HTMLElement>) => showCard(job, e.currentTarget),
        onMouseLeave: hideCard,
        onFocus: (e: FocusEvent<HTMLElement>) => showCard(job, e.currentTarget),
        onBlur: hideCard,
    });

    const pos: Record<string, number> = {};
    let total = 0;
    for (const d of days) {
        pos[d.date] = total;
        total += unitsOf(d);
    }
    const headerRows = view === 'month' ? 2 : 1;

    // Week label cells (month view): chunks of 7 days.
    const weeks: { from: CalendarDay; to: CalendarDay; span: number; start: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        weeks.push({ from: chunk[0], to: chunk[chunk.length - 1], span: chunk.reduce((a, d) => a + unitsOf(d), 0), start: pos[chunk[0].date] });
    }

    // Who sits in each quarter: "laneId|date|quarter" → jobs.
    const occupancy = new Map<string, CalendarJob[]>();
    for (const j of jobs) {
        for (const [d, q] of j.cells) {
            const key = `${j.mechanic?.id}|${d}|${q}`;
            occupancy.set(key, [...(occupancy.get(key) ?? []), j]);
        }
    }

    // Week and day: each mechanic gets as many sub-rows as needed so overlapping jobs sit under each other.
    const placedLanes = lanes.map((lane) => {
        const mine = jobs
            .filter((j) => j.mechanic?.id === lane.id)
            .map((j) => ({
                job: j,
                units: j.cells
                    .map(([d, q]) => (pos[d] ?? -1) + q)
                    .filter((u) => u >= 0)
                    .sort((a, b) => a - b),
            }))
            .filter((x) => x.units.length > 0)
            .sort((a, b) => a.units[0] - b.units[0] || (a.job.status === 'waiting_parts' ? 1 : -1));
        if (view === 'month') return { lane, placed: [], rows: 1 };
        const occupied: Set<number>[] = [];
        const placed = mine.map((x) => {
            let sub = 0;
            while (occupied[sub] && x.units.some((u) => occupied[sub].has(u))) sub++;
            occupied[sub] = occupied[sub] ?? new Set();
            x.units.forEach((u) => occupied[sub].add(u));
            const runs: { start: number; len: number }[] = [];
            for (const u of x.units) {
                const last = runs[runs.length - 1];
                if (last && last.start + last.len === u) last.len++;
                else runs.push({ start: u, len: 1 });
            }
            return { ...x, sub, runs };
        });
        return { lane, placed, rows: Math.max(1, occupied.length) };
    });
    const laneRows = placedLanes.reduce((a, l) => a + l.rows, 0);

    let row = headerRows + 1;
    let barIndex = 0;

    return (
        <div className="overflow-x-auto">
            <div
                className="relative grid"
                style={{
                    gridTemplateColumns: `${g.name}px repeat(${total}, minmax(${g.unit}px, 1fr))`,
                    gridTemplateRows: `${g.header} repeat(${laneRows}, ${g.row}px)${g.free ? ' ' + g.free : ''}`,
                    minWidth: g.name + total * g.unit,
                }}
            >
                {/* corner */}
                <div
                    className="border-line bg-panel sticky left-0 z-20 flex items-end border-r border-b px-4 pb-2"
                    style={{ gridColumn: 1, gridRow: `1 / span ${headerRows}` }}
                >
                    <span className="text-muted-foreground text-[12.5px] font-medium">{t('Mechanics')}</span>
                </div>

                {/* month: week labels */}
                {view === 'month' &&
                    weeks.map((w) => (
                        <div
                            key={w.from.date}
                            className="border-line text-muted-foreground flex items-center gap-1.5 overflow-hidden border-r border-b px-2.5 text-[11.5px] whitespace-nowrap"
                            style={{ gridColumn: `${w.start + 2} / span ${w.span}`, gridRow: 1 }}
                        >
                            <b className="text-fg-2 font-semibold">{t('W:n', { n: w.from.week })}</b>
                            <span className="hidden xl:inline">
                                {formatShortDate(w.from.date, locale)} – {formatShortDate(w.to.date, locale)}
                            </span>
                        </div>
                    ))}

                {/* day headers (week, month) */}
                {view !== 'day' &&
                    days.map((d) => {
                        const isToday = d.date === today;
                        const closed = d.quarters === 0;
                        return (
                            <div
                                key={d.date}
                                title={closed ? (d.closure ?? t('Closed')) : formatDate(d.date, locale)}
                                className={cn(
                                    'border-line flex items-center justify-center gap-1.5 overflow-hidden border-r border-b whitespace-nowrap',
                                    closed ? 'hatch' : d.weekday === 6 ? 'bg-weekend' : 'bg-panel',
                                )}
                                style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: headerRows }}
                            >
                                {!closed && view === 'week' && (
                                    <span className={cn('text-[12.5px]', isToday ? 'text-p font-semibold' : 'text-muted-foreground')}>
                                        {weekdayShort(d.date, locale)}
                                    </span>
                                )}
                                {!closed && (
                                    <span
                                        className={cn(
                                            'grid place-items-center rounded-full font-semibold tabular-nums',
                                            view === 'week' ? 'size-7 text-[13.5px]' : 'size-[22px] text-[11.5px]',
                                            isToday ? 'bg-p text-white' : 'text-fg',
                                        )}
                                    >
                                        {Number(d.date.slice(8))}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                {/* day view: quarter headers */}
                {view === 'day' &&
                    days.flatMap((d) =>
                        d.quarters === 0
                            ? [
                                  <div
                                      key="closed"
                                      className="border-line hatch text-hold-ink grid place-items-center border-r border-b text-[12.5px] font-semibold"
                                      style={{ gridColumn: `2 / span ${total}`, gridRow: 1 }}
                                  >
                                      {d.closure ?? t('Closed')}
                                  </div>,
                              ]
                            : d.times.map((time, q) => (
                                  <div
                                      key={time}
                                      className="border-line bg-panel flex items-center gap-1.5 border-r border-b px-3 text-[12.5px]"
                                      style={{ gridColumn: pos[d.date] + q + 2, gridRow: 1 }}
                                  >
                                      <span className="text-fg font-semibold">{time}</span>
                                      <span className="text-faint">– {d.times[q + 1] ?? d.close}</span>
                                  </div>
                              )),
                    )}

                {/* lanes */}
                {placedLanes.map(({ lane, placed, rows: L }) => {
                    const r0 = row;
                    row += L;
                    const pct = lane.available ? Math.round((lane.booked / lane.available) * 100) : 0;

                    return (
                        <div key={lane.id} className="contents">
                            {/* mechanic */}
                            <div
                                title={`${lane.vehicleTypes.map(types).join(', ')}\n${t('Booked')}: ${formatDays(lane.booked, locale)} / ${formatDays(lane.available, locale)}`}
                                className="border-line bg-panel sticky left-0 z-10 flex items-center gap-2.5 border-r border-b px-3.5"
                                style={{ gridColumn: 1, gridRow: `${r0} / span ${L}` }}
                            >
                                <MechanicAvatar mechanic={lane} size={view === 'month' ? 'sm' : 'md'} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[13.5px] leading-5 font-semibold">{lane.name}</div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="bg-subtle h-1.5 flex-1 overflow-hidden rounded-full">
                                            <span
                                                className={cn(
                                                    'block h-full origin-left rounded-full transition-[width] duration-500 ease-out',
                                                    pct >= 100 ? 'bg-over' : pct >= 80 ? 'bg-parts' : 'bg-p',
                                                )}
                                                style={{ width: `${Math.min(100, pct)}%` }}
                                            />
                                        </span>
                                        <span className="text-muted-foreground w-8 text-right text-[11.5px] tabular-nums">{pct}%</span>
                                    </div>
                                </div>
                            </div>

                            {days.map((d, i) => {
                                const off = lane.off[d.date];
                                const closed = d.quarters === 0;
                                const isToday = d.date === today;
                                if (closed || off) {
                                    const prevOff = i > 0 ? lane.off[days[i - 1].date] : undefined;
                                    const Icon = off ? OFF_ICON[off] : null;
                                    return (
                                        <div
                                            key={d.date}
                                            title={closed ? (d.closure ?? t('Closed')) : offLabel[off!]}
                                            className="border-line hatch relative border-r border-b"
                                            style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: `${r0} / span ${L}` }}
                                        >
                                            {off && Icon && (off !== prevOff || i === 0) && (
                                                <span className="bg-panel/90 text-hold-ink border-line absolute top-1/2 left-1 z-[1] flex -translate-y-1/2 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
                                                    <Icon className="size-3.5" />
                                                    {view !== 'month' && offLabel[off]}
                                                </span>
                                            )}
                                        </div>
                                    );
                                }
                                return Array.from({ length: d.quarters }, (_, q) => {
                                    const key = `${lane.id}|${d.date}|${q}`;
                                    const here = occupancy.get(key) ?? [];
                                    const style: CSSProperties = { gridColumn: pos[d.date] + q + 2, gridRow: `${r0} / span ${L}` };
                                    const edge = q === d.quarters - 1 ? 'border-line border-r' : 'border-line/50 border-r border-dashed';
                                    const tint = isToday ? 'bg-p-soft/30' : d.weekday === 6 ? 'bg-weekend' : '';

                                    if (view === 'month') {
                                        return (
                                            <MonthCell
                                                key={key}
                                                jobs={here}
                                                style={style}
                                                className={cn('border-b', q === d.quarters - 1 && 'border-line border-r', tint)}
                                                first={q === 0}
                                                last={q === d.quarters - 1}
                                                hoverId={hover?.job.id ?? null}
                                                dim={dim}
                                                hoverProps={hoverProps}
                                                onJob={onJob}
                                                onEmpty={() => onEmpty(lane.id, d.date, q)}
                                                label={`${lane.name}, ${formatDate(d.date, locale)} ${d.times[q]}`}
                                            />
                                        );
                                    }
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => onEmpty(lane.id, d.date, q)}
                                            aria-label={`${t('New job')}: ${lane.name}, ${formatDate(d.date, locale)} ${d.times[q]}`}
                                            className={cn(
                                                'group/cell border-line relative border-b transition-colors duration-150',
                                                edge,
                                                tint,
                                                'hover:bg-p-soft/70',
                                            )}
                                            style={style}
                                        >
                                            <span className="text-p pointer-events-none absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100">
                                                <Plus className="size-3" strokeWidth={2.5} />
                                                {d.times[q]}
                                            </span>
                                        </button>
                                    );
                                });
                            })}

                            {/* job bars (week, day) */}
                            {placed.flatMap((p) =>
                                p.runs.map((run, i) => (
                                    <JobBar
                                        key={`${p.job.id}-${i}`}
                                        job={p.job}
                                        view={view}
                                        width={run.len}
                                        selected={selectedId === p.job.id}
                                        dimmed={dim(p.job)}
                                        onClick={() => onJob(p.job.id)}
                                        hoverProps={hoverProps(p.job)}
                                        style={{
                                            gridColumn: `${run.start + 2} / span ${run.len}`,
                                            gridRow: r0 + p.sub,
                                            animationDelay: `${Math.min(barIndex++ * 18, 360)}ms`,
                                        }}
                                    />
                                )),
                            )}
                        </div>
                    );
                })}

                {/* free time per day */}
                {view !== 'day' && (
                    <>
                        <div
                            className="text-muted-foreground border-line bg-panel sticky left-0 z-10 flex items-center border-r px-4 text-[12.5px] font-medium"
                            style={{ gridColumn: 1, gridRow: row }}
                        >
                            {t('Free time')}
                        </div>
                        {days.map((d) => {
                            const show = d.quarters > 0 && d.date >= today;
                            return (
                                <div
                                    key={d.date}
                                    title={show ? `${formatDate(d.date, locale)}: ${formatDays(d.free, locale)}` : undefined}
                                    className={cn(
                                        'border-line grid place-items-center border-r text-[12px] tabular-nums',
                                        d.quarters === 0 && 'hatch',
                                        show && d.free > 0 ? 'text-open-ink font-semibold' : 'text-faint',
                                    )}
                                    style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: row }}
                                >
                                    {show && (d.free > 0 ? formatDays(d.free, locale, view === 'week') : '–')}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {createPortal(
                <AnimatePresence>{hover && <JobCard key={hover.job.id} job={hover.job} rect={hover.rect} />}</AnimatePresence>,
                document.body,
            )}
        </div>
    );
}

type HoverHandlers = {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
    onFocus: (e: FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
};

/** One quarter in the month view: an empty cell books, a coloured one opens its job. */
function MonthCell({
    jobs,
    style,
    className,
    first,
    last,
    hoverId,
    dim,
    hoverProps,
    onJob,
    onEmpty,
    label,
}: {
    jobs: CalendarJob[];
    style: CSSProperties;
    className: string;
    first: boolean;
    last: boolean;
    hoverId: number | null;
    dim: (j: CalendarJob) => boolean;
    hoverProps: (j: CalendarJob) => HoverHandlers;
    onJob: (id: number) => void;
    onEmpty: () => void;
    label: string;
}) {
    const t = useT();
    // Waiting-for-parts jobs do not block time, so they only show when nothing else is there.
    const blocking = jobs.filter((j) => j.status !== 'waiting_parts');
    const job = blocking[0] ?? jobs[0];
    const tone: Tone | null = !job ? null : blocking.length > 1 ? 'warning' : toneOf(job);
    // A day reads as one bar of four segments: 1px between quarters, a wider gap between days.
    const pad = cn('flex items-center', first ? 'pl-[3px]' : 'pl-0', last ? 'pr-[3px]' : 'pr-px');
    const round = cn(first && 'rounded-l-[3px]', last && 'rounded-r-[3px]');

    if (!job || !tone) {
        return (
            <button
                type="button"
                onClick={onEmpty}
                aria-label={`${t('New job')}: ${label}`}
                title={label}
                className={cn(pad, className)}
                style={style}
            >
                <span className={cn('bg-subtle hover:bg-p-line h-3 w-full transition-colors duration-150', round)} />
            </button>
        );
    }
    const highlighted = hoverId === job.id;
    return (
        <button
            type="button"
            onClick={() => onJob(job.id)}
            aria-label={`#${job.number} ${job.vehicle?.make ?? ''}, ${label}`}
            className={cn(pad, className)}
            style={style}
            {...hoverProps(job)}
        >
            <span
                className={cn(
                    'cell-in h-3 w-full transition-[opacity,transform] duration-150',
                    round,
                    CELL[tone],
                    hoverId !== null && !highlighted && 'opacity-40',
                    highlighted && 'scale-y-[1.35]',
                    dim(job) && 'opacity-20',
                )}
            />
        </button>
    );
}

function JobBar({
    job,
    view,
    width,
    selected,
    dimmed,
    onClick,
    hoverProps,
    style,
}: {
    job: CalendarJob;
    view: View;
    width: number;
    selected: boolean;
    dimmed: boolean;
    onClick: () => void;
    hoverProps: HoverHandlers;
    style: CSSProperties;
}) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const tone = toneOf(job);
    const Icon = STATUS_ICON[tone];
    const surname = job.customer.name.split(' ').slice(-1)[0];
    const flags = (
        <>
            {job.notify && <Phone className="text-over size-3.5 shrink-0" strokeWidth={2.2} />}
            {Icon && <Icon className={cn('size-3.5 shrink-0', ICON_COLOR[tone])} strokeWidth={2.2} />}
        </>
    );

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`#${job.number} ${job.vehicle?.make ?? ''} ${job.customer.name}`}
            {...hoverProps}
            style={style}
            className={cn(
                'bar-in relative z-[2] m-1 flex min-w-0 overflow-hidden rounded-md border text-left shadow-[0_1px_2px_rgba(15,23,42,.06)]',
                'transition-[transform,box-shadow,opacity] duration-150 ease-out hover:z-[3] hover:-translate-y-px hover:shadow-[0_10px_20px_-12px_rgba(15,23,42,.45)] active:scale-[.98]',
                BAR[tone],
                selected && 'ring-p ring-offset-panel ring-2 ring-offset-1',
                dimmed && 'opacity-25',
            )}
        >
            <span className={cn('w-[3px] shrink-0', ACCENT[tone])} />
            {view === 'week' && width === 1 && (
                <span className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5">
                    <span className="text-[11px] font-semibold tabular-nums">{Number(job.number)}</span>
                    <span className="flex gap-0.5">{flags}</span>
                </span>
            )}
            {view === 'week' && width > 1 && (
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[12.5px] leading-4 font-semibold">{job.vehicle?.make ?? surname}</span>
                        <span className="ml-auto flex items-center gap-1">{flags}</span>
                    </span>
                    <span className="text-muted-foreground truncate text-[11.5px] leading-4">
                        #{job.number}
                        {width >= 3 && ` · ${surname}`}
                    </span>
                </span>
            )}
            {view === 'day' && (
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3">
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="text-muted-foreground text-[12px] font-semibold tabular-nums">#{job.number}</span>
                        <Plate value={job.vehicle?.plate} />
                        <span className="ml-auto flex items-center gap-1.5">{flags}</span>
                    </span>
                    <span className="truncate text-[14px] leading-5 font-semibold">
                        {job.vehicle?.make} · {job.customer.name}
                    </span>
                    <span className="text-muted-foreground truncate text-[12.5px]">{job.description}</span>
                    <span className="text-fg-2 flex items-center justify-between gap-2 text-[12px]">
                        <span className={cn(tone === 'warning' && 'text-over-ink font-medium')}>
                            {job.warning ? (job.warning === 'overlap' ? t('Overlap') : t('Mechanic off')) : status(job.status)}
                        </span>
                        <span className="tabular-nums">
                            {job.start.time} → {job.end.date !== job.start.date && `${weekdayShort(job.end.date, locale)} `}
                            {job.end.time}
                        </span>
                    </span>
                </span>
            )}
        </button>
    );
}

/** Floating details for the job under the mouse. Read-only; clicking the job opens the full inspector. */
function JobCard({ job, rect }: { job: CalendarJob; rect: DOMRect }) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const tone = toneOf(job);
    const W = 300;
    const left = Math.max(8, Math.min(window.innerWidth - W - 8, rect.left + rect.width / 2 - W / 2));
    const below = rect.bottom + 230 < window.innerHeight;
    const place: CSSProperties = below ? { top: rect.bottom + 8 } : { bottom: window.innerHeight - rect.top + 8 };

    return (
        <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: below ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="border-line bg-panel pointer-events-none fixed z-50 overflow-hidden rounded-lg border shadow-[0_16px_40px_-16px_rgba(15,23,42,.4)]"
            style={{ left, width: W, ...place }}
        >
            <div className={cn('h-1', ACCENT[tone])} />
            <div className="flex flex-col gap-1.5 p-3">
                <div className="text-muted-foreground flex items-center justify-between text-[12px]">
                    <span className="font-semibold tabular-nums">#{job.number}</span>
                    <span className={cn('font-medium', tone === 'warning' && 'text-over-ink')}>
                        {job.warning ? (job.warning === 'overlap' ? t('Overlap') : t('Mechanic off')) : status(job.status)}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold">{job.vehicle?.make ?? '—'}</span>
                    <Plate value={job.vehicle?.plate} />
                </div>
                <div className="text-fg-2 text-[13px]">
                    {job.customer.name}
                    {job.customer.phone && <span className="text-muted-foreground"> · {job.customer.phone}</span>}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-[12.5px]">{job.description}</p>
                <div className="border-line text-fg-2 mt-0.5 flex items-center justify-between gap-2 border-t pt-2 text-[12px] tabular-nums">
                    <span>
                        {formatShortDate(job.start.date, locale)} {job.start.time} →{' '}
                        {job.end.date !== job.start.date && `${formatShortDate(job.end.date, locale)} `}
                        {job.end.time}
                    </span>
                    <span className="font-medium">{formatDays(job.duration, locale)}</span>
                </div>
                {job.notify && (
                    <div className="text-over-ink flex items-center gap-1.5 text-[12px] font-medium">
                        <Phone className="size-3.5" /> {t('Customer to call')}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/** What the colours mean, drawn the way the current view draws them. */
export function BoardLegend({ view }: { view: View }) {
    const t = useT();
    const label: Record<Tone, string> = {
        scheduled: t('Scheduled'),
        in_progress: t('In progress'),
        waiting_parts: t('Waiting for parts'),
        completed: t('Completed'),
        warning: t('Overlap'),
    };
    return (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
            {TONE_ORDER.map((tone) => (
                <span key={tone} className="inline-flex items-center gap-1.5">
                    {view === 'month' ? (
                        <i className={cn('h-3 w-4 rounded-[3px]', CELL[tone])} />
                    ) : (
                        <i className={cn('flex h-3.5 w-6 overflow-hidden rounded-[3px] border', BAR[tone])}>
                            <i className={cn('w-[3px]', ACCENT[tone])} />
                        </i>
                    )}
                    {label[tone]}
                </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
                <i className="hatch border-line h-3.5 w-6 rounded-[3px] border" />
                {t('Off or closed')}
            </span>
        </div>
    );
}
