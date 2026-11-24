import { CustomerAvatar, MechanicAvatar, Plate, StatusDot, Tag } from '@/components/ui-kit';
import { formatDate, formatDays } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { JobRow, JobStatus } from '@/types';
import { Ellipsis, Phone, TriangleAlert } from 'lucide-react';

export function useStatusLabel() {
    const t = useT();
    const labels: Record<JobStatus, string> = {
        scheduled: t('Scheduled'),
        in_progress: t('In progress'),
        waiting_parts: t('Waiting for parts'),
        completed: t('Completed'),
    };
    return (s: JobStatus) => labels[s];
}

/** Jobs table in the reference style: checkbox, number, avatar, plate, status dot, actions. */
export function JobTable({ jobs, showWork = true }: { jobs: JobRow[]; showWork?: boolean }) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const th =
        'border-y border-line bg-subtle px-3.5 py-3 text-left text-[13.5px] font-medium whitespace-nowrap text-muted-foreground first:pl-5 last:pr-5';
    const td = 'border-b border-line px-3.5 py-[13px] whitespace-nowrap first:pl-5 last:pr-5';

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className={th + ' w-9'}>
                            <input type="checkbox" aria-label={t('Select all')} className="size-[18px] accent-[var(--p)]" />
                        </th>
                        <th className={th}>{t('Job')}</th>
                        <th className={th}>{t('Customer')}</th>
                        <th className={th}>{t('Vehicle')}</th>
                        {showWork && <th className={th}>{t('Work to be done')}</th>}
                        <th className={th}>{t('Mechanic')}</th>
                        <th className={th}>{t('Start')}</th>
                        <th className={th}>{t('Duration')}</th>
                        <th className={th}>{t('Status')}</th>
                        <th className={th + ' text-right'}>{t('Actions')}</th>
                    </tr>
                </thead>
                <tbody className="rows-in">
                    {jobs.map((j) => (
                        <tr key={j.id} className="hover:bg-hover [&:last-child>td]:border-b-0">
                            <td className={td}>
                                <input type="checkbox" aria-label={t('Select')} className="size-[18px] accent-[var(--p)]" />
                            </td>
                            <td className={td + ' font-semibold tabular-nums'}>#{j.number}</td>
                            <td className={td}>
                                <div className="flex items-center gap-2.5">
                                    <CustomerAvatar name={j.customer.name} size="sm" />
                                    <span className="font-medium">{j.customer.name}</span>
                                </div>
                            </td>
                            <td className={td}>
                                <div className="flex items-center gap-2">
                                    {j.vehicle?.make}
                                    <Plate value={j.vehicle?.plate} />
                                </div>
                            </td>
                            {showWork && <td className={td + ' min-w-[180px] whitespace-normal'}>{j.description}</td>}
                            <td className={td}>
                                {j.mechanic && (
                                    <div className="flex items-center gap-2.5">
                                        <MechanicAvatar mechanic={j.mechanic} size="sm" />
                                        {j.mechanic.name}
                                    </div>
                                )}
                            </td>
                            <td className={td + ' tabular-nums'}>
                                {formatDate(j.start.date, locale)} · {j.start.time}
                            </td>
                            <td className={td + ' tabular-nums'}>{formatDays(j.duration, locale)}</td>
                            <td className={td}>
                                <div className="flex items-center gap-2">
                                    <StatusDot status={j.status} label={status(j.status)} />
                                    {j.notify && <Tag tone="call" icon={Phone} title={t('Customer to call')} />}
                                    {j.warning && (
                                        <Tag
                                            tone="over"
                                            icon={TriangleAlert}
                                            title={
                                                j.warning === 'overlap'
                                                    ? t('Overlaps another job of this mechanic')
                                                    : t('Mechanic is off during part of this job')
                                            }
                                        />
                                    )}
                                </div>
                            </td>
                            <td className={td + ' text-right'}>
                                <button
                                    type="button"
                                    aria-label={t('Actions')}
                                    className="text-muted-foreground hover:bg-hover inline-grid size-[30px] place-items-center rounded-lg"
                                >
                                    <Ellipsis className="size-[17px]" strokeWidth={1.7} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
