import { DetailsForm } from '@/components/calendar/job-inspector';
import { useStatusLabel } from '@/components/job-table';
import {
    Button,
    ButtonLink,
    Card,
    CardHeader,
    Field,
    MechanicAvatar,
    Plate,
    Segmented,
    SelectInput,
    StatusDot,
    Tag,
    TextInput,
    buttonClasses,
} from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { addDays } from '@/lib/calendar';
import { formatDate, formatDays } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { centsToInput, money, qty } from '@/lib/money';
import { useUnitLabel } from '@/lib/units';
import { cn } from '@/lib/utils';
import type { InvoiceSummary, JobLine, JobRow, LineKind } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { CalendarRange, Check, FileText, Lock, Pencil, Phone, Plus, Printer, ReceiptText, TriangleAlert, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Job = JobRow & {
    mileage: number | null;
    customer: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        company_code: string | null;
        vat_code: string | null;
        address: string | null;
    };
    vehicle: (NonNullable<JobRow['vehicle']> & { id: number; vin: string | null }) | null;
    log: { action: string; at: string | null; changes: Record<string, unknown> | null }[];
};
interface Billing {
    vatPayer: boolean;
    vatRate: number;
    hourlyRate: number;
    paymentDays: number;
    nextNumber: string;
    today: string;
    units: string[];
}
interface Props {
    job: Job;
    lines: JobLine[];
    totals: { subtotal: number; vat: number; total: number };
    invoice: InvoiceSummary | null;
    voided: InvoiceSummary[];
    billing: Billing;
}

const opts = { preserveScroll: true, preserveState: true };

