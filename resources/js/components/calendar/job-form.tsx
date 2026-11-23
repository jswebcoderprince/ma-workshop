import { SheetSection, SideSheet } from '@/components/side-sheet';
import { Button, Field, MechanicAvatar, Plate, SelectInput, Tag, TextInput } from '@/components/ui-kit';
import { daysLabel, DURATION_PRESETS, getJson, quartersOn, quarterTime, type Check, type Slot } from '@/lib/calendar';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useVehicleLabels, VEHICLE_ICON, VEHICLE_TYPES } from '@/lib/vehicles';
import type { Hours, MechanicView, VehicleType, VehicleView } from '@/types';
import { useForm } from '@inertiajs/react';
import { CalendarCheck, Check as CheckIcon, Minus, Plus, Search, Sparkles, TriangleAlert, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEventHandler } from 'react';

export interface Prefill {
    mechanicId?: number;
    date?: string;
    quarter?: number;
    duration?: number;
    customerId?: number;
}

type Found = { id: number; name: string; phone: string | null; vehicles: VehicleView[] };

const textarea =
    'border-line-strong bg-panel focus:border-p w-full rounded-md border px-3 py-2 text-[14px] outline-none focus:shadow-[0_0_0_3px_var(--p-soft)]';

/** New booking: customer and vehicle (existing or new), work, mechanic, start and length, with a live check. */
export function JobForm({
    open,
    onClose,
    prefill,
    mechanics,
    hours,
    next,
    view,
}: {
    open: boolean;
    onClose: () => void;
    prefill: Prefill;
    mechanics: MechanicView[];
    hours: Hours;
    next: { date: string; quarter: number };
    view: string;
}) {
    const t = useT();
    const locale = useLocale();
    const typeLabel = useVehicleLabels();

    const [customer, setCustomer] = useState<Found | null>(null);
    const [newCustomer, setNewCustomer] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Found[]>([]);
    const [newVehicle, setNewVehicle] = useState(false);
    const [check, setCheck] = useState<Check | null>(null);
    const [slots, setSlots] = useState<Slot[] | null>(null);
    const auto = useRef(!prefill.date);

    const form = useForm({
        customer_id: null as number | null,
        customer: { name: '', phone: '' },
        vehicle_id: null as number | null,
        vehicle: { type: 'car' as VehicleType, make_model: '', year: '', plate: '' },
        mechanic_id: prefill.mechanicId ?? mechanics[0]?.id ?? 0,
        description: '',
        date: prefill.date ?? next.date,
        quarter: prefill.quarter ?? (prefill.date ? 0 : next.quarter),
        duration: prefill.duration ?? 4,
        mileage: '',
        view,
    });
    const d = form.data;
    const errors = form.errors as Record<string, string | undefined>;
    const quarters = quartersOn(hours, d.date);
    const vehicleType: VehicleType | null = d.vehicle_id ? (customer?.vehicles.find((v) => v.id === d.vehicle_id)?.type ?? null) : d.vehicle.type;
    const mechanic = mechanics.find((m) => m.id === d.mechanic_id);

    // Customer given by the page (from a customer's sheet).
    useEffect(() => {
        if (!prefill.customerId) return;
        getJson<Found[]>(route('customers.search', { id: prefill.customerId }))
            .then((r) => r[0] && pick(r[0]))
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill.customerId]);

    // Search as the owner types: name, plate, make or phone.
    useEffect(() => {
        const q = query.trim();
        if (customer || newCustomer || q.length < 2) {
            setResults([]);
            return;
        }
        const ctrl = new AbortController();
        const id = setTimeout(
            () =>
                getJson<Found[]>(route('customers.search', { q }), ctrl.signal)
                    .then(setResults)
                    .catch(() => {}),
            200,
        );
        return () => {
            clearTimeout(id);
            ctrl.abort();
        };
    }, [query, customer, newCustomer]);

    // Live check: where the job ends and whether it clashes with anything.
    useEffect(() => {
        if (!d.mechanic_id) return;
        const ctrl = new AbortController();
        const id = setTimeout(
            () =>
                getJson<Check>(
                    route('calendar.check', { mechanic_id: d.mechanic_id, date: d.date, quarter: d.quarter, duration: d.duration }),
                    ctrl.signal,
                )
                    .then(setCheck)
                    .catch(() => {}),
            150,
        );
        return () => {
            clearTimeout(id);
            ctrl.abort();
        };
    }, [d.mechanic_id, d.date, d.quarter, d.duration]);

    // Earliest free start for this length, per mechanic. Until the owner picks a time or mechanic
    // themselves, the form follows the earliest free start (opened from a clicked cell: never).
    useEffect(() => {
        const ctrl = new AbortController();
        getJson<Slot[]>(route('calendar.slots', { duration: d.duration, type: vehicleType ?? undefined }), ctrl.signal)
            .then((rows) => {
                setSlots(rows);
                const first = rows.find((s) => s.start)?.start;
                const who = rows.find((s) => s.start)?.mechanic.id;
                if (auto.current && first && who) form.setData((data) => ({ ...data, mechanic_id: who, date: first.date, quarter: first.quarter }));
            })
            .catch(() => {});
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [d.duration, vehicleType]);

    function pick(c: Found) {
        setCustomer(c);
        setNewCustomer(false);
        setResults([]);
        setNewVehicle(c.vehicles.length === 0);
        form.setData((data) => ({ ...data, customer_id: c.id, vehicle_id: c.vehicles.length === 1 ? c.vehicles[0].id : null }));
    }

    function clearCustomer() {
        setCustomer(null);
        setNewVehicle(false);
        form.setData((data) => ({ ...data, customer_id: null, vehicle_id: null }));
    }

    function startNewCustomer() {
        const q = query.trim();
        const isPhone = q !== '' && !/[a-zA-Z]/.test(q);
        setNewCustomer(true);
        setNewVehicle(true);
        setResults([]);
        form.setData((data) => ({ ...data, customer_id: null, vehicle_id: null, customer: { name: isPhone ? '' : q, phone: isPhone ? q : '' } }));
    }

    const setDate = (date: string) => {
        auto.current = false;
        form.setData((data) => ({ ...data, date, quarter: Math.min(data.quarter, Math.max(0, quartersOn(hours, date) - 1)) }));
    };
    const setDuration = (n: number) => form.setData('duration', Math.max(1, Math.min(40, n)));
    const mine = slots?.find((s) => s.mechanic.id === d.mechanic_id);
    const best = slots?.find((s) => s.start);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            customer: data.customer_id ? null : data.customer,
            vehicle_id: newVehicle ? null : data.vehicle_id,
            vehicle: newVehicle || !data.vehicle_id ? data.vehicle : null,
        }));
        form.post(route('jobs.store'), { preserveScroll: true, onSuccess: onClose });
    };

    const canSubmit =
        !form.processing &&
        (customer || (newCustomer && d.customer.name.trim())) &&
        (newVehicle ? d.vehicle.make_model.trim() : d.vehicle_id) &&
        d.description.trim() &&
        quarters > 0;

    return (
        <SideSheet
            open={open}
            onClose={onClose}
            eyebrow={
                <>
                    <CalendarCheck className="size-4" /> {t('New job')}
                </>
            }
            title={t('Book a job')}
            footer={
                <>
                    <Button type="submit" form="job-form" variant="primary" icon={CheckIcon} disabled={!canSubmit}>
                        {t('Book')}
                    </Button>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                </>
            }
        >
            <form id="job-form" onSubmit={submit} className="flex flex-col gap-5">
                {/* 1. customer */}
                <SheetSection title={t('Customer')}>
                    {customer ? (
                        <div className="border-p-line bg-p-soft/40 flex items-center gap-3 rounded-lg border p-3">
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold">{customer.name}</div>
                                <div className="text-muted-foreground font-mono text-[12px]">{customer.phone}</div>
                            </div>
                            <button
                                type="button"
                                onClick={clearCustomer}
                                className="text-muted-foreground hover:text-fg rounded-md p-1"
                                aria-label={t('Change')}
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : newCustomer ? (
                        <div className="flex flex-col gap-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label={t('Name')} error={errors['customer.name']}>
                                    <TextInput
                                        autoFocus
                                        value={d.customer.name}
                                        onChange={(e) => form.setData('customer', { ...d.customer, name: e.target.value })}
                                    />
                                </Field>
                                <Field label={t('Phone')} error={errors['customer.phone']}>
                                    <TextInput
                                        inputMode="tel"
                                        value={d.customer.phone}
                                        onChange={(e) => form.setData('customer', { ...d.customer, phone: e.target.value })}
                                    />
                                </Field>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNewCustomer(false)}
                                className="text-p self-start text-[12.5px] font-semibold hover:underline"
                            >
                                {t('Pick an existing customer instead')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <TextInput
                                    autoFocus
                                    className="pl-9"
                                    placeholder={t('Name, phone, plate or make')}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                            {results.length > 0 && (
                                <div className="border-line divide-line divide-y overflow-hidden rounded-lg border">
                                    {results.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => pick(c)}
                                            className="hover:bg-subtle flex w-full items-center gap-3 px-3 py-2 text-left"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13.5px] font-semibold">{c.name}</span>
                                                <span className="text-muted-foreground block truncate text-[12px]">
                                                    {c.phone} {c.vehicles.length > 0 && `· ${c.vehicles.map((v) => v.make).join(', ')}`}
                                                </span>
                                            </span>
                                            {c.vehicles[0]?.plate && <Plate value={c.vehicles[0].plate} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {query.trim().length >= 2 && results.length === 0 && (
                                <p className="text-muted-foreground text-[12.5px]">{t('No customer found.')}</p>
                            )}
                            <Button size="sm" icon={UserPlus} className="self-start" onClick={startNewCustomer}>
                                {t('New customer')}
                            </Button>
                        </div>
                    )}
                </SheetSection>

                {/* 2. vehicle */}
                {(customer || newCustomer) && (
                    <SheetSection title={t('Vehicle')}>
                        {customer && customer.vehicles.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {customer.vehicles.map((v) => {
                                    const Icon = VEHICLE_ICON[v.type];
                                    const on = !newVehicle && d.vehicle_id === v.id;
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => {
                                                setNewVehicle(false);
                                                form.setData('vehicle_id', v.id);
                                            }}
                                            className={cn(
                                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px]',
                                                on ? 'border-p bg-p-soft/50 text-fg' : 'border-line bg-panel hover:bg-subtle',
                                            )}
                                        >
                                            <Icon className="text-muted-foreground size-4" />
                                            <span className="font-semibold">{v.make}</span>
                                            {v.plate && <Plate value={v.plate} />}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    aria-pressed={newVehicle}
                                    onClick={() => setNewVehicle(true)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-[13px] font-semibold',
                                        newVehicle ? 'border-p text-p' : 'border-line-strong text-fg-2 hover:bg-subtle',
                                    )}
                                >
                                    <Plus className="size-4" /> {t('Another vehicle')}
                                </button>
                            </div>
                        )}
                        {newVehicle && (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {VEHICLE_TYPES.map((type) => {
                                        const Icon = VEHICLE_ICON[type];
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                aria-pressed={d.vehicle.type === type}
                                                onClick={() => form.setData('vehicle', { ...d.vehicle, type })}
                                                className={cn(
                                                    'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-semibold',
                                                    d.vehicle.type === type
                                                        ? 'border-p bg-p text-white'
                                                        : 'border-line bg-panel text-fg-2 hover:bg-subtle',
                                                )}
                                            >
                                                <Icon className="size-4" /> {typeLabel(type)}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-[1fr_90px] gap-3">
                                    <Field label={t('Make and model')} error={errors['vehicle.make_model']}>
                                        <TextInput
                                            value={d.vehicle.make_model}
                                            onChange={(e) => form.setData('vehicle', { ...d.vehicle, make_model: e.target.value })}
                                        />
                                    </Field>
                                    <Field label={t('Year')} error={errors['vehicle.year']}>
                                        <TextInput
                                            inputMode="numeric"
                                            value={d.vehicle.year}
                                            onChange={(e) =>
                                                form.setData('vehicle', { ...d.vehicle, year: e.target.value.replace(/\D/g, '').slice(0, 4) })
                                            }
                                        />
                                    </Field>
                                </div>
                                <Field label={t('Plate')} error={errors['vehicle.plate']}>
                                    <TextInput
                                        className="font-mono uppercase"
                                        value={d.vehicle.plate}
                                        onChange={(e) => form.setData('vehicle', { ...d.vehicle, plate: e.target.value })}
                                    />
                                </Field>
                            </div>
                        )}
                        {errors.vehicle_id && <p className="text-over-ink mt-2 text-[12px]">{errors.vehicle_id}</p>}
                    </SheetSection>
                )}

                {/* 3. work */}
                <SheetSection title={t('Work')}>
                    <div className="flex flex-col gap-3">
                        <Field label={t('Work to be done')} error={errors.description}>
                            <textarea
                                rows={3}
                                className={textarea}
                                value={d.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                        </Field>
                        <Field label={t('Mileage, km')} error={errors.mileage} className="max-w-[180px]">
                            <TextInput
                                inputMode="numeric"
                                value={d.mileage}
                                onChange={(e) => form.setData('mileage', e.target.value.replace(/\D/g, ''))}
                            />
                        </Field>
                    </div>
                </SheetSection>

                {/* 4. when and who */}
                <SheetSection title={t('When and who')}>
                    <div className="flex flex-col gap-3">
                        <Field label={t('Length')}>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {DURATION_PRESETS.map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        aria-pressed={d.duration === n}
                                        onClick={() => setDuration(n)}
                                        className={cn(
                                            'h-8 min-w-[46px] rounded-md border px-2 font-mono text-[12px] font-semibold',
                                            d.duration === n ? 'border-p bg-p text-white' : 'border-line bg-panel text-fg-2 hover:bg-subtle',
                                        )}
                                    >
                                        {daysLabel(n)}
                                    </button>
                                ))}
                                <span className="border-line ml-1 inline-flex items-center rounded-md border">
                                    <button
                                        type="button"
                                        aria-label={t('Shorter')}
                                        onClick={() => setDuration(d.duration - 1)}
                                        className="hover:bg-subtle grid size-8 place-items-center"
                                    >
                                        <Minus className="size-3.5" />
                                    </button>
                                    <span className="min-w-[52px] text-center font-mono text-[12.5px] font-bold">{daysLabel(d.duration)}</span>
                                    <button
                                        type="button"
                                        aria-label={t('Longer')}
                                        onClick={() => setDuration(d.duration + 1)}
                                        className="hover:bg-subtle grid size-8 place-items-center"
                                    >
                                        <Plus className="size-3.5" />
                                    </button>
                                </span>
                            </div>
                        </Field>

                        <Field label={t('Mechanic')} error={errors.mechanic_id}>
                            <SelectInput
                                value={d.mechanic_id}
                                onChange={(e) => {
                                    auto.current = false;
                                    form.setData('mechanic_id', Number(e.target.value));
                                }}
                            >
                                {mechanics.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                        {vehicleType && !m.vehicleTypes.includes(vehicleType)
                                            ? ` (${t('not :type', { type: typeLabel(vehicleType).toLowerCase() })})`
                                            : ''}
                                    </option>
                                ))}
                            </SelectInput>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t('Date')} error={errors.date}>
                                <TextInput type="date" required value={d.date} onChange={(e) => e.target.value && setDate(e.target.value)} />
                            </Field>
                            <Field label={t('From')} error={errors.quarter}>
                                <SelectInput
                                    value={d.quarter}
                                    disabled={quarters === 0}
                                    onChange={(e) => {
                                        auto.current = false;
                                        form.setData('quarter', Number(e.target.value));
                                    }}
                                >
                                    {quarters === 0 && <option value={0}>{t('Closed')}</option>}
                                    {Array.from({ length: quarters }, (_, q) => (
                                        <option key={q} value={q}>
                                            {quarterTime(hours, d.date, q)}
                                        </option>
                                    ))}
                                </SelectInput>
                            </Field>
                        </div>

                        {/* earliest free time */}
                        {slots && (
                            <div className="border-open-line bg-open-bg/60 text-open-ink flex flex-col gap-1.5 rounded-lg border p-3 text-[12.5px]">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Sparkles className="size-4" /> {t('Earliest free time for :length', { length: daysLabel(d.duration) })}
                                </span>
                                {[mine, best && best.mechanic.id !== d.mechanic_id ? best : undefined]
                                    .filter((s): s is Slot => !!s)
                                    .map((s) => (
                                        <span key={s.mechanic.id} className="flex items-center gap-2">
                                            <MechanicAvatar mechanic={s.mechanic} size="sm" />
                                            <span className="min-w-0 flex-1">
                                                <b>{s.mechanic.name}</b>:{' '}
                                                {s.start
                                                    ? `${formatDate(s.start.date, locale)} ${s.start.time}`
                                                    : t('nothing free in the next weeks')}
                                            </span>
                                            {s.start && (
                                                <Button
                                                    size="sm"
                                                    variant="soft"
                                                    onClick={() => {
                                                        auto.current = false;
                                                        form.setData((data) => ({
                                                            ...data,
                                                            mechanic_id: s.mechanic.id,
                                                            date: s.start!.date,
                                                            quarter: s.start!.quarter,
                                                        }));
                                                    }}
                                                >
                                                    {t('Use')}
                                                </Button>
                                            )}
                                        </span>
                                    ))}
                            </div>
                        )}

                        {/* live check */}
                        {check && (
                            <div
                                className={cn(
                                    'flex items-start gap-2 rounded-lg border p-3 text-[13px]',
                                    !check.valid
                                        ? 'border-over-line bg-over-bg text-over-ink'
                                        : check.warning
                                          ? 'border-parts-line bg-parts-bg/60 text-parts-ink'
                                          : 'border-ok-line bg-ok-soft text-ok-ink',
                                )}
                            >
                                {check.valid && !check.warning ? (
                                    <CheckIcon className="mt-0.5 size-4 shrink-0" />
                                ) : (
                                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                                )}
                                <span>
                                    {!check.valid ? (
                                        t('The workshop is closed at that time.')
                                    ) : (
                                        <>
                                            <b>{mechanic?.name}</b> · {formatDate(d.date, locale)} {quarterTime(hours, d.date, d.quarter)} →{' '}
                                            {check.end && `${formatDate(check.end.date, locale)} ${check.end.time}`}
                                            {check.warning && (
                                                <span className="mt-1 block">
                                                    <Tag tone="parts">{check.warning === 'overlap' ? t('Overlap') : t('Mechanic off')}</Tag>{' '}
                                                    {check.warning === 'overlap'
                                                        ? t('It overlaps another job. You can still book it; nothing will be moved.')
                                                        : t('The mechanic is off during part of this time.')}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </SheetSection>
            </form>
        </SideSheet>
    );
}
