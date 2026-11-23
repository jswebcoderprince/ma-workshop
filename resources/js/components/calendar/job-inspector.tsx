import { ConfirmButton } from '@/components/confirm-button';
import { useStatusLabel } from '@/components/job-table';
import { Button, buttonClasses, ButtonLink, DurationChip, Field, MechanicAvatar, Plate, SelectInput, Tag, TextInput } from '@/components/ui-kit';
import { daysLabel, quartersOn, quarterTime } from '@/lib/calendar';
import { formatDate, formatShortDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Hours, JobDetail, JobStatus, MechanicView } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    CircleCheck,
    MoveLeft,
    MoveRight,
    Pencil,
    Phone,
    PhoneCall,
    Printer,
    ReceiptText,
    Sparkles,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const opts = { preserveScroll: true, preserveState: true };

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[12px] font-semibold">{title}</span>
                {action}
            </div>
            {children}
        </section>
    );
}

/** Everything about one job, and every change the owner can make to it. */
export function JobInspector({
    job,
    mechanics,
    hours,
    context,
    onClose,
}: {
    job: JobDetail;
    mechanics: MechanicView[];
    hours: Hours;
    /** The calendar's view, date and filter, so deleting returns to the same board. */
    context: { view: string; date: string; mechanic: number | null };
    onClose: () => void;
}) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const errors = usePage().props.errors as Record<string, string>;
    const [moving, setMoving] = useState(false);
    const [editing, setEditing] = useState(false);
    const extended = job.duration - job.planned;

    const post = (name: string, data: Record<string, unknown> = {}) => router.post(route(name, job.id), data as never, opts);
    const logLabel: Record<string, string> = {
        'job.created': t('Booked'),
        'job.moved': t('Moved'),
        'job.duration': t('Duration changed'),
        'job.status': t('Status changed'),
        'job.informed': t('Customer informed'),
        'job.updated': t('Details edited'),
    };

    return (
        <div className="flex h-full flex-col">
            {/* header */}
            <div className="border-line bg-subtle/70 flex items-start justify-between gap-3 border-b p-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {job.warning ? (
                            <Tag tone="parts" icon={TriangleAlert}>
                                {job.warning === 'overlap' ? t('Overlap') : t('Mechanic off')}
                            </Tag>
                        ) : (
                            <Tag tone={job.status === 'completed' ? 'ok' : job.status === 'waiting_parts' ? 'hold' : 'p'}>{status(job.status)}</Tag>
                        )}
                        <span className="text-muted-foreground font-mono text-[11.5px] font-bold">
                            #{job.number} · {job.mechanic?.name}
                        </span>
                    </div>
                    <h3 className="mt-1.5 text-[15px] leading-snug font-bold">{job.description}</h3>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('Close')}
                    className="text-muted-foreground hover:bg-line/60 hover:text-fg rounded-md p-1.5"
                >
                    <X className="size-[18px]" />
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 text-[13px]">
                {(errors.date || errors.job || errors.mechanic_id) && (
                    <div className="bg-over-bg text-over-ink rounded-lg px-3 py-2">{errors.date || errors.job || errors.mechanic_id}</div>
                )}

                {/* vehicle & client */}
                <div className="border-line bg-subtle/60 flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[12px] font-semibold">{t('Vehicle & customer')}</span>
                        <Plate value={job.vehicle?.plate} />
                    </div>
                    <div className="text-[13.5px] font-bold">
                        {job.vehicle?.make} {job.vehicle?.year && <span className="text-muted-foreground font-medium">{job.vehicle.year}</span>}
                    </div>
                    <div className="border-line flex items-center justify-between border-t pt-2">
                        <span className="font-semibold">{job.customer.name}</span>
                        {job.customer.phone && (
                            <a
                                href={`tel:${job.customer.phone.replace(/\s/g, '')}`}
                                title={t('Call')}
                                className="border-line bg-panel text-fg-2 hover:text-p flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11.5px] shadow-sm"
                            >
                                <Phone className="size-3.5" />
                                {job.customer.phone}
                            </a>
                        )}
                    </div>
                    {(job.vehicle?.vin || job.mileage) && (
                        <div className="text-muted-foreground flex justify-between font-mono text-[11px]">
                            <span>{job.vehicle?.vin && `VIN ${job.vehicle.vin}`}</span>
                            <span>{job.mileage ? `${job.mileage.toLocaleString(locale === 'lt' ? 'lt-LT' : 'en-GB')} km` : ''}</span>
                        </div>
                    )}
                </div>

                {/* customer to call */}
                {job.notify && (
                    <div className="border-over-line bg-over-bg/60 flex flex-col gap-2 rounded-lg border p-3">
                        <div className="text-over-ink flex items-center gap-2 font-bold">
                            <PhoneCall className="size-4" />
                            {job.notify === 'earlier' ? t('Moved earlier: offer the new date') : t('Moved later: tell the customer')}
                        </div>
                        <div className="flex gap-2">
                            {job.customer.phone && (
                                <a
                                    href={`tel:${job.customer.phone.replace(/\s/g, '')}`}
                                    className="bg-over flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-semibold text-white hover:brightness-110"
                                >
                                    <Phone className="size-4" /> {t('Call')}
                                </a>
                            )}
                            <Button size="sm" icon={Check} className="flex-1" onClick={() => post('jobs.informed')}>
                                {t('Mark informed')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* overlap warning */}
                {job.warning && (
                    <div className="border-parts-line bg-parts-bg/60 text-parts-ink flex gap-2 rounded-lg border p-3">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>
                            {job.warning === 'overlap'
                                ? t('Overlaps another job of this mechanic. Nothing was moved; move one of them if needed.')
                                : t('The mechanic is off during part of this job.')}
                        </span>
                    </div>
                )}

                {/* mechanic */}
                <Section
                    title={t('Assigned mechanic')}
                    action={
                        <button type="button" onClick={() => setMoving((v) => !v)} className="text-p text-[12px] font-bold hover:underline">
                            {moving ? t('Cancel') : t('Reassign or move')}
                        </button>
                    }
                >
                    <div className="border-line flex items-center gap-2.5 rounded-lg border p-2.5">
                        {job.mechanic && <MechanicAvatar mechanic={job.mechanic} size="sm" />}
                        <span className="font-bold">{job.mechanic?.name}</span>
                    </div>
                    {moving && <MoveForm job={job} mechanics={mechanics} hours={hours} onDone={() => setMoving(false)} />}
                </Section>

                {/* timing */}
                <Section title={t('Schedule')}>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="border-line bg-subtle/60 rounded-lg border p-2.5">
                            <span className="text-muted-foreground block text-[10.5px] font-medium">{t('Start')}</span>
                            <span className="mt-1 block font-mono text-[12.5px] font-bold">{formatShortDate(job.start.date, locale)}</span>
                            <span className="font-mono text-[12px]">{job.start.time}</span>
                        </div>
                        <div
                            className={cn('rounded-lg border p-2.5', extended > 0 ? 'border-parts-line bg-parts-bg/60' : 'border-line bg-subtle/60')}
                        >
                            <span className={cn('block text-[10.5px] font-medium', extended > 0 ? 'text-parts-ink' : 'text-muted-foreground')}>
                                {t('End')}
                            </span>
                            <span className="mt-1 block font-mono text-[12.5px] font-bold">{formatShortDate(job.end.date, locale)}</span>
                            <span className="font-mono text-[12px]">{job.end.time}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[12px]">
                            {t('Planned')}: <span className="font-mono">{daysLabel(job.planned)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <DurationChip quarters={job.duration} />
                            {extended !== 0 && (
                                <Tag tone={extended > 0 ? 'parts' : 'ok'}>
                                    {extended > 0 ? '+' : '−'}
                                    {daysLabel(Math.abs(extended))}
                                </Tag>
                            )}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            [-1, '−¼'],
                            [1, '+¼'],
                            [2, '+½'],
                            [4, '+1d'],
                            [8, '+2d'],
                        ].map(([delta, label]) => (
                            <Button
                                key={label}
                                size="sm"
                                disabled={delta === -1 && job.duration <= 1}
                                onClick={() => post('jobs.duration', { delta })}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-[11.5px]">
                        {t('Changing the length never moves other jobs. Overlaps are shown as warnings.')}
                    </p>
                </Section>

                {/* status */}
                <Section title={t('Status')}>
                    <div className="grid grid-cols-2 gap-1.5">
                        {(['scheduled', 'in_progress', 'waiting_parts', 'completed'] as JobStatus[]).map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={job.status === s}
                                onClick={() => job.status !== s && post('jobs.status', { status: s })}
                                className={cn(
                                    'h-8 rounded-md border text-[12px] font-semibold',
                                    job.status === s ? 'border-p bg-p text-white' : 'border-line bg-panel text-fg-2 hover:bg-subtle',
                                )}
                            >
                                {status(s)}
                            </button>
                        ))}
                    </div>
                    {job.status === 'in_progress' && (
                        <Button
                            size="sm"
                            variant="soft"
                            icon={CircleCheck}
                            onClick={() => post('jobs.status', { status: 'completed', finish_now: true })}
                        >
                            {t('Completed now (frees the rest of the time)')}
                        </Button>
                    )}
                </Section>

                {/* could start earlier */}
                {job.earlier && (
                    <div className="border-open-line bg-open-bg/70 flex flex-col gap-2 rounded-lg border p-3">
                        <div className="text-open-ink flex items-center gap-2 font-bold">
                            <Sparkles className="size-4" />
                            {t('Could start earlier')}
                        </div>
                        <p className="text-open-ink">
                            {job.mechanic?.name} {t('is free from')} <b>{`${formatDate(job.earlier.date, locale)} ${job.earlier.time}`}</b>.
                        </p>
                        <Button
                            size="sm"
                            variant="primary"
                            icon={MoveLeft}
                            onClick={() =>
                                post('jobs.move', { mechanic_id: job.mechanic?.id, date: job.earlier!.date, quarter: job.earlier!.quarter })
                            }
                        >
                            {t('Move to :when', { when: `${formatShortDate(job.earlier.date, locale)} ${job.earlier.time}` })}
                        </Button>
                    </div>
                )}

                {/* details */}
                <Section
                    title={t('Work to be done')}
                    action={
                        !editing && (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="text-p flex items-center gap-1 text-[12px] font-bold hover:underline"
                            >
                                <Pencil className="size-3.5" /> {t('Edit')}
                            </button>
                        )
                    }
                >
                    {editing ? (
                        <DetailsForm job={job} onDone={() => setEditing(false)} />
                    ) : (
                        <p className="text-fg-2 whitespace-pre-line">{job.description}</p>
                    )}
                </Section>

                {/* history */}
                {job.log.length > 0 && (
                    <Section title={t('History')}>
                        <div className="border-line ml-1.5 flex flex-col gap-2.5 border-l-2 py-1 pl-3">
                            {job.log.map((l, i) => (
                                <div key={i} className="relative">
                                    <span className="bg-p absolute top-1.5 -left-[17px] size-2 rounded-full" />
                                    <span className="text-muted-foreground block font-mono text-[11px]">{l.at}</span>
                                    <span className="text-[12.5px] font-semibold">{logLabel[l.action] ?? l.action}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}
            </div>

            {/* action dock */}
            <div className="border-line bg-subtle/70 flex items-center gap-2 border-t p-3">
                <Button size="sm" icon={MoveRight} onClick={() => setMoving(true)}>
                    {t('Move')}
                </Button>
                <ButtonLink size="sm" href={route('jobs.show', job.id)} icon={ReceiptText}>
                    {t('Parts & invoice')}
                </ButtonLink>
                <a
                    href={route('jobs.card', job.id)}
                    target="_blank"
                    rel="noopener"
                    className={buttonClasses('ghost', 'sm')}
                    title={t('Job card')}
                    aria-label={t('Job card')}
                >
                    <Printer className="size-4" strokeWidth={1.8} />
                </a>
                <span className="flex-1" />
                <ConfirmButton
                    size="sm"
                    onConfirm={() =>
                        router.delete(
                            route('jobs.destroy', {
                                workOrder: job.id,
                                view: context.view,
                                date: context.date,
                                mechanic: context.mechanic ?? undefined,
                            }),
                            {
                                preserveScroll: true,
                            },
                        )
                    }
                >
                    {t('Delete')}
                </ConfirmButton>
            </div>
        </div>
    );
}

function MoveForm({ job, mechanics, hours, onDone }: { job: JobDetail; mechanics: MechanicView[]; hours: Hours; onDone: () => void }) {
    const t = useT();
    const form = useForm({ mechanic_id: job.mechanic?.id ?? mechanics[0]?.id, date: job.start.date, quarter: job.start.quarter });
    const q = quartersOn(hours, form.data.date);

    return (
        <div className="border-p-line bg-p-soft/40 mt-1 flex flex-col gap-2.5 rounded-lg border p-3">
            <Field label={t('Mechanic')}>
                <SelectInput value={form.data.mechanic_id} onChange={(e) => form.setData('mechanic_id', Number(e.target.value))}>
                    {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </SelectInput>
            </Field>
            <div className="grid grid-cols-2 gap-2">
                <Field label={t('Date')} error={form.errors.date}>
                    <TextInput
                        type="date"
                        value={form.data.date}
                        onChange={(e) => form.setData((d) => ({ ...d, date: e.target.value, quarter: 0 }))}
                    />
                </Field>
                <Field label={t('From')}>
                    <SelectInput value={form.data.quarter} onChange={(e) => form.setData('quarter', Number(e.target.value))} disabled={q === 0}>
                        {q === 0 && <option value={0}>{t('Closed')}</option>}
                        {Array.from({ length: q }, (_, i) => (
                            <option key={i} value={i}>
                                {quarterTime(hours, form.data.date, i)}
                            </option>
                        ))}
                    </SelectInput>
                </Field>
            </div>
            <p className="text-muted-foreground text-[11.5px]">{t('A new date marks the customer to call. Other jobs stay where they are.')}</p>
            <Button
                size="sm"
                variant="primary"
                icon={ArrowRight}
                disabled={form.processing || q === 0}
                onClick={() => form.post(route('jobs.move', job.id), { ...opts, onSuccess: onDone })}
            >
                {t('Move')}
            </Button>
        </div>
    );
}

export function DetailsForm({
    job,
    onDone,
}: {
    job: Pick<JobDetail, 'id' | 'description' | 'mileage'> & { vehicle: { id: number } | null };
    onDone: () => void;
}) {
    const t = useT();
    const form = useForm({ description: job.description, mileage: job.mileage ?? '', vehicle_id: job.vehicle?.id ?? null });
    return (
        <div className="flex flex-col gap-2.5">
            <Field label={t('Work to be done')} error={form.errors.description}>
                <textarea
                    rows={3}
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    className="border-line-strong bg-panel focus:border-p w-full rounded-md border px-3 py-2 outline-none focus:shadow-[0_0_0_3px_var(--p-soft)]"
                />
            </Field>
            <Field label={t('Mileage, km')} error={form.errors.mileage}>
                <TextInput
                    inputMode="numeric"
                    value={form.data.mileage}
                    onChange={(e) => form.setData('mileage', e.target.value.replace(/\D/g, ''))}
                />
            </Field>
            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="primary"
                    icon={Check}
                    disabled={form.processing}
                    onClick={() => form.patch(route('jobs.update', job.id), { ...opts, onSuccess: onDone })}
                >
                    {t('Save')}
                </Button>
                <Button size="sm" onClick={onDone}>
                    {t('Cancel')}
                </Button>
            </div>
        </div>
    );
}