export default function JobPage({ job, lines, totals, invoice, voided, billing }: Props) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const errors = usePage().props.errors as Record<string, string>;
    const [editingDetails, setEditingDetails] = useState(false);
    const locked = invoice !== null;

    return (
        <AppLayout
            title={t('Job #:n', { n: job.number })}
            crumbs={[{ label: t('Jobs'), href: route('jobs') }]}
            titleExtra={<StatusDot status={job.status} label={status(job.status)} />}
            subtitle={[job.vehicle?.make, job.customer.name].filter(Boolean).join(' · ')}
            actions={
                <>
                    <ButtonLink href={route('calendar', { date: job.start.date, job: job.id })} icon={CalendarRange}>
                        {t('Calendar')}
                    </ButtonLink>
                    <a href={route('jobs.card', job.id)} target="_blank" rel="noopener" className={buttonClasses('default')}>
                        <Printer className="size-[17px]" strokeWidth={1.8} />
                        {t('Job card')}
                    </a>
                    {invoice && (
                        <a href={route('invoices.show', invoice.id)} target="_blank" rel="noopener" className={buttonClasses('primary')}>
                            <ReceiptText className="size-[17px]" strokeWidth={1.8} />
                            {invoice.number}
                        </a>
                    )}
                </>
            }
        >
            {(job.warning || job.notify) && (
                <div className="flex flex-wrap gap-2">
                    {job.warning && (
                        <Tag tone="over" icon={TriangleAlert}>
                            {job.warning === 'overlap' ? t('Overlaps another job of this mechanic') : t('Mechanic is off during part of this job')}
                        </Tag>
                    )}
                    {job.notify && (
                        <Tag tone="call" icon={Phone}>
                            {job.notify === 'earlier' ? t('Moved earlier') : t('Moved later')} · {t('Not informed')}
                        </Tag>
                    )}
                </div>
            )}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-w-0 flex-col gap-5">
                    {/* work and parts */}
                    <Card>
                        <CardHeader title={t('Work and parts')} sub={billing.vatPayer ? t('Prices without VAT') : undefined} />
                        {locked && (
                            <p className="bg-subtle text-fg-2 border-line mx-4 mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-[13px]">
                                <Lock className="size-4 shrink-0" strokeWidth={1.8} />
                                {t('Invoice :n is issued, so the lines are locked. Void the invoice to change them.', { n: invoice.number })}
                            </p>
                        )}
                        {errors.lines && <p className="text-over-ink mx-4 mb-3 text-[13px] font-medium">{errors.lines}</p>}
                        <LinesTable lines={lines} locked={locked} billing={billing} />
                        {!locked && <AddLine jobId={job.id} billing={billing} />}
                        <Totals totals={totals} billing={billing} />
                    </Card>

                    {/* work description */}
                    <Card className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-[15px] font-semibold">{t('Work to be done')}</h3>
                            {!editingDetails && (
                                <button
                                    type="button"
                                    onClick={() => setEditingDetails(true)}
                                    className="text-p flex items-center gap-1 text-[13px] font-semibold hover:underline"
                                >
                                    <Pencil className="size-3.5" /> {t('Edit')}
                                </button>
                            )}
                        </div>
                        {editingDetails ? (
                            <DetailsForm job={job} onDone={() => setEditingDetails(false)} />
                        ) : (
                            <>
                                <p className="text-fg-2 whitespace-pre-line">{job.description}</p>
                                {job.mileage !== null && (
                                    <p className="text-muted-foreground mt-2 text-[13px]">
                                        {t('Mileage')}: {job.mileage.toLocaleString(locale === 'lt' ? 'lt-LT' : 'en-IE')} km
                                    </p>
                                )}
                            </>
                        )}
                    </Card>
                </div>

                <div className="flex min-w-0 flex-col gap-5">
                    <InvoiceCard
                        jobId={job.id}
                        invoice={invoice}
                        voided={voided}
                        billing={billing}
                        hasLines={lines.length > 0}
                        total={totals.total}
                    />

                    <Card className="divide-line flex flex-col divide-y">
                        <Block title={t('Customer')}>
                            <Link href={route('customers', { customer: job.customer.id })} className="font-semibold hover:underline">
                                {job.customer.name}
                            </Link>
                            {job.customer.phone && (
                                <a href={`tel:${job.customer.phone.replace(/\s+/g, '')}`} className="text-p block text-[13.5px] hover:underline">
                                    {job.customer.phone}
                                </a>
                            )}
                            {job.customer.email && <div className="text-fg-2 text-[13.5px]">{job.customer.email}</div>}
                            {job.customer.company_code && (
                                <div className="text-muted-foreground text-[13px]">
                                    {t('Company code')}: {job.customer.company_code}
                                </div>
                            )}
                        </Block>
                        {job.vehicle && (
                            <Block title={t('Vehicle')}>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold">{job.vehicle.make}</span>
                                    {job.vehicle.year && <span className="text-muted-foreground">{job.vehicle.year}</span>}
                                    <Plate value={job.vehicle.plate} />
                                </div>
                                {job.vehicle.vin && <div className="text-muted-foreground text-[13px]">VIN {job.vehicle.vin}</div>}
                            </Block>
                        )}
                        <Block title={t('Schedule')}>
                            {job.mechanic && (
                                <div className="flex items-center gap-2">
                                    <MechanicAvatar mechanic={job.mechanic} size="sm" />
                                    <span className="font-medium">{job.mechanic.name}</span>
                                </div>
                            )}
                            <div className="text-fg-2 text-[13.5px]">
                                {formatDate(job.start.date, locale)} {job.start.time} → {formatDate(job.end.date, locale)} {job.end.time}
                            </div>
                            <div className="text-muted-foreground text-[13px]">
                                {t('Length')}: {formatDays(job.duration, locale)}
                                {job.duration !== job.planned && ` (${t('planned')} ${formatDays(job.planned, locale)})`}
                            </div>
                        </Block>
                    </Card>

                    {job.log.length > 0 && <History log={job.log} />}
                </div>
            </div>
        </AppLayout>
    );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-1 px-4 py-3.5">
            <h3 className="text-muted-foreground mb-0.5 text-[12.5px] font-medium">{title}</h3>
            {children}
        </section>
    );
}

const th = 'border-line border-y bg-subtle px-3 py-2 text-left text-[12.5px] font-medium text-muted-foreground whitespace-nowrap';
const td = 'border-line border-b px-3 py-2.5 align-middle';

