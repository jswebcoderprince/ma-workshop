import { useStatusLabel } from '@/components/job-table';
import { DurationChip, MechanicAvatar, Plate } from '@/components/ui-kit';
import { daysLabel } from '@/lib/calendar';
import { formatShortDate, weekdayShort } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useVehicleLabels } from '@/lib/vehicles';
import type { CalendarDay, CalendarJob, CalendarLane, OffReason } from '@/types';
import { CalendarOff, Check, Package, Palmtree, Phone, Stethoscope, TriangleAlert } from 'lucide-react';
import type { MouseEvent } from 'react';

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

const GEOMETRY: Record<View, { unit: number; name: number; row: number }> = {
    month: { unit: 8, name: 190, row: 40 },
    week: { unit: 40, name: 232, row: 68 },
    day: { unit: 170, name: 232, row: 118 },
};

/** Width of a day in quarter columns. Closed days stay visible but narrow. */
function unitsOf(d: CalendarDay) {
    return d.quarters > 0 ? d.quarters : d.weekday === 7 ? 1 : 2;
}

const OFF_ICON: Record<OffReason, typeof Palmtree> = { holiday: Palmtree, day_off: CalendarOff, sick: Stethoscope, not_working: CalendarOff };

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

    const pos: Record<string, number> = {};
    let total = 0;
    for (const d of days) {
        pos[d.date] = total;
        total += unitsOf(d);
    }
    const headerRows = view === 'week' ? 3 : 2;
    const maxFree = Math.max(1, ...days.map((d) => d.free));

    // Week label cells: chunks of 7 days.
    const weeks: { from: CalendarDay; to: CalendarDay; span: number; start: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        weeks.push({ from: chunk[0], to: chunk[chunk.length - 1], span: chunk.reduce((a, d) => a + unitsOf(d), 0), start: pos[chunk[0].date] });
    }

    const clickDay = (e: MouseEvent<HTMLDivElement>, lane: CalendarLane, d: CalendarDay) => {
        if (d.quarters === 0 || lane.off[d.date]) return;
        const r = e.currentTarget.getBoundingClientRect();
        const q = Math.min(d.quarters - 1, Math.floor(((e.clientX - r.left) / r.width) * d.quarters));
        onEmpty(lane.id, d.date, q);
    };

    // Each mechanic gets as many sub-rows as needed so overlapping jobs sit under each other (greedy).
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
        return { lane, count: mine.length, placed, rows: Math.max(1, occupied.length) };
    });
    const laneRows = placedLanes.reduce((a, l) => a + l.rows, 0);
    const header = view === 'week' ? '30px 38px 22px' : view === 'day' ? '30px 40px' : '30px 34px';

    let row = headerRows + 1;

    return (
        <div className="overflow-x-auto">
            <div
                className="relative grid"
                style={{
                    gridTemplateColumns: `${g.name}px repeat(${total}, minmax(${g.unit}px, 1fr))`,
                    gridTemplateRows: `${header} repeat(${laneRows}, ${g.row}px)${view === 'day' ? '' : ' 46px'}`,
                    minWidth: g.name + total * g.unit,
                }}
            >
                {/* corner */}
                <div
                    className="border-line bg-subtle sticky left-0 z-20 flex items-end justify-between border-r border-b px-4 pb-2"
                    style={{ gridColumn: 1, gridRow: `1 / span ${headerRows}` }}
                >
                    <span className="text-fg-2 text-[12.5px] font-semibold">{t('Mechanic')}</span>
                    <span className="border-line bg-panel text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold">
                        {lanes.length}
                    </span>
                </div>

                {/* row 1: weeks (or the day) */}
                {view === 'day'
                    ? days.map((d) => (
                          <div
                              key={d.date}
                              className="border-line bg-subtle flex items-center gap-2 border-r border-b px-3 text-[12px]"
                              style={{ gridColumn: `2 / span ${total}`, gridRow: 1 }}
                          >
                              <b className="text-fg font-semibold">{formatShortDate(d.date, locale)}</b>
                              <span className="text-muted-foreground font-mono">
                                  {t('W')}
                                  {d.week}
                              </span>
                              {d.closure && <span className="text-hold-ink">· {d.closure}</span>}
                          </div>
                      ))
                    : weeks.map((w) => (
                          <div
                              key={w.from.date}
                              className="border-line bg-subtle text-muted-foreground flex items-center gap-2 overflow-hidden border-r border-b px-3 text-[11.5px] whitespace-nowrap"
                              style={{ gridColumn: `${w.start + 2} / span ${w.span}`, gridRow: 1 }}
                          >
                              <b className="text-fg-2 font-mono font-semibold">
                                  {t('W')}
                                  {w.from.week}
                              </b>
                              {formatShortDate(w.from.date, locale)} – {formatShortDate(w.to.date, locale)}
                          </div>
                      ))}

                {/* row 2: days, or quarter columns in the day view */}
                {view === 'day'
                    ? days.flatMap((d) =>
                          d.quarters === 0
                              ? [
                                    <div
                                        key="closed"
                                        className="border-line hatch text-hold-ink grid place-items-center border-r border-b text-[12px] font-semibold"
                                        style={{ gridColumn: `2 / span ${total}`, gridRow: 2 }}
                                    >
                                        {t('Closed')}
                                    </div>,
                                ]
                              : d.times.map((time, q) => (
                                    <div
                                        key={time}
                                        className="border-line bg-panel flex items-center justify-between border-r border-b px-3"
                                        style={{ gridColumn: pos[d.date] + q + 2, gridRow: 2 }}
                                    >
                                        <span className="text-fg font-mono text-[12.5px] font-bold">{time}</span>
                                        <span className="text-faint font-mono text-[10.5px]">{d.times[q + 1] ?? d.close}</span>
                                    </div>
                                )),
                      )
                    : days.map((d) => {
                          const isToday = d.date === today;
                          return (
                              <div
                                  key={d.date}
                                  title={d.closure ?? undefined}
                                  className={cn(
                                      'border-line flex items-center justify-center gap-1 overflow-hidden border-r border-b text-[11.5px] whitespace-nowrap',
                                      d.quarters === 0
                                          ? 'hatch text-hold-ink'
                                          : d.weekday === 6
                                            ? 'bg-weekend text-muted-foreground'
                                            : 'bg-panel text-muted-foreground',
                                      isToday && 'bg-p-soft',
                                  )}
                                  style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: 2 }}
                              >
                                  {d.weekday !== 7 && (
                                      <>
                                          {view === 'week' && (
                                              <span className={cn(isToday && 'text-p font-semibold')}>{weekdayShort(d.date, locale)}</span>
                                          )}
                                          <b
                                              className={cn(
                                                  'text-fg font-mono font-bold',
                                                  view === 'month' && d.quarters === 0 ? 'text-hold-ink text-[9.5px]' : 'text-[12.5px]',
                                                  isToday && 'bg-p rounded px-1.5 text-white',
                                              )}
                                          >
                                              {Number(d.date.slice(8))}
                                          </b>
                                      </>
                                  )}
                              </div>
                          );
                      })}

                {/* row 3 (week): quarter start times */}
                {view === 'week' &&
                    days.flatMap((d) =>
                        d.quarters === 0
                            ? [
                                  <div
                                      key={d.date + 'x'}
                                      className="border-line hatch border-r border-b"
                                      style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: 3 }}
                                  />,
                              ]
                            : d.times.map((time, q) => (
                                  <div
                                      key={d.date + time}
                                      className={cn(
                                          'border-line text-faint grid place-items-center border-b font-mono text-[9.5px]',
                                          q === d.quarters - 1 ? 'border-r' : 'border-line/60 border-r border-dashed',
                                      )}
                                      style={{ gridColumn: pos[d.date] + q + 2, gridRow: 3 }}
                                  >
                                      {time}
                                  </div>
                              )),
                    )}

                {/* lanes */}
                {placedLanes.map(({ lane, count, placed, rows: L }) => {
                    const r0 = row;
                    row += L;
                    const pct = lane.available ? Math.round((lane.booked / lane.available) * 100) : 0;
                    const load = (
                        <span
                            title={t('Booked')}
                            className={cn(
                                'font-mono text-[11px] font-bold',
                                pct >= 100 ? 'text-over-ink' : pct >= 75 ? 'text-parts-ink' : 'text-fg-2',
                            )}
                        >
                            {daysLabel(lane.booked)} / {daysLabel(lane.available)} ({pct}%)
                        </span>
                    );
                    const jobsChip = (
                        <span className="bg-subtle text-fg-2 rounded px-1.5 py-0.5 text-[10.5px] font-semibold whitespace-nowrap">
                            {t('Jobs: :n', { n: count })}
                        </span>
                    );

                    return (
                        <div key={lane.id} className="contents">
                            {/* mechanic profile cell */}
                            <div
                                title={lane.vehicleTypes.map(types).join(', ')}
                                className="border-line bg-panel sticky left-0 z-10 flex flex-col justify-center gap-1.5 border-r border-b px-4 py-2"
                                style={{ gridColumn: 1, gridRow: `${r0} / span ${L}` }}
                            >
                                <div className="flex items-center gap-2.5">
                                    <MechanicAvatar mechanic={lane} size={view === 'month' ? 'sm' : 'md'} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-[13px] font-bold">{lane.name}</span>
                                            {view === 'week' && jobsChip}
                                        </div>
                                        {view === 'week' && <div className="mt-0.5">{load}</div>}
                                        {view === 'day' && (
                                            <div className="text-muted-foreground truncate text-[11.5px]">
                                                {lane.vehicleTypes.map(types).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {view === 'day' && (
                                    <div className="border-line flex items-center justify-between border-t pt-1.5">
                                        {jobsChip}
                                        {load}
                                    </div>
                                )}
                            </div>

                            {/* day background cells */}
                            {days.map((d, i) => {
                                const off = lane.off[d.date];
                                const closed = d.quarters === 0;
                                const prevOff = i > 0 ? lane.off[days[i - 1].date] : undefined;
                                const Icon = off ? OFF_ICON[off] : null;
                                return (
                                    <div
                                        key={d.date}
                                        onClick={(e) => clickDay(e, lane, d)}
                                        title={closed ? (d.closure ?? t('Closed')) : off ? offLabel[off] : t('Click to book here')}
                                        className={cn(
                                            'border-line relative border-r border-b',
                                            closed || off ? 'hatch cursor-not-allowed' : 'hover:bg-p-soft/40 cursor-cell',
                                            !closed && !off && d.weekday === 6 && 'bg-weekend',
                                            d.date === today && !closed && !off && 'bg-p-soft/30',
                                        )}
                                        style={{
                                            gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`,
                                            gridRow: `${r0} / span ${L}`,
                                            backgroundImage:
                                                !closed && !off && d.quarters > 1
                                                    ? `repeating-linear-gradient(to right, transparent 0, transparent calc(100% / ${d.quarters} - 1px), var(--line) calc(100% / ${d.quarters} - 1px), var(--line) calc(100% / ${d.quarters}))`
                                                    : undefined,
                                        }}
                                    >
                                        {off && Icon && (off !== prevOff || i === 0) && (
                                            <span className="border-line bg-panel text-hold-ink absolute top-1/2 left-1.5 z-[1] flex -translate-y-1/2 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-sm">
                                                <Icon className="size-3.5" />
                                                {view !== 'month' && offLabel[off]}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* job blocks */}
                            {placed.flatMap((p) =>
                                p.runs.map((run, i) => (
                                    <JobBlock
                                        key={`${p.job.id}-${i}`}
                                        job={p.job}
                                        view={view}
                                        width={run.len}
                                        selected={selectedId === p.job.id}
                                        dimmed={dim(p.job)}
                                        onClick={() => onJob(p.job.id)}
                                        style={{ gridColumn: `${run.start + 2} / span ${run.len}`, gridRow: r0 + p.sub }}
                                    />
                                )),
                            )}
                        </div>
                    );
                })}

                {/* free capacity per day */}
                {view !== 'day' && (
                    <>
                        <div
                            className="bg-subtle text-fg-2 border-line sticky left-0 z-10 flex items-center border-r px-4 text-[12.5px] font-semibold"
                            style={{ gridColumn: 1, gridRow: row }}
                        >
                            {t('Free time')}
                        </div>
                        {days.map((d) => {
                            const show = d.quarters > 0 && d.date >= today;
                            const h = Math.max(3, Math.round((d.free / maxFree) * 20));
                            return (
                                <div
                                    key={d.date}
                                    title={show ? `${formatShortDate(d.date, locale)}: ${daysLabel(d.free)}` : undefined}
                                    className="bg-subtle border-line flex flex-col items-center justify-end gap-0.5 overflow-hidden border-r px-0.5 pt-1 pb-1.5"
                                    style={{ gridColumn: `${pos[d.date] + 2} / span ${unitsOf(d)}`, gridRow: row }}
                                >
                                    {show && (
                                        <>
                                            {(view === 'week' || unitsOf(d) >= 4) && (
                                                <span
                                                    className={cn(
                                                        'font-mono font-bold tracking-[-0.03em]',
                                                        view === 'month' ? 'text-[9px]' : 'text-[10px]',
                                                        d.free ? 'text-open-ink' : 'text-over-ink',
                                                    )}
                                                >
                                                    {/* month columns are narrow: "1.25" without the unit */}
                                                    {view === 'month' ? daysLabel(d.free).slice(0, -1) : daysLabel(d.free)}
                                                </span>
                                            )}
                                            <i
                                                className={cn('block w-[60%] max-w-[26px] rounded-t', d.free ? 'bg-open/60' : 'bg-over/60')}
                                                style={{ height: h }}
                                            />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

function JobBlock({
    job,
    view,
    width,
    selected,
    dimmed,
    onClick,
    style,
}: {
    job: CalendarJob;
    view: View;
    width: number;
    selected: boolean;
    dimmed: boolean;
    onClick: () => void;
    style: React.CSSProperties;
}) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const surname = job.customer.name.split(' ').slice(-1)[0];
    const strip =
        job.warning !== null
            ? 'bg-parts'
            : job.status === 'completed'
              ? 'bg-ok'
              : job.status === 'waiting_parts'
                ? 'bg-hold'
                : job.status === 'in_progress'
                  ? 'bg-p'
                  : 'bg-p/70';
    const box =
        job.warning !== null
            ? 'border-parts-line bg-parts-bg/60'
            : job.status === 'completed'
              ? 'border-line bg-subtle text-muted-foreground'
              : job.status === 'waiting_parts'
                ? 'border-hold-line bg-hold-bg border-dashed'
                : job.status === 'in_progress'
                  ? 'border-p-line bg-p-soft/60'
                  : 'border-line bg-panel';
    const Icon = job.warning ? TriangleAlert : job.status === 'waiting_parts' ? Package : job.status === 'completed' ? Check : null;
    const tip = `#${job.number} · ${job.customer.name} — ${job.vehicle?.make ?? ''}\n${job.description}\n${job.start.date} ${job.start.time} → ${job.end.date} ${job.end.time}`;

    return (
        <button
            type="button"
            onClick={onClick}
            title={tip}
            style={style}
            className={cn(
                'relative z-[2] m-[3px] flex min-w-0 flex-col justify-center overflow-hidden rounded-md border text-left shadow-[0_1px_3px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_6px_12px_-2px_rgba(15,23,42,.12)]',
                view === 'month' ? 'px-1.5 pl-2' : 'px-2 pl-3',
                box,
                selected && 'ring-p ring-2 ring-offset-1',
                dimmed && 'opacity-30',
            )}
        >
            <span className={cn('absolute inset-y-0 left-0', view === 'month' ? 'w-[3px]' : 'w-1', strip)} />
            {job.notify && <Phone className="text-over absolute top-1 right-1 size-3" strokeWidth={2.5} />}

            {view === 'month' && <span className="truncate text-[11px] font-semibold">{width >= 3 ? surname : surname.slice(0, 1)}</span>}

            {view === 'week' && (
                <>
                    <span className="flex min-w-0 items-center gap-1.5 pr-3">
                        {Icon && <Icon className={cn('size-3.5 shrink-0', job.warning ? 'text-parts' : 'text-muted-foreground')} />}
                        <span className="text-p shrink-0 font-mono text-[11px] font-bold">#{job.number}</span>
                        <span className="truncate text-[12px] font-semibold">{job.vehicle?.make ?? surname}</span>
                        {width >= 4 && <DurationChip quarters={job.duration} className="ml-auto" />}
                    </span>
                    <span className="text-muted-foreground truncate text-[11px]">
                        {surname} · {job.description}
                    </span>
                </>
            )}

            {view === 'day' && (
                <>
                    <span className="flex min-w-0 items-center gap-2 pr-3">
                        <span className="text-p font-mono text-[12px] font-bold">#{job.number}</span>
                        <Plate value={job.vehicle?.plate} />
                        <DurationChip quarters={job.duration} className="ml-auto" />
                    </span>
                    <span className="mt-1 truncate text-[13px] font-bold">
                        {job.vehicle?.make} · {job.customer.name}
                    </span>
                    <span className="text-fg-2 truncate text-[12px]">{job.description}</span>
                    <span className="border-line/80 mt-1.5 flex items-center justify-between gap-2 border-t pt-1 text-[11px]">
                        <span className={cn('flex items-center gap-1 font-semibold', job.warning ? 'text-parts-ink' : 'text-fg-2')}>
                            {Icon && <Icon className="size-3.5" />}
                            {job.warning ? (job.warning === 'overlap' ? t('Overlap') : t('Mechanic off')) : status(job.status)}
                        </span>
                        <span className="text-muted-foreground font-mono">
                            {job.start.time} → {job.end.date !== job.start.date && `${weekdayShort(job.end.date, locale)} `}
                            {job.end.time}
                        </span>
                    </span>
                </>
            )}
        </button>
    );
}
