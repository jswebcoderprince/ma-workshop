import { useStatusLabel } from '@/components/job-table';
import { Pager } from '@/components/pager';
import { ButtonLink, Card, EmptyState, MechanicAvatar, Plate, SelectInput, StatusDot, Tag, TextInput } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDays } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { visitWith } from '@/lib/visit';
import type { JobRow, MechanicView, Paged } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Phone, Plus, ReceiptText, Search, TriangleAlert, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Status = 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'all';
type Row = JobRow & { invoice: { id: number; number: string } | null };
interface Props {
    filters: { q: string; status: Status; flag: 'call' | 'warning' | null; mechanic: number | null };
    jobs: Paged<Row>;
    counts: Record<Status | 'call' | 'warning', number>;
    mechanics: MechanicView[];
}

const ONLY = ['jobs', 'filters', 'counts'];

export default function Jobs({ filters, jobs, counts, mechanics }: Props) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const [q, setQ] = useState(filters.q);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const id = setTimeout(() => visitWith('q', q.trim(), ONLY), 300);
        return () => clearTimeout(id);
    }, [q]);

    const tabs: { value: Status; label: string }[] = [
        { value: 'open', label: t('Open') },
        { value: 'scheduled', label: t('Scheduled') },
        { value: 'in_progress', label: t('In progress') },
        { value: 'waiting_parts', label: t('Waiting for parts') },
        { value: 'completed', label: t('Completed') },
        { value: 'all', label: t('All jobs') },
    ];
    const open = (id: number) => router.visit(route('jobs.show', id));
    const warningText = (w: JobRow['warning']) =>
        w === 'overlap' ? t('Overlaps another job of this mechanic') : t('Mechanic is off during part of this job');

    return (
        <AppLayout
            title={t('Jobs')}
            actions={
                <ButtonLink href={route('calendar', { new: 1 })} variant="primary" icon={Plus}>
                    {t('New job')}
                </ButtonLink>
            }
        >
            <Card>
                {/* status tabs */}
                <div className="border-line flex gap-1 overflow-x-auto border-b px-3 md:px-4" role="tablist">
                    {tabs.map((tab) => {
                        const active = filters.status === tab.value;
                        return (
                            <button
                                key={tab.value}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => visitWith('status', tab.value === 'open' ? null : tab.value, ONLY)}
                                className={cn(
                                    'relative flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-[13.5px] whitespace-nowrap transition-colors duration-150',
                                    active ? 'text-fg font-semibold' : 'text-muted-foreground hover:text-fg',
                                )}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="jobs-tab"
                                        className="bg-p absolute inset-x-1 -bottom-px h-0.5 rounded-full"
                                        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                                    />
                                )}
                                {tab.label}
                                <span className={cn('text-[12px] tabular-nums', active ? 'text-fg-2' : 'text-faint')}>{counts[tab.value]}</span>
                            </button>
                        );
                    })}
                </div>

                {/* search and filters */}
                <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-5">
                    <label className="relative w-full md:w-[320px]">
                        <Search className="text-muted-foreground absolute top-[11px] left-3 size-4" strokeWidth={1.7} />
                        <TextInput
                            type="search"
                            className="pl-9"
                            placeholder={t('Number, customer, plate or work')}
                            aria-label={t('Search jobs')}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </label>
                    <SelectInput
                        className="w-auto min-w-[170px]"
                        aria-label={t('Mechanic')}
                        value={filters.mechanic ?? ''}
                        onChange={(e) => visitWith('mechanic', e.target.value || null, ONLY)}
                    >
                        <option value="">{t('All mechanics')}</option>
                        {mechanics.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name}
                            </option>
                        ))}
                    </SelectInput>
                    <FlagChip
                        active={filters.flag === 'call'}
                        onClick={() => visitWith('flag', filters.flag === 'call' ? null : 'call', ONLY)}
                        icon={Phone}
                        label={t('To call')}
                        n={counts.call}
                    />
                    <FlagChip
                        active={filters.flag === 'warning'}
                        onClick={() => visitWith('flag', filters.flag === 'warning' ? null : 'warning', ONLY)}
                        icon={TriangleAlert}
                        label={t('Overlaps')}
                        n={counts.warning}
                    />
                </div>

                {jobs.data.length === 0 ? (
                    <EmptyState icon={Wrench} title={filters.q ? t('No jobs match “:q”', { q: filters.q }) : t('No jobs here')}>
                        {filters.q ? t('Try the job number, part of the name or the plate.') : t('Jobs are booked from the calendar.')}
                    </EmptyState>
                ) : (
                    <>
                        {/* desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-subtle text-muted-foreground text-left text-[13px]">
                                        <th className="border-line border-y py-2.5 pr-3 pl-5 font-medium">{t('Job')}</th>
                                        <th className="border-line border-y px-3 py-2.5 font-medium">{t('Customer')}</th>
                                        <th className="border-line border-y px-3 py-2.5 font-medium">{t('Vehicle')}</th>
                                        <th className="border-line border-y px-3 py-2.5 font-medium">{t('Mechanic')}</th>
                                        <th className="border-line border-y px-3 py-2.5 font-medium">{t('When')}</th>
                                        <th className="border-line border-y px-3 py-2.5 text-right font-medium">{t('Length')}</th>
                                        <th className="border-line border-y px-3 py-2.5 font-medium">{t('Status')}</th>
                                        <th className="border-line border-y py-2.5 pr-5 pl-3 font-medium">{t('Invoice')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobs.data.map((j) => (
                                        <tr
                                            key={j.id}
                                            tabIndex={0}
                                            onClick={() => open(j.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && open(j.id)}
                                            className="hover:bg-hover cursor-pointer align-top transition-colors duration-150 [&:last-child>td]:border-b-0"
                                        >
                                            <td className="border-line max-w-[300px] border-b py-3 pr-3 pl-5">
                                                <Link
                                                    href={route('jobs.show', j.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="font-semibold hover:underline"
                                                >
                                                    #{j.number}
                                                </Link>
                                                <div className="text-muted-foreground truncate text-[13px]" title={j.description}>
                                                    {j.description}
                                                </div>
                                            </td>
                                            <td className="border-line border-b px-3 py-3 whitespace-nowrap">
                                                <div className="font-medium">{j.customer.name}</div>
                                                <div className="text-muted-foreground text-[13px]">{j.customer.phone}</div>
                                            </td>
                                            <td className="border-line border-b px-3 py-3 whitespace-nowrap">
                                                <div>{j.vehicle?.make ?? <span className="text-faint">—</span>}</div>
                                                <div className="mt-1">
                                                    <Plate value={j.vehicle?.plate} />
                                                </div>
                                            </td>
                                            <td className="border-line border-b px-3 py-3 whitespace-nowrap">
                                                {j.mechanic && (
                                                    <span className="flex items-center gap-2">
                                                        <MechanicAvatar mechanic={j.mechanic} size="sm" />
                                                        {j.mechanic.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="border-line border-b px-3 py-3 whitespace-nowrap">
                                                <div>
                                                    {formatDate(j.start.date, locale)} · {j.start.time}
                                                </div>
                                                <div className="text-muted-foreground text-[13px]">
                                                    → {j.end.date !== j.start.date && `${formatDate(j.end.date, locale)} · `}
                                                    {j.end.time}
                                                </div>
                                            </td>
                                            <td className="border-line border-b px-3 py-3 text-right whitespace-nowrap">
                                                {formatDays(j.duration, locale)}
                                            </td>
                                            <td className="border-line border-b px-3 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <StatusDot status={j.status} label={status(j.status)} />
                                                    {j.notify && <Tag tone="call" icon={Phone} title={t('Customer to call')} />}
                                                    {j.warning && <Tag tone="over" icon={TriangleAlert} title={warningText(j.warning)} />}
                                                </div>
                                            </td>
                                            <td className="border-line border-b py-3 pr-5 pl-3 whitespace-nowrap">
                                                {j.invoice ? (
                                                    <span className="text-fg-2 inline-flex items-center gap-1.5 text-[13px]">
                                                        <ReceiptText className="text-muted-foreground size-4" strokeWidth={1.7} />
                                                        {j.invoice.number}
                                                    </span>
                                                ) : (
                                                    <span className="text-faint">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* phone list */}
                        <ul className="border-line divide-line divide-y border-t md:hidden">
                            {jobs.data.map((j) => (
                                <li key={j.id}>
                                    <Link href={route('jobs.show', j.id)} className="active:bg-hover flex flex-col gap-1 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">#{j.number}</span>
                                            <span className="truncate">{j.vehicle?.make}</span>
                                            <span className="flex-1" />
                                            <StatusDot status={j.status} label={status(j.status)} />
                                        </div>
                                        <div className="text-fg-2 truncate text-[13.5px]">{j.description}</div>
                                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[13px]">
                                            <span>{j.customer.name}</span>
                                            <span>·</span>
                                            <span>
                                                {formatDate(j.start.date, locale)} {j.start.time}
                                            </span>
                                            <span>·</span>
                                            <span>{j.mechanic?.name}</span>
                                            {j.notify && <Phone className="text-over size-3.5" />}
                                            {j.warning && <TriangleAlert className="text-over size-3.5" />}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <Pager page={jobs} />
            </Card>
        </AppLayout>
    );
}

function FlagChip({ active, onClick, icon: Icon, label, n }: { active: boolean; onClick: () => void; icon: typeof Phone; label: string; n: number }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'inline-flex h-[38px] items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium',
                active ? 'border-p bg-p-soft text-p-ink' : 'border-line-strong bg-panel text-fg-2 hover:bg-hover',
            )}
        >
            <Icon className="size-4" strokeWidth={1.8} />
            {label}
            <span className="text-muted-foreground tabular-nums">{n}</span>
        </button>
    );
}
