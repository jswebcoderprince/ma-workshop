import { JobTable } from '@/components/job-table';
import { ButtonLink, Card, CardHeader, EmptyState, Kebab, MechanicAvatar, StatCard } from '@/components/ui-kit';
import { WorkloadChart, type WorkloadWeek } from '@/components/workload-chart';
import AppLayout from '@/layouts/app-layout';
import { formatShortDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { JobRow, MechanicView } from '@/types';
import { CalendarCheck, CalendarSearch, Gauge, Package, PhoneCall, Plus, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import { useState } from 'react';

interface Props {
    stats: {
        bookedThisWeek: number;
        bookedNextWeek: number;
        nextFree: { date: string; time: string; mechanic: string } | null;
        waitingParts: number;
        toCall: number;
        earlier: number;
        overlaps: number;
    };
    workload: WorkloadWeek[];
    mechanics: (MechanicView & { load: number; nextFree: string | null })[];
    upcoming: JobRow[];
}

export default function Overview({ stats, workload, mechanics, upcoming }: Props) {
    const t = useT();
    const locale = useLocale();
    const [weeks, setWeeks] = useState<8 | 4>(8);
    const up = stats.bookedNextWeek >= stats.bookedThisWeek;

    const typeNames: Record<string, string> = { car: t('Car'), moto: t('Motorcycle'), water: t('Watercraft') };
    const typeLabel = (types: string[]) => types.map((v) => typeNames[v] ?? v).join(', ');

    return (
        <AppLayout
            title={t('Overview')}
            actions={
                <>
                    <ButtonLink href={route('calendar')} icon={CalendarSearch} label={t('Find a slot')}>
                        <span className="hidden md:inline">{t('Find a slot')}</span>
                    </ButtonLink>
                    <ButtonLink href={route('calendar')} variant="primary" icon={Plus} label={t('New job')}>
                        <span className="hidden md:inline">{t('New job')}</span>
                    </ButtonLink>
                </>
            }
        >
            <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4">
                <StatCard
                    label={t('Booked this week')}
                    icon={Gauge}
                    color="var(--color-k1)"
                    value={`${stats.bookedThisWeek}%`}
                    aside={
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 text-[13.5px] font-medium',
                                stats.bookedNextWeek >= 90 ? 'text-over' : 'text-ok',
                            )}
                            title={t('Booked share of mechanic time next week')}
                        >
                            {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                            {stats.bookedNextWeek}%<span className="hidden md:inline"> {t('next wk')}</span>
                        </span>
                    }
                    foot={t('of mechanic time')}
                />
                <StatCard
                    label={t('Next free day')}
                    icon={CalendarCheck}
                    color="var(--color-k2)"
                    value={stats.nextFree ? formatShortDate(stats.nextFree.date, locale) : '—'}
                    foot={stats.nextFree ? `${stats.nextFree.mechanic} · ${t('for a 1-day job')}` : t('No mechanics yet')}
                />
                <StatCard label={t('Waiting for parts')} icon={Package} color="var(--color-k3)" value={stats.waitingParts} foot={t('jobs on hold')} />
                <StatCard
                    label={t('Customers to call')}
                    icon={PhoneCall}
                    color="var(--color-k4)"
                    value={stats.toCall}
                    aside={
                        stats.toCall > 0 && (
                            <ButtonLink href={route('jobs', { filter: 'notify' })} size="sm" variant="soft" className="hidden sm:inline-flex">
                                {t('Review')}
                            </ButtonLink>
                        )
                    }
                    foot={t('after date changes')}
                />
            </div>

            <div className="grid items-start gap-3.5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Card>
                    <CardHeader title={t('Workload')}>
                        <div className="flex h-[30px] gap-[22px]">
                            {([8, 4] as const).map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    aria-pressed={weeks === n}
                                    onClick={() => setWeeks(n)}
                                    className={cn(
                                        'text-muted-foreground border-b-2 border-transparent px-0.5 font-medium',
                                        weeks === n && 'border-p text-fg',
                                    )}
                                >
                                    {n === 8 ? t('8 weeks') : t('4 weeks')}
                                </button>
                            ))}
                        </div>
                        <Kebab />
                    </CardHeader>
                    <div className="text-fg-2 flex gap-[18px] px-5 pb-1.5 text-[13px]">
                        <span className="inline-flex items-center gap-[7px]">
                            <i className="bg-p size-3 rounded-[3px]" />
                            {t('Booked')}
                        </span>
                        <span className="inline-flex items-center gap-[7px]">
                            <i className="size-3 rounded-[3px] bg-[#3fc6a0]" />
                            {t('Available')}
                        </span>
                    </div>
                    <div className="px-3 pb-3">
                        <WorkloadChart weeks={workload.slice(0, weeks)} />
                    </div>
                </Card>

                <Card>
                    <CardHeader title={t('Mechanics')}>
                        <Kebab />
                    </CardHeader>
                    <div className="px-5 pb-5">
                        {mechanics.length === 0 && <p className="text-muted-foreground">{t('No mechanics yet')}</p>}
                        {mechanics.map((m) => (
                            <div key={m.id} className="border-line flex items-center gap-3 border-b border-dashed py-[11px] last:border-b-0">
                                <MechanicAvatar mechanic={m} />
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium">{m.name}</div>
                                    <div className="text-muted-foreground truncate text-[12.5px]">{typeLabel(m.vehicleTypes)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold tabular-nums">{m.load}%</div>
                                    <div className="text-muted-foreground text-xs">
                                        {t('next free')} {m.nextFree ? formatShortDate(m.nextFree, locale) : '—'}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <ButtonLink href={route('calendar')} variant="primary" className="mt-3">
                            {t('Open calendar')}
                        </ButtonLink>
                    </div>
                </Card>
            </div>

            <Card>
                <CardHeader title={t('Upcoming jobs')}>
                    <ButtonLink href={route('jobs')} size="sm">
                        {t('View all')}
                    </ButtonLink>
                </CardHeader>
                {upcoming.length ? <JobTable jobs={upcoming} showWork={false} /> : <EmptyState icon={Wrench} title={t('No upcoming jobs')} />}
            </Card>
        </AppLayout>
    );
}
