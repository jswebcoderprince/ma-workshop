import { Pager } from '@/components/pager';
import { Card, EmptyState, Segmented, TextInput } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { money } from '@/lib/money';
import { cn } from '@/lib/utils';
import { visitWith } from '@/lib/visit';
import type { InvoiceSummary, Paged } from '@/types';
import { Link } from '@inertiajs/react';
import { ReceiptText, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Row = InvoiceSummary & {
    customer: string;
    job: { id: number; number: string; vehicle: string | null } | null;
    subtotal: number;
    vat: number;
};
interface Props {
    filters: { q: string; status: 'all' | 'issued' | 'voided' };
    invoices: Paged<Row>;
    summary: { month: string; monthCount: number; monthTotal: number; lastMonth: string; lastMonthTotal: number; voided: number };
}

const ONLY = ['invoices', 'filters'];

export default function Invoices({ filters, invoices, summary }: Props) {
    const t = useT();
    const locale = useLocale();
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

    const monthName = (ym: string) => new Intl.DateTimeFormat(locale === 'lt' ? 'lt-LT' : 'en-GB', { month: 'long' }).format(new Date(ym + '-15'));

    return (
        <AppLayout title={t('Invoices')} subtitle={t('Invoices are issued from a job page.')}>
            <div className="grid gap-4 sm:grid-cols-3">
                <Figure label={t('Invoiced in :month', { month: monthName(summary.month) })} value={money(summary.monthTotal, locale)}>
                    {t('Invoices: :n', { n: summary.monthCount })}
                </Figure>
                <Figure label={t('Invoiced in :month', { month: monthName(summary.lastMonth) })} value={money(summary.lastMonthTotal, locale)} />
                <Figure label={t('Voided')} value={String(summary.voided)}>
                    {t('Numbers stay used')}
                </Figure>
            </div>

            <Card>
                <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-5">
                    <label className="relative w-full md:w-[320px]">
                        <Search className="text-muted-foreground absolute top-[11px] left-3 size-4" strokeWidth={1.7} />
                        <TextInput
                            type="search"
                            className="pl-9"
                            placeholder={t('Number or customer')}
                            aria-label={t('Search invoices')}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </label>
                    <Segmented
                        value={filters.status}
                        onChange={(v) => visitWith('status', v === 'all' ? null : v, ONLY)}
                        options={[
                            { value: 'all', label: t('All invoices') },
                            { value: 'issued', label: t('Valid') },
                            { value: 'voided', label: t('Voided') },
                        ]}
                    />
                </div>

                {invoices.data.length === 0 ? (
                    <EmptyState icon={ReceiptText} title={filters.q ? t('No invoices match “:q”', { q: filters.q }) : t('No invoices yet')}>
                        {t('Open a job, add the work and parts, then press “Issue invoice”.')}
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-subtle text-muted-foreground text-left text-[13px]">
                                    <th className="border-line border-y py-2.5 pr-3 pl-5 font-medium">{t('Number')}</th>
                                    <th className="border-line border-y px-3 py-2.5 font-medium">{t('Date')}</th>
                                    <th className="border-line border-y px-3 py-2.5 font-medium">{t('Customer')}</th>
                                    <th className="border-line border-y px-3 py-2.5 font-medium">{t('Job')}</th>
                                    <th className="border-line border-y px-3 py-2.5 text-right font-medium">{t('Total')}</th>
                                    <th className="border-line border-y px-3 py-2.5 font-medium">{t('Pay by')}</th>
                                    <th className="border-line border-y py-2.5 pr-5 pl-3 font-medium">{t('Status')}</th>
                                </tr>
                            </thead>
                            <tbody className="rows-in">
                                {invoices.data.map((i) => (
                                    <tr
                                        key={i.id}
                                        className={cn('hover:bg-hover [&:last-child>td]:border-b-0', i.voidedAt && 'text-muted-foreground')}
                                    >
                                        <td className="border-line border-b py-3 pr-3 pl-5 whitespace-nowrap">
                                            <a
                                                href={route('invoices.show', i.id)}
                                                target="_blank"
                                                rel="noopener"
                                                className={cn('font-semibold hover:underline', i.voidedAt && 'line-through')}
                                            >
                                                {i.number}
                                            </a>
                                        </td>
                                        <td className="border-line border-b px-3 py-3 whitespace-nowrap">{formatDate(i.issuedOn, locale, false)}</td>
                                        <td className="border-line border-b px-3 py-3">{i.customer}</td>
                                        <td className="border-line border-b px-3 py-3 whitespace-nowrap">
                                            {i.job && (
                                                <Link href={route('jobs.show', i.job.id)} className="hover:underline">
                                                    #{i.job.number}
                                                    {i.job.vehicle && <span className="text-muted-foreground"> · {i.job.vehicle}</span>}
                                                </Link>
                                            )}
                                        </td>
                                        <td className="border-line border-b px-3 py-3 text-right font-medium whitespace-nowrap">
                                            {money(i.total, locale)}
                                        </td>
                                        <td className="border-line border-b px-3 py-3 whitespace-nowrap">{formatDate(i.dueOn, locale, false)}</td>
                                        <td className="border-line border-b py-3 pr-5 pl-3 whitespace-nowrap">
                                            {i.voidedAt ? (
                                                <span className="text-over-ink text-[13px] font-medium">{t('Voided')}</span>
                                            ) : (
                                                <span className="text-ok-ink text-[13px] font-medium">{t('Valid')}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pager page={invoices} />
            </Card>
        </AppLayout>
    );
}

function Figure({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
    return (
        <Card className="p-4">
            <div className="text-muted-foreground text-[13px]">{label}</div>
            <div className="mt-1 text-[24px] font-semibold tracking-[-0.01em]">{value}</div>
            {children && <div className="text-muted-foreground mt-0.5 text-[12.5px]">{children}</div>}
        </Card>
    );
}