function LinesTable({ lines, locked, billing }: { lines: JobLine[]; locked: boolean; billing: Billing }) {
    const t = useT();
    const [editing, setEditing] = useState<number | null>(null);

    if (lines.length === 0) {
        return (
            <p className="text-muted-foreground border-line border-t px-4 py-5 text-[13.5px]">
                {t('No lines yet. Add the labour and the parts used.')}
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
                <thead>
                    <tr>
                        <th className={th + ' pl-4'}>{t('Description')}</th>
                        <th className={th + ' text-right'}>{t('Qty')}</th>
                        <th className={th}>{t('Unit')}</th>
                        <th className={th + ' text-right'}>{t('Price')}</th>
                        <th className={th + ' text-right'}>{t('Sum')}</th>
                        <th className={th + ' w-[84px] pr-4'} aria-label={t('Actions')} />
                    </tr>
                </thead>
                <tbody>
                    {lines.map((l) =>
                        editing === l.id ? (
                            <EditLineRow key={l.id} line={l} billing={billing} onDone={() => setEditing(null)} />
                        ) : (
                            <LineRow key={l.id} line={l} locked={locked} onEdit={() => setEditing(l.id)} />
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}

function KindLabel({ kind }: { kind: LineKind }) {
    const t = useT();
    return (
        <span
            className={cn(
                'mr-2 inline-block rounded px-1.5 py-px text-[11px] font-medium',
                kind === 'labour' ? 'bg-p-soft text-p-ink' : 'bg-subtle text-fg-2',
            )}
        >
            {kind === 'labour' ? t('Labour') : t('Part')}
        </span>
    );
}

function LineRow({ line, locked, onEdit }: { line: JobLine; locked: boolean; onEdit: () => void }) {
    const t = useT();
    const locale = useLocale();
    const unit = useUnitLabel();
    return (
        <tr className="group">
            <td className={td + ' pl-4'}>
                <KindLabel kind={line.kind} />
                {line.description}
            </td>
            <td className={td + ' text-right'}>{qty(line.quantity, locale)}</td>
            <td className={td + ' text-muted-foreground'}>{unit(line.unit)}</td>
            <td className={td + ' text-right whitespace-nowrap'}>{money(line.unitPrice, locale)}</td>
            <td className={td + ' text-right font-medium whitespace-nowrap'}>{money(line.total, locale)}</td>
            <td className={td + ' pr-4 text-right whitespace-nowrap'}>
                {!locked && (
                    <span className="inline-flex gap-0.5 opacity-60 group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={onEdit}
                            aria-label={t('Edit')}
                            title={t('Edit')}
                            className="hover:bg-subtle grid size-7 place-items-center rounded-md"
                        >
                            <Pencil className="size-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.delete(route('lines.destroy', line.id), opts)}
                            aria-label={t('Remove')}
                            title={t('Remove')}
                            className="text-over-ink hover:bg-over-bg grid size-7 place-items-center rounded-md"
                        >
                            <X className="size-4" />
                        </button>
                    </span>
                )}
            </td>
        </tr>
    );
}

type LineForm = { kind: LineKind; description: string; quantity: string; unit: string; unit_price: string };

function LineInputs({ form, billing, compact }: { form: ReturnType<typeof useForm<LineForm>>; billing: Billing; compact?: boolean }) {
    const t = useT();
    const unit = useUnitLabel();
    const err = form.errors as Partial<Record<keyof LineForm, string>>;
    return (
        <>
            <TextInput
                aria-label={t('Description')}
                placeholder={form.data.kind === 'labour' ? t('e.g. Engine diagnostics') : t('e.g. Oil filter')}
                value={form.data.description}
                aria-invalid={!!err.description}
                onChange={(e) => form.setData('description', e.target.value)}
                className={compact ? 'h-8' : ''}
            />
            <TextInput
                aria-label={t('Qty')}
                inputMode="decimal"
                value={form.data.quantity}
                aria-invalid={!!err.quantity}
                onChange={(e) => form.setData('quantity', e.target.value)}
                className={cn('text-right', compact && 'h-8')}
            />
            <SelectInput
                aria-label={t('Unit')}
                value={form.data.unit}
                onChange={(e) => form.setData('unit', e.target.value)}
                className={compact ? 'h-8' : ''}
            >
                {billing.units.map((u) => (
                    <option key={u} value={u}>
                        {unit(u)}
                    </option>
                ))}
            </SelectInput>
            <TextInput
                aria-label={t('Price, €')}
                inputMode="decimal"
                value={form.data.unit_price}
                aria-invalid={!!err.unit_price}
                onChange={(e) => form.setData('unit_price', e.target.value)}
                className={cn('text-right', compact && 'h-8')}
            />
        </>
    );
}

function EditLineRow({ line, billing, onDone }: { line: JobLine; billing: Billing; onDone: () => void }) {
    const t = useT();
    const form = useForm<LineForm>({
        kind: line.kind,
        description: line.description,
        quantity: String(line.quantity),
        unit: line.unit,
        unit_price: centsToInput(line.unitPrice),
    });
    const save = () => form.patch(route('lines.update', line.id), { ...opts, onSuccess: onDone });
    return (
        <tr className="bg-hover">
            <td colSpan={6} className={td + ' px-4'}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                    className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_80px_90px_100px_auto]"
                >
                    <LineInputs form={form} billing={billing} compact />
                    <span className="flex gap-1">
                        <Button size="sm" variant="primary" type="submit" icon={Check} disabled={form.processing}>
                            {t('Save')}
                        </Button>
                        <Button size="sm" onClick={onDone}>
                            {t('Cancel')}
                        </Button>
                    </span>
                </form>
                <FormErrors errors={form.errors} />
            </td>
        </tr>
    );
}

function AddLine({ jobId, billing }: { jobId: number; billing: Billing }) {
    const t = useT();
    const blank = (kind: LineKind): LineForm => ({
        kind,
        description: '',
        quantity: '1',
        unit: kind === 'labour' ? 'h' : 'pcs',
        unit_price: kind === 'labour' && billing.hourlyRate ? centsToInput(billing.hourlyRate) : '',
    });
    const form = useForm<LineForm>(blank('labour'));

    const setKind = (kind: LineKind) => {
        // Switching the kind resets unit and price to what fits, but keeps a typed description.
        const b = blank(kind);
        form.setData({ ...b, description: form.data.description });
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.post(route('lines.store', jobId), {
                    ...opts,
                    onSuccess: () => form.setData({ ...blank(form.data.kind) }),
                });
            }}
            className="border-line flex flex-col gap-2.5 border-t px-4 py-3.5"
        >
            <div className="flex items-center gap-3">
                <Segmented<LineKind>
                    value={form.data.kind}
                    onChange={setKind}
                    options={[
                        { value: 'labour', label: t('Labour') },
                        { value: 'part', label: t('Part') },
                    ]}
                />
                <span className="text-muted-foreground hidden text-[12.5px] md:inline">
                    {form.data.kind === 'labour' && billing.hourlyRate ? t('Hourly rate from Settings') : t('Add one line per part')}
                </span>
            </div>
            <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_80px_90px_100px_auto]">
                <LineInputs form={form} billing={billing} />
                <Button type="submit" icon={Plus} disabled={form.processing || !form.data.description.trim()}>
                    {t('Add')}
                </Button>
            </div>
            <FormErrors errors={form.errors} />
        </form>
    );
}

function FormErrors({ errors }: { errors: Record<string, string | undefined> }) {
    const list = Object.values(errors).filter(Boolean);
    if (list.length === 0) return null;
    return <p className="text-over-ink mt-1.5 text-[12.5px] font-medium">{list.join(' ')}</p>;
}

function Totals({ totals, billing }: { totals: Props['totals']; billing: Billing }) {
    const t = useT();
    const locale = useLocale();
    const row = 'flex justify-between gap-8';
    return (
        <div className="border-line flex justify-end border-t px-4 py-3.5">
            <dl className="flex w-full max-w-[280px] flex-col gap-1 text-[13.5px]">
                {billing.vatPayer && (
                    <>
                        <div className={row}>
                            <dt className="text-muted-foreground">{t('Without VAT')}</dt>
                            <dd>{money(totals.subtotal, locale)}</dd>
                        </div>
                        <div className={row}>
                            <dt className="text-muted-foreground">{t('VAT :rate%', { rate: billing.vatRate })}</dt>
                            <dd>{money(totals.vat, locale)}</dd>
                        </div>
                    </>
                )}
                <div className={cn(row, 'border-line mt-1 border-t pt-2 text-[15px] font-semibold')}>
                    <dt>{t('Total')}</dt>
                    <dd>{money(totals.total, locale)}</dd>
                </div>
            </dl>
        </div>
    );
}

function InvoiceCard({
    jobId,
    invoice,
    voided,
    billing,
    hasLines,
    total,
}: {
    jobId: number;
    invoice: InvoiceSummary | null;
    voided: InvoiceSummary[];
    billing: Billing;
    hasLines: boolean;
    total: number;
}) {
    const t = useT();
    const locale = useLocale();
    const errors = usePage().props.errors as Record<string, string>;
    const form = useForm({ issued_on: billing.today, due_on: addDays(billing.today, billing.paymentDays) });

    return (
        <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
                <FileText className="text-muted-foreground size-[18px]" strokeWidth={1.8} />
                <h3 className="text-[15px] font-semibold">{t('Invoice')}</h3>
            </div>

            {invoice ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[18px] font-semibold">{invoice.number}</span>
                        <span className="text-[15px] font-semibold">{money(invoice.total, locale)}</span>
                    </div>
                    <dl className="text-[13px]">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t('Issued')}</dt>
                            <dd>{formatDate(invoice.issuedOn, locale, false)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">{t('Pay by')}</dt>
                            <dd>{formatDate(invoice.dueOn, locale, false)}</dd>
                        </div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                        <a href={route('invoices.show', invoice.id)} target="_blank" rel="noopener" className={buttonClasses('default', 'sm')}>
                            <Printer className="size-4" strokeWidth={1.8} />
                            {t('Print or PDF')}
                        </a>
                        <span className="flex-1" />
                        <VoidButton invoiceId={invoice.id} />
                    </div>
                </div>
            ) : !hasLines ? (
                <p className="text-muted-foreground text-[13.5px]">{t('Add the work and parts first. The invoice is made from those lines.')}</p>
            ) : (
                <form
                    className="flex flex-col gap-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(route('invoices.store', jobId), opts);
                    }}
                >
                    <div className="grid grid-cols-2 gap-2.5">
                        <Field label={t('Invoice date')} error={form.errors.issued_on}>
                            <TextInput
                                type="date"
                                value={form.data.issued_on}
                                onChange={(e) =>
                                    form.setData({
                                        issued_on: e.target.value,
                                        due_on: e.target.value ? addDays(e.target.value, billing.paymentDays) : '',
                                    })
                                }
                            />
                        </Field>
                        <Field label={t('Pay by')} error={form.errors.due_on}>
                            <TextInput type="date" value={form.data.due_on} onChange={(e) => form.setData('due_on', e.target.value)} />
                        </Field>
                    </div>
                    {errors.invoice && <p className="text-over-ink text-[12.5px] font-medium">{errors.invoice}</p>}
                    <Button type="submit" variant="primary" icon={ReceiptText} disabled={form.processing}>
                        {t('Issue invoice :n', { n: billing.nextNumber })}
                    </Button>
                    <p className="text-muted-foreground text-[12.5px]">
                        {t('Total :sum. After issuing, the invoice cannot be changed, only voided.', { sum: money(total, locale) })}
                    </p>
                </form>
            )}

            {voided.length > 0 && (
                <div className="border-line mt-4 border-t pt-3">
                    <h4 className="text-muted-foreground mb-1.5 text-[12.5px] font-medium">{t('Voided')}</h4>
                    <ul className="flex flex-col gap-1 text-[13px]">
                        {voided.map((v) => (
                            <li key={v.id} className="flex justify-between gap-2">
                                <a
                                    href={route('invoices.show', v.id)}
                                    target="_blank"
                                    rel="noopener"
                                    className="text-fg-2 line-through hover:underline"
                                >
                                    {v.number}
                                </a>
                                <span className="text-muted-foreground">{v.voidedAt?.slice(0, 10)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

function VoidButton({ invoiceId }: { invoiceId: number }) {
    const t = useT();
    const [armed, setArmed] = useState(false);
    return armed ? (
        <span className="flex gap-1.5">
            <Button size="sm" variant="danger" onClick={() => router.post(route('invoices.void', invoiceId), {}, opts)}>
                {t('Void invoice')}
            </Button>
            <Button size="sm" onClick={() => setArmed(false)}>
                {t('Cancel')}
            </Button>
        </span>
    ) : (
        <Button size="sm" variant="ghost" className="text-over-ink" onClick={() => setArmed(true)}>
            {t('Void')}
        </Button>
    );
}

function History({ log }: { log: Job['log'] }) {
    const t = useT();
    const labels: Record<string, string> = {
        'job.created': t('Booked'),
        'job.moved': t('Moved'),
        'job.move_undone': t('Move undone'),
        'job.duration': t('Duration changed'),
        'job.status': t('Status changed'),
        'job.informed': t('Customer informed'),
        'job.updated': t('Details edited'),
        'job.line_added': t('Line added'),
        'job.line_removed': t('Line removed'),
        'invoice.issued': t('Invoice issued'),
        'invoice.voided': t('Invoice voided'),
    };
    const detail = (l: Job['log'][number]) => {
        const c = l.changes ?? {};
        if (typeof c.invoice === 'string') return c.invoice;
        if (typeof c.description === 'string') return c.description;
        return null;
    };
    return (
        <Card className="p-4">
            <h3 className="mb-3 text-[15px] font-semibold">{t('History')}</h3>
            <ol className="flex flex-col gap-2.5">
                {log.map((l, i) => (
                    <li key={i} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[13px]">
                        <span className="text-muted-foreground">{l.at?.slice(5).replace('-', '.')}</span>
                        <span>
                            <span className="font-medium">{labels[l.action] ?? l.action}</span>
                            {detail(l) && <span className="text-muted-foreground"> · {detail(l)}</span>}
                        </span>
                    </li>
                ))}
            </ol>
        </Card>
    );
}
