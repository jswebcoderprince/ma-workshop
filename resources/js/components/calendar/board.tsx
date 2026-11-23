import { useStatusLabel } from '@/components/job-table';
import { MechanicAvatar, Plate } from '@/components/ui-kit';
import { formatDate, formatDays, formatShortDate, weekdayShort } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useVehicleLabels } from '@/lib/vehicles';
import type { CalendarDay, CalendarJob, CalendarLane, OffReason } from '@/types';
import { router } from '@inertiajs/react';
import { ArrowRight, CalendarOff, Check, Package, Palmtree, Phone, Plus, Stethoscope, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type FocusEvent,
    type MouseEvent,
    type PointerEvent as ReactPointerEvent,
    type Ref,
} from 'react';
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
 * A job can be dragged to another time or mechanic (a long press starts the drag on touch screens).
 */
const GEOMETRY: Record<View, { unit: number; name: number; row: number; header: string; free: string }> = {
    month: { unit: 8, name: 176, row: 44, header: '26px 30px', free: '30px' },
    week: { unit: 40, name: 188, row: 58, header: '46px', free: '34px' },
    day: { unit: 170, name: 220, row: 104, header: '40px', free: '' },
};

/** Bars glide to a new place (after a drop, or when rows reshuffle) with this spring. */
const GLIDE = { type: 'spring', stiffness: 520, damping: 42 } as const;

/** Width of a day in quarter columns. Closed days stay visible but narrow. */
function unitsOf(d: CalendarDay) {
    return d.quarters > 0 ? d.quarters : d.weekday === 7 ? 1 : 2;
}

const OFF_ICON: Record<OffReason, typeof Palmtree> = { holiday: Palmtree, day_off: CalendarOff, sick: Stethoscope, not_working: CalendarOff };
const STATUS_ICON: Partial<Record<Tone, typeof Check>> = { warning: TriangleAlert, waiting_parts: Package, completed: Check };
const ICON_COLOR: Partial<Record<Tone, string>> = { warning: 'text-over', waiting_parts: 'text-parts', completed: 'text-ok' };

type Hover = { job: CalendarJob; rect: DOMRect } | null;
type Slot = { date: string; q: number; col: number };

/** A press on a job that may turn into a drag. */
type Grab = {
    job: CalendarJob;
    k: number; // quarters of the job before the grabbed one
    from: number | null; // slot index that was grabbed
    fromLane: number | null;
    pointer: number;
    x0: number;
    y0: number;
    touch: boolean;
    timer?: number;
};
type Drag = Omit<Grab, 'pointer' | 'x0' | 'y0' | 'touch' | 'timer'> & {
    lane: CalendarLane | null; // lane under the pointer
    at: number | null; // slot index under the pointer (null: closed, or not over the board)
    x: number;
    y: number;
};
type Plan = { cells: Slot[]; start: Slot | null; overlap: boolean; off: boolean; same: boolean };

/** The drag card sits below-right of the pointer, and flips to the other side near the window's edges. */
const CHIP_W = 236;
function chipAt(x: number, y: number) {
    const left = x + 16 + CHIP_W > window.innerWidth - 8 ? x - 16 - CHIP_W : x + 16;
    const top = y + 18 + 76 > window.innerHeight - 8 ? y - 18 - 76 : y + 18;
    return `${left}px ${top}px`;
}

