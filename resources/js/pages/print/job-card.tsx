import { PrintSheet, SheetCompany, SheetLabel } from '@/components/print-sheet';
import { Plate } from '@/components/ui-kit';
import { formatDate, formatDays } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { qty } from '@/lib/money';
import { useUnitLabel } from '@/lib/units';
import { useVehicleLabels } from '@/lib/vehicles';
import type { JobLine, JobRow, Party } from '@/types';

type Job = JobRow & {
    mileage: number | null;
    customer: { name: string; phone: string | null };
    vehicle: (NonNullable<JobRow['vehicle']> & { vin: string | null }) | null;
};

/** Rows on the card: the lines already entered, then empty ones for the mechanic to fill in by hand. */
const ROWS = 10;

export default function JobCard({ job, lines, company, printedOn }: { job: Job; lines: JobLine[]; company: Party; printedOn: string }) {
    const t = useT();
    const locale = useLocale();
    const unit = useUnitLabel();
    const vehicleType = useVehicleLabels();
    const blanks = Math.max(ROWS - lines.length, 3);
    const cell = 'border border-[#bbb] px-2 py-1.5 text-left align-top';

    return (
        <PrintSheet title={`${t('Job card')} #${job.number}`} back={route('jobs.show', job.id)}>
            <header className="flex items-start justify-between gap-6 border-b-2 border-[#141618] pb-4">
                <SheetCompany company={company} />
                <div className="text-right">
                    <div className="text-[20px] font-semibold">{t('Job card')}</div>
                    <div className="text-[16px] font-semibold">#{job.number}</div>
                    <div className="text-[11px] text-[#555]">
                        {t('Printed')} {printedOn}
                    </div>
                </div>
            </header>

            <section className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded border border-[#bbb] p-3">
                    <SheetLabel>{t('Customer')}</SheetLabel>
                    <div className="text-[14px] font-semibold">{job.customer.name}</div>
                    <div>{job.customer.phone}</div>
                </div>
                <div className="rounded border border-[#bbb] p-3">
                    <SheetLabel>{t('Vehicle')}</SheetLabel>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{job.vehicle?.make ?? '—'}</span>
                        {job.vehicle?.year && <span>{job.vehicle.year}</span>}
                        <Plate value={job.vehicle?.plate} />
                    </div>
                    {job.vehicle && <div className="text-[#555]">{vehicleType(job.vehicle.type)}</div>}
                    <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2">
                        <span className="text-[#666]">VIN</span>
                        <span>{job.vehicle?.vin || <Blank />}</span>
                        <span className="text-[#666]">{t('Mileage, km')}</span>
                        <span>{job.mileage !== null ? job.mileage.toLocaleString('lt-LT') : <Blank />}</span>
                    </div>
                </div>
            </section>

            <section className="mt-4 grid grid-cols-4 gap-4 rounded border border-[#bbb] p-3">
                <div>
                    <SheetLabel>{t('Mechanic')}</SheetLabel>
                    <div className="text-[13px] font-semibold">{job.mechanic?.name}</div>
                </div>
                <div>
                    <SheetLabel>{t('Start')}</SheetLabel>
                    <div>
                        {formatDate(job.start.date, locale)} {job.start.time}
                    </div>
                </div>
                <div>
                    <SheetLabel>{t('Planned end')}</SheetLabel>
                    <div>
                        {formatDate(job.end.date, locale)} {job.end.time}
                    </div>
                </div>
                <div>
                    <SheetLabel>{t('Length')}</SheetLabel>
                    <div>{formatDays(job.duration, locale)}</div>
                </div>
            </section>

            <section className="mt-4">
                <SheetLabel>{t('Work to be done')}</SheetLabel>
                <p className="min-h-[48px] rounded border border-[#bbb] p-3 text-[13px] whitespace-pre-line">{job.description}</p>
            </section>

            <section className="mt-4">
                <SheetLabel>{t('Work done and parts used')}</SheetLabel>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f1f2f4]">
                            <th className={cell + ' w-8'}>#</th>
                            <th className={cell}>{t('Description')}</th>
                            <th className={cell + ' w-16 text-right'}>{t('Qty')}</th>
                            <th className={cell + ' w-16'}>{t('Unit')}</th>
                            <th className={cell + ' w-[34%]'}>{t('Note')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((l, i) => (
                            <tr key={l.id}>
                                <td className={cell}>{i + 1}</td>
                                <td className={cell}>{l.description}</td>
                                <td className={cell + ' text-right'}>{qty(l.quantity, locale)}</td>
                                <td className={cell}>{unit(l.unit)}</td>
                                <td className={cell} />
                            </tr>
                        ))}
                        {Array.from({ length: blanks }, (_, i) => (
                            <tr key={'b' + i} className="h-[26px]">
                                <td className={cell}>{lines.length + i + 1}</td>
                                <td className={cell} />
                                <td className={cell} />
                                <td className={cell} />
                                <td className={cell} />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="mt-4">
                <SheetLabel>{t('Notes')}</SheetLabel>
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="h-[26px] border-b border-[#bbb]" />
                ))}
            </section>

            <section className="mt-5 grid grid-cols-3 gap-6">
                <SignLine label={t('Started (date, time)')} />
                <SignLine label={t('Finished (date, time)')} />
                <SignLine label={t('Hours worked')} />
            </section>
            <section className="mt-6 grid grid-cols-2 gap-10">
                <SignLine label={t('Mechanic, signature')} />
                <SignLine label={t('Customer, signature')} />
            </section>
        </PrintSheet>
    );
}

function Blank() {
    return <span className="inline-block w-28 border-b border-[#999]">&nbsp;</span>;
}

function SignLine({ label }: { label: string }) {
    return (
        <div>
            <div className="h-8 border-b border-[#555]" />
            <div className="mt-1 text-[10.5px] text-[#666]">{label}</div>
        </div>
    );
}
