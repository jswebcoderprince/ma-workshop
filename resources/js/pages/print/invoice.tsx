import { PrintSheet, SheetCompany, SheetLabel } from '@/components/print-sheet';
import { useLocale, useT } from '@/lib/i18n';
import { money, qty } from '@/lib/money';
import { useUnitLabel } from '@/lib/units';
import type { InvoiceSummary, Party } from '@/types';

interface Invoice extends InvoiceSummary {
    seller: Party;
    buyer: Party;
    vatPayer: boolean;
    vatRate: number;
    subtotal: number;
    vat: number;
    reference: string | null;
    jobId: number | null;
    lines: { description: string; quantity: number; unit: string; unitPrice: number; total: number }[];
}

/** Printable invoice in the usual Lithuanian layout: seller and buyer side by side, lines, totals, signatures. */
export default function InvoicePrint({ invoice }: { invoice: Invoice }) {
    const t = useT();
    const locale = useLocale();
    const unit = useUnitLabel();
    const [series, number] = invoice.number.split('-');
    const cell = 'border-b border-[#ccc] px-2 py-1.5 align-top';
    const back = invoice.jobId ? route('jobs.show', invoice.jobId) : route('invoices');

    return (
        <PrintSheet title={invoice.number} back={back}>
            <div className="relative">
                {invoice.voidedAt && (
                    <div className="pointer-events-none absolute inset-x-0 top-[180px] z-10 grid place-items-center">
                        <span className="-rotate-12 rounded border-4 border-[#c0392b] px-6 py-2 text-[40px] font-bold tracking-wide text-[#c0392b] opacity-70">
                            {t('VOIDED')}
                        </span>
                    </div>
                )}

                <header className="flex items-start justify-between gap-6 border-b-2 border-[#141618] pb-4">
                    <SheetCompany company={invoice.seller} />
                    <div className="text-right">
                        <div className="text-[18px] font-semibold">{invoice.vatPayer ? t('VAT invoice') : t('Sales invoice')}</div>
                        <div className="text-[13px]">
                            {t('Series')} <b>{series}</b> {t('No.')} <b>{number}</b>
                        </div>
                        <div className="text-[12px]">{invoice.issuedOn}</div>
                    </div>
                </header>

                <section className="mt-5 grid grid-cols-2 gap-6">
                    <PartyBlock title={t('Seller')} party={invoice.seller} code={invoice.seller.code} />
                    <PartyBlock title={t('Buyer')} party={invoice.buyer} code={invoice.buyer.company_code} />
                </section>

                {invoice.reference && (
                    <p className="mt-4 text-[12px]">
                        <span className="text-[#666]">{t('For work')}:</span> {invoice.reference}
                    </p>
                )}

                <table className="mt-3 w-full border-collapse text-[12px]">
                    <thead>
                        <tr className="border-y-2 border-[#141618] text-left text-[11px]">
                            <th className="w-8 px-2 py-1.5">{t('No.')}</th>
                            <th className="px-2 py-1.5">{t('Description')}</th>
                            <th className="w-16 px-2 py-1.5 text-right">{t('Qty')}</th>
                            <th className="w-14 px-2 py-1.5">{t('Unit')}</th>
                            <th className="w-24 px-2 py-1.5 text-right">{invoice.vatPayer ? t('Price without VAT') : t('Price')}</th>
                            <th className="w-24 px-2 py-1.5 text-right">{invoice.vatPayer ? t('Sum without VAT') : t('Sum')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lines.map((l, i) => (
                            <tr key={i}>
                                <td className={cell}>{i + 1}</td>
                                <td className={cell}>{l.description}</td>
                                <td className={cell + ' text-right'}>{qty(l.quantity, locale)}</td>
                                <td className={cell}>{unit(l.unit)}</td>
                                <td className={cell + ' text-right whitespace-nowrap'}>{money(l.unitPrice, locale)}</td>
                                <td className={cell + ' text-right whitespace-nowrap'}>{money(l.total, locale)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-3 flex justify-end">
                    <dl className="w-[260px] text-[12.5px]">
                        {invoice.vatPayer && (
                            <>
                                <div className="flex justify-between py-0.5">
                                    <dt>{t('Without VAT')}</dt>
                                    <dd>{money(invoice.subtotal, locale)}</dd>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <dt>{t('VAT :rate%', { rate: invoice.vatRate })}</dt>
                                    <dd>{money(invoice.vat, locale)}</dd>
                                </div>
                            </>
                        )}
                        <div className="mt-1 flex justify-between border-t-2 border-[#141618] pt-1.5 text-[14px] font-semibold">
                            <dt>{t('Total to pay')}</dt>
                            <dd>{money(invoice.total, locale)}</dd>
                        </div>
                    </dl>
                </div>

                <p className="mt-5 text-[12px]">
                    <span className="text-[#666]">{t('Pay by')}:</span> <b>{invoice.dueOn}</b>
                    {invoice.seller.bank && (
                        <>
                            {' · '}
                            <span className="text-[#666]">{t('Bank account')}:</span> {invoice.seller.bank}
                        </>
                    )}
                </p>
                {!invoice.vatPayer && <p className="mt-1 text-[11px] text-[#555]">{t('The seller is not a VAT payer.')}</p>}

                <section className="mt-14 grid grid-cols-2 gap-12">
                    <div>
                        <div className="h-8 border-b border-[#555]" />
                        <div className="mt-1 text-[10.5px] text-[#666]">{t('Issued by (name, signature)')}</div>
                    </div>
                    <div>
                        <div className="h-8 border-b border-[#555]" />
                        <div className="mt-1 text-[10.5px] text-[#666]">{t('Received by (name, signature)')}</div>
                    </div>
                </section>
            </div>
        </PrintSheet>
    );
}

function PartyBlock({ title, party, code }: { title: string; party: Party; code?: string | null }) {
    const t = useT();
    const rows: [string, string | null | undefined][] = [
        [t('Company code'), code],
        [t('VAT code'), party.vat_code],
        [t('Address'), party.address],
        [t('Phone'), party.phone],
        [t('Email'), party.email],
    ];
    return (
        <div>
            <SheetLabel>{title}</SheetLabel>
            <div className="text-[14px] font-semibold">{party.name}</div>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-[11.5px]">
                {rows
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                        <div key={k} className="contents">
                            <dt className="text-[#666]">{k}</dt>
                            <dd>{v}</dd>
                        </div>
                    ))}
            </dl>
        </div>
    );
}