/** After a drag, the click that follows the mouse release must not open a job or the new-job form. */
function swallowNextClick() {
    const stop = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
    };
    window.addEventListener('click', stop, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener('click', stop, true), 0);
}

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
    const gridRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    // Hover card: one for the whole board, shown after a short pause so it does not flicker while the mouse travels.
    const [hover, setHover] = useState<Hover>(null);
    const timer = useRef<number | undefined>(undefined);
    const grab = useRef<Grab | null>(null);
    const showCard = (job: CalendarJob, el: Element) => {
        window.clearTimeout(timer.current);
        if (grab.current) return;
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

    // A dropped job is drawn at its new place straight away; the server's answer replaces it.
    const [moved, setMoved] = useState<{ id: number; lane: CalendarLane; cells: [string, number][] } | null>(null);
    useEffect(() => setMoved(null), [jobs]);
    const landed = useRef(new Set<number>());
    const shown = moved ? jobs.map((j) => (j.id === moved.id ? { ...j, mechanic: moved.lane, cells: moved.cells, skip: 0 } : j)) : jobs;

    const pos: Record<string, number> = {};
    let total = 0;
    for (const d of days) {
        pos[d.date] = total;
        total += unitsOf(d);
    }
    const headerRows = view === 'month' ? 2 : 1;
    const headerPx = g.header.split(' ').reduce((a, s) => a + parseFloat(s), 0);
    const dayOf = new Map(days.map((d) => [d.date, d]));

    // The quarters of the range in order (closed days have none), and which one each grid column is.
    const seq: Slot[] = [];
    const colSlot: (number | null)[] = [];
    for (const d of days) {
        for (let u = 0; u < unitsOf(d); u++) {
            if (d.quarters > 0) {
                colSlot.push(seq.length);
                seq.push({ date: d.date, q: u, col: pos[d.date] + u });
            } else colSlot.push(null);
        }
    }
    const slotOf = new Map(seq.map((s, i) => [`${s.date}|${s.q}`, i]));

    // Week label cells (month view): chunks of 7 days.
    const weeks: { from: CalendarDay; to: CalendarDay; span: number; start: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        weeks.push({ from: chunk[0], to: chunk[chunk.length - 1], span: chunk.reduce((a, d) => a + unitsOf(d), 0), start: pos[chunk[0].date] });
    }

    // Who sits in each quarter: "laneId|date|quarter" → jobs.
    const occupancy = new Map<string, CalendarJob[]>();
    for (const j of shown) {
        for (const [d, q] of j.cells) {
            const key = `${j.mechanic?.id}|${d}|${q}`;
            occupancy.set(key, [...(occupancy.get(key) ?? []), j]);
        }
    }

    // Week and day: each mechanic gets as many sub-rows as needed so overlapping jobs sit under each other.
    let rowAcc = 0;
    const placedLanes = lanes.map((lane) => {
        const mine = shown
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
        const top = rowAcc;
        if (view === 'month') {
            rowAcc += 1;
            return { lane, placed: [], rows: 1, top };
        }
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
        const rows = Math.max(1, occupied.length);
        rowAcc += rows;
        return { lane, placed, rows, top };
    });
    const laneRows = rowAcc;

    // ---------- drag and drop ----------
    const [drag, setDrag] = useState<Drag | null>(null);
    const dragRef = useRef<Drag | null>(null);
    const chipRef = useRef<HTMLDivElement>(null);

    /** Which mechanic and quarter are under a screen point. Works from the grid's geometry, so bars on top do not get in the way. */
    const targetAt = (x: number, y: number): { lane: CalendarLane | null; at: number | null } => {
        const grid = gridRef.current;
        const box = boxRef.current;
        if (!grid || !box) return { lane: null, at: null };
        const r = grid.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (x < b.left + g.name || x >= b.right) return { lane: null, at: null }; // over the names, or outside
        const col = Math.floor(((x - r.left - g.name) / (r.width - g.name)) * total);
        const row = Math.floor((y - r.top - headerPx) / g.row);
        const hit = placedLanes.find((l) => row >= l.top && row < l.top + l.rows);
        return { lane: hit?.lane ?? null, at: hit && col >= 0 && col < total ? colSlot[col] : null };
    };

    /** Where the job would land, and what the owner should know before letting go. */
    const planOf = (d: Drag): Plan | null => {
        if (!d.lane || d.at === null) return null;
        const first = d.at - d.k;
        const cells: Slot[] = [];
        for (let i = Math.max(0, first); i < Math.min(seq.length, first + d.job.duration); i++) cells.push(seq[i]);
        const warns = d.job.status !== 'waiting_parts' && d.job.status !== 'completed';
        const lane = d.lane;
        return {
            cells,
            start: first >= 0 ? seq[first] : null,
            overlap:
                warns &&
                cells.some((c) =>
                    (occupancy.get(`${lane.id}|${c.date}|${c.q}`) ?? []).some((o) => o.id !== d.job.id && o.status !== 'waiting_parts'),
                ),
            off: cells.some((c) => lane.off[c.date]),
            same: lane.id === d.fromLane && d.at === d.from,
        };
    };

    const drop = (d: Drag) => {
        const plan = planOf(d);
        if (!plan || plan.same || !d.lane || d.at === null) return;
        const at = seq[d.at];
        landed.current.add(d.job.id);
        setMoved({ id: d.job.id, lane: d.lane, cells: plan.cells.map((c) => [c.date, c.q]) });
        router.post(
            route('jobs.move', d.job.id),
            { mechanic_id: d.lane.id, date: at.date, quarter: at.q, offset: d.k },
            { preserveScroll: true, preserveState: true, onError: () => setMoved(null) },
        );
    };

    // Window listeners are set once; they reach the current render through this ref.
    const live = useRef({ targetAt, drop, hideCard });
    live.current = { targetAt, drop, hideCard };

    const begin = (gr: Grab, x: number, y: number) => {
        live.current.hideCard();
        const d: Drag = { job: gr.job, k: gr.k, from: gr.from, fromLane: gr.fromLane, ...live.current.targetAt(x, y), x, y };
        dragRef.current = d;
        setDrag(d);
        document.body.classList.add('board-dragging');
        if (gr.touch) navigator.vibrate?.(10);
    };

    const follow = (x: number, y: number) => {
        const d = dragRef.current;
        if (!d) return;
        if (chipRef.current) chipRef.current.style.translate = chipAt(x, y);
        const target = live.current.targetAt(x, y);
        const next = { ...d, ...target, x, y };
        dragRef.current = next;
        if (target.lane?.id !== d.lane?.id || target.at !== d.at) setDrag(next);
    };

    const end = () => {
        window.clearTimeout(grab.current?.timer);
        grab.current = null;
        const d = dragRef.current;
        dragRef.current = null;
        document.body.classList.remove('board-dragging');
        if (d) {
            setDrag(null);
            swallowNextClick();
        }
        return d;
    };

    const onGrab = (job: CalendarJob, e: ReactPointerEvent<HTMLElement>) => {
        if (e.button !== 0 || !e.isPrimary || grab.current) return;
        const { at } = targetAt(e.clientX, e.clientY);
        const inJob = at === null ? -1 : job.cells.findIndex(([d, q]) => slotOf.get(`${d}|${q}`) === at);
        const gr: Grab = {
            job,
            k: job.skip + Math.max(0, inJob),
            from: at,
            fromLane: job.mechanic?.id ?? null,
            pointer: e.pointerId,
            x0: e.clientX,
            y0: e.clientY,
            touch: e.pointerType === 'touch',
        };
        // Touch: a long press picks the job up, so a normal swipe still scrolls the board.
        if (gr.touch) gr.timer = window.setTimeout(() => begin(gr, gr.x0, gr.y0), 320);
        grab.current = gr;
    };

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            const gr = grab.current;
            if (!gr || e.pointerId !== gr.pointer) return;
            if (!dragRef.current) {
                const dist = Math.hypot(e.clientX - gr.x0, e.clientY - gr.y0);
                if (gr.touch) {
                    if (dist > 8) end();
                    return;
                }
                if (dist < 5) return;
                begin(gr, e.clientX, e.clientY);
            }
            follow(e.clientX, e.clientY);
        };
        const onUp = (e: PointerEvent) => {
            if (!grab.current || e.pointerId !== grab.current.pointer) return;
            const d = end();
            if (d) live.current.drop(d);
        };
        const onCancel = (e: PointerEvent) => {
            if (grab.current && e.pointerId === grab.current.pointer) end();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || !dragRef.current) return;
            e.stopPropagation();
            end();
        };
        const onTouchMove = (e: TouchEvent) => {
            if (dragRef.current) e.preventDefault();
        };
        const onMenu = (e: Event) => {
            if (grab.current?.touch) e.preventDefault();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('contextmenu', onMenu);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('contextmenu', onMenu);
            window.clearTimeout(grab.current?.timer);
            document.body.classList.remove('board-dragging');
        };
    }, []);

    // Near the board's edge (or the window's), the board scrolls by itself while a job is held.
    const dragging = drag !== null;
    useEffect(() => {
        if (!dragging) return;
        let raf = 0;
        const tick = () => {
            const d = dragRef.current;
            const box = boxRef.current;
            if (d && box) {
                const b = box.getBoundingClientRect();
                const edge = 56;
                let dx = 0;
                if (d.x > b.right - edge) dx = Math.min(1, (d.x - b.right + edge) / edge) * 14;
                else if (d.x < b.left + g.name + edge && box.scrollLeft > 0) dx = -Math.min(1, (b.left + g.name + edge - d.x) / edge) * 14;
                const dy = d.y > window.innerHeight - 40 ? 10 : d.y < 40 ? -10 : 0;
                if (dx) box.scrollLeft += dx;
                if (dy) window.scrollBy(0, dy);
                if (dx || dy) follow(d.x, d.y);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [dragging, g.name]);

    const plan = drag ? planOf(drag) : null;
    const ghostLane = drag?.lane ? placedLanes.find((l) => l.lane.id === drag.lane!.id) : undefined;
    const ghostRuns: { start: number; len: number }[] = [];
    if (plan && !plan.same) {
        for (const c of plan.cells) {
            const last = ghostRuns[ghostRuns.length - 1];
            if (last && last.start + last.len === c.col) last.len++;
            else ghostRuns.push({ start: c.col, len: 1 });
        }
    }
    const ghostWarn = !!plan && (plan.overlap || plan.off);

    let barIndex = 0;

    return (
        <motion.div ref={boxRef} layoutScroll className="overflow-x-auto">
            <div
                ref={gridRef}
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
                {placedLanes.map(({ lane, placed, rows: L, top }) => {
                    const r0 = headerRows + 1 + top;
                    const pct = lane.available ? Math.round((lane.booked / lane.available) * 100) : 0;

                    return (
                        <div key={lane.id} className="contents">
                            {/* mechanic */}
                            <div
                                title={`${lane.vehicleTypes.map(types).join(', ')}\n${t('Booked')}: ${formatDays(lane.booked, locale)} / ${formatDays(lane.available, locale)}`}
                                className={cn(
                                    'border-line sticky left-0 z-10 flex items-center gap-2.5 border-r border-b px-3.5 transition-colors duration-150',
                                    drag?.lane?.id === lane.id ? 'bg-p-soft' : 'bg-panel',
                                )}
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
                                                hoverId={drag ? null : (hover?.job.id ?? null)}
                                                draggedId={drag?.job.id ?? null}
                                                dim={dim}
                                                hoverProps={hoverProps}
                                                onGrab={onGrab}
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
                                                !drag && 'hover:bg-p-soft/70',
                                            )}
                                            style={style}
                                        >
                                            {!drag && (
                                                <span className="text-p pointer-events-none absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-0.5 text-[11px] font-semibold opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100">
                                                    <Plus className="size-3" strokeWidth={2.5} />
                                                    {d.times[q]}
                                                </span>
                                            )}
                                        </button>
                                    );
                                });
                            })}

                            {/* job bars (week, day) */}
                            {placed.flatMap((p) =>
                                p.runs.map((run, i) => (
                                    <JobBar
                                        key={`${p.job.id}-${i}`}
                                        layoutId={`bar-${p.job.id}-${i}`}
                                        job={p.job}
                                        view={view}
                                        width={run.len}
                                        selected={selectedId === p.job.id}
                                        dimmed={dim(p.job)}
                                        lifted={drag?.job.id === p.job.id}
                                        quiet={!!drag}
                                        enter={!landed.current.has(p.job.id)}
                                        onClick={() => onJob(p.job.id)}
                                        onGrab={(e) => onGrab(p.job, e)}
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

                {/* where a dragged job would land: it glides from quarter to quarter under the mouse */}
                {ghostLane &&
                    ghostRuns.map((run, i) => (
                        <motion.div
                            key={i}
                            layout
                            transition={{ layout: { type: 'spring', stiffness: 700, damping: 48 } }}
                            className={cn(
                                'pointer-events-none z-[4] flex items-center overflow-hidden',
                                view === 'month'
                                    ? cn('mx-px h-5 self-center rounded-[5px] ring-2', ghostWarn ? 'bg-over/15 ring-over' : 'bg-p/15 ring-p')
                                    : cn(
                                          'm-1 rounded-md border-2 border-dashed',
                                          ghostWarn ? 'border-over bg-over-bg/80 text-over-ink' : 'border-p bg-p-soft/80 text-p-ink',
                                      ),
                            )}
                            style={{
                                gridColumn: `${run.start + 2} / span ${run.len}`,
                                gridRow: `${headerRows + 1 + ghostLane.top} / span ${ghostLane.rows}`,
                            }}
                        >
                            {view !== 'month' && i === 0 && plan?.start && (
                                <span className="px-1.5 text-[11.5px] font-semibold tabular-nums">
                                    {dayOf.get(plan.start.date)?.times[plan.start.q]}
                                </span>
                            )}
                        </motion.div>
                    ))}

                {/* free time per day */}
                {view !== 'day' && (
                    <>
                        <div
                            className="text-muted-foreground border-line bg-panel sticky left-0 z-10 flex items-center border-r px-4 text-[12.5px] font-medium"
                            style={{ gridColumn: 1, gridRow: headerRows + 1 + laneRows }}
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
                                    style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: headerRows + 1 + laneRows }}
                                >
                                    {show && (d.free > 0 ? formatDays(d.free, locale, view === 'week') : '–')}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {createPortal(
                <>
                    <AnimatePresence>{hover && !drag && <JobCard key={hover.job.id} job={hover.job} rect={hover.rect} />}</AnimatePresence>
                    <AnimatePresence>{drag && <DragChip key="chip" chipRef={chipRef} drag={drag} plan={plan} dayOf={dayOf} />}</AnimatePresence>
                </>,
                document.body,
            )}
        </motion.div>
    );
}

type HoverHandlers = {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
    onFocus: (e: FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
};

/** One quarter in the month view: an empty cell books, a coloured one opens its job (or is dragged). */
function MonthCell({
    jobs,
    style,
    className,
    first,
    last,
    hoverId,
    draggedId,
    dim,
    hoverProps,
    onGrab,
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
    draggedId: number | null;
    dim: (j: CalendarJob) => boolean;
    hoverProps: (j: CalendarJob) => HoverHandlers;
    onGrab: (j: CalendarJob, e: ReactPointerEvent<HTMLElement>) => void;
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
                <span className={cn('bg-subtle h-3 w-full transition-colors duration-150', draggedId === null && 'hover:bg-p-line', round)} />
            </button>
        );
    }
    const highlighted = hoverId === job.id;
    return (
        <button
            type="button"
            onClick={() => onJob(job.id)}
            onPointerDown={(e) => onGrab(job, e)}
            aria-label={`#${job.number} ${job.vehicle?.make ?? ''}, ${label}`}
            className={cn(pad, 'cursor-grab touch-manipulation select-none', className)}
            style={style}
            {...hoverProps(job)}
        >
            <span
                className={cn(
                    'cell-in h-3 w-full transition-[opacity,transform] duration-150',
                    round,
                    CELL[tone],
                    hoverId !== null && !highlighted && 'opacity-40',
                    highlighted && draggedId === null && 'scale-y-[1.35]',
                    draggedId === job.id && 'opacity-30',
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
    lifted,
    quiet,
    enter,
    layoutId,
    onClick,
    onGrab,
    hoverProps,
    style,
}: {
    job: CalendarJob;
    view: View;
    width: number;
    selected: boolean;
    dimmed: boolean;
    /** This job is being dragged: its old place stays as a faint outline. */
    lifted: boolean;
    /** Another job is being dragged: no hover lift. */
    quiet: boolean;
    /** Rise in when the board appears (not after a drop: the bar glides there instead). */
    enter: boolean;
    layoutId: string;
    onClick: () => void;
    onGrab: (e: ReactPointerEvent<HTMLElement>) => void;
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
        <motion.button
            type="button"
            layoutId={layoutId}
            layout="position"
            // motion owns this element's opacity (layoutId sets it inline), so fading goes through motion too.
            initial={false}
            animate={{ opacity: lifted ? 0.35 : dimmed ? 0.25 : 1 }}
            transition={{ layout: GLIDE, opacity: { duration: 0.15 } }}
            onClick={onClick}
            onPointerDown={onGrab}
            aria-label={`#${job.number} ${job.vehicle?.make ?? ''} ${job.customer.name}`}
            {...hoverProps}
            style={style}
            className={cn(
                'relative z-[2] m-1 flex min-w-0 cursor-grab touch-manipulation overflow-hidden rounded-md border text-left shadow-[0_1px_2px_rgba(15,23,42,.06)] select-none [-webkit-touch-callout:none]',
                'transition-[translate,scale,box-shadow] duration-150 ease-out',
                !quiet && 'hover:z-[3] hover:-translate-y-px hover:shadow-[0_10px_20px_-12px_rgba(15,23,42,.45)] active:scale-[.98]',
                enter && 'bar-in',
                BAR[tone],
                selected && 'ring-p ring-offset-panel ring-2 ring-offset-1',
                lifted && 'shadow-none',
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
        </motion.button>
    );
}

/** The card that follows the mouse while a job is dragged: which job, and where it would land. */
function DragChip({ chipRef, drag, plan, dayOf }: { chipRef: Ref<HTMLDivElement>; drag: Drag; plan: Plan | null; dayOf: Map<string, CalendarDay> }) {
    const t = useT();
    const locale = useLocale();
    const tone = toneOf(drag.job);
    const start = plan?.start;
    const where = start
        ? `${weekdayShort(start.date, locale)} ${formatShortDate(start.date, locale)} · ${dayOf.get(start.date)?.times[start.q] ?? ''}`
        : null;

    return (
        <div ref={chipRef} className="pointer-events-none fixed top-0 left-0 z-[70]" style={{ translate: chipAt(drag.x, drag.y) }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                className="border-line bg-panel flex w-[236px] overflow-hidden rounded-lg border shadow-[0_18px_40px_-14px_rgba(15,23,42,.5)]"
            >
                <span className={cn('w-1 shrink-0', ACCENT[tone])} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2.5 py-2">
                    <span className="flex items-center gap-1.5 text-[12.5px]">
                        <b className="font-semibold tabular-nums">#{drag.job.number}</b>
                        <span className="truncate">{drag.job.vehicle?.make ?? drag.job.customer.name}</span>
                        <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">{formatDays(drag.job.duration, locale)}</span>
                    </span>
                    {!drag.lane ? (
                        <span className="text-muted-foreground text-[12px]">{t('Release to cancel')}</span>
                    ) : drag.at === null ? (
                        <span className="text-over-ink text-[12px] font-medium">{t('Closed')}</span>
                    ) : plan?.same ? (
                        <span className="text-muted-foreground text-[12px]">{t('Release to cancel')}</span>
                    ) : (
                        <>
                            <span className="text-fg-2 flex min-w-0 items-center gap-1 text-[12px]">
                                <ArrowRight className="text-p size-3.5 shrink-0" strokeWidth={2.2} />
                                <span className="truncate tabular-nums">
                                    {where ?? '…'} · {drag.lane.name}
                                </span>
                            </span>
                            {(plan?.overlap || plan?.off) && (
                                <span className="text-over-ink flex items-center gap-1 text-[11.5px] font-medium">
                                    <TriangleAlert className="size-3.5" />
                                    {plan.overlap ? t('Overlap') : t('Mechanic off')}
                                </span>
                            )}
                        </>
                    )}
                </span>
            </motion.div>
        </div>
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
                <div className="text-faint text-[11.5px]">{t('Drag to move')}</div>
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
