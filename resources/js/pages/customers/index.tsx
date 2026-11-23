import { ConfirmButton } from '@/components/confirm-button';
import { useStatusLabel } from '@/components/job-table';
import { SheetSection, SideSheet } from '@/components/side-sheet';
import { Button, ButtonLink, Card, CardHeader, CustomerAvatar, EmptyState, Field, Plate, Segmented, StatusDot, TextInput } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { VEHICLE_ICON, VEHICLE_TYPES, useVehicleLabels } from '@/lib/vehicles';
import type { JobStatus, VehicleType, VehicleView } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, Mail, Pencil, Phone, Plus, Search, Users, Wrench } from 'lucide-react';
import { useEffect, useRef, useState, type FormEventHandler } from 'react';

type Row = { id: number; name: string; phone: string | null; email: string | null; vehicles: VehicleView[]; jobs: number; nextVisit: string | null };
type Detail = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    company_code: string | null;
    vat_code: string | null;
    address: string | null;
    notes: string | null;
    vehicles: VehicleView[];
    jobs: { id: number; number: string; description: string; status: JobStatus; date: string; mechanic: string | null; vehicle: string | null }[];
    canDelete: boolean;
};
interface Props {
    filters: { q: string };
    customers: { data: Row[]; total: number; from: number | null; to: number | null; prev: string | null; next: string | null };
    selected: Detail | null;
}

/** Change one query parameter and reload only what is needed, keeping the rest of the page as it is. */
function visitWith(param: string, value: string | number | null, only: string[]) {
    const url = new URL(window.location.href);
    if (value === null || value === '') url.searchParams.delete(param);
    else url.searchParams.set(param, String(value));
    if (param === 'q') url.searchParams.delete('page');
    router.get(url.pathname + url.search, {}, { only, preserveState: true, preserveScroll: true, replace: param === 'q' });
}

export default function Customers({ filters, customers, selected }: Props) {
    const t = useT();
    const locale = useLocale();
    const typeLabel = useVehicleLabels();
    const [q, setQ] = useState(filters.q);
    const [creating, setCreating] = useState(false);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const id = setTimeout(() => visitWith('q', q.trim(), ['customers', 'filters']), 300);
        return () => clearTimeout(id);
    }, [q]);

    const open = (id: number) => visitWith('customer', id, ['selected']);

    return (
        <AppLayout
            title={t('Customers')}
            actions={
                <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                    <span className="hidden md:inline">{t('Add customer')}</span>
                </Button>
            }
        >
            <Card>
                <CardHeader title={t('Customers')} sub={customers.total}>
                    <label className="relative w-full md:w-[320px]">
                        <Search className="text-muted-foreground absolute top-[11px] left-3 size-4" strokeWidth={1.7} />
                        <TextInput
                            type="search"
                            className="h-[38px] pl-9"
                            placeholder={t('Name, phone or plate')}
                            aria-label={t('Search customers, phones, plates')}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </label>
                </CardHeader>
                {customers.data.length === 0 ? (
                    <EmptyState icon={Users} title={filters.q ? t('No customers match “:q”', { q: filters.q }) : t('No customers yet')}>
                        {filters.q
                            ? t('Try part of the name, the phone number or the plate.')
                            : t('Customers are added when you book a job, or here.')}
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-subtle text-muted-foreground text-left text-[13.5px]">
                                    <th className="border-line border-y py-3 pr-3.5 pl-5 font-medium">{t('Customer')}</th>
                                    <th className="border-line border-y px-3.5 py-3 font-medium">{t('Phone')}</th>
                                    <th className="border-line border-y px-3.5 py-3 font-medium">{t('Vehicles')}</th>
                                    <th className="border-line border-y px-3.5 py-3 font-medium">{t('Jobs')}</th>
                                    <th className="border-line border-y py-3 pr-5 pl-3.5 font-medium">{t('Next visit')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.data.map((c) => {
                                    const v = c.vehicles[0];
                                    const Icon = v ? VEHICLE_ICON[v.type] : null;
                                    return (
                                        <tr
                                            key={c.id}
                                            tabIndex={0}
                                            onClick={() => open(c.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && open(c.id)}
                                            className="hover:bg-hover cursor-pointer [&:last-child>td]:border-b-0"
                                        >
                                            <td className="border-line border-b py-3 pr-3.5 pl-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <CustomerAvatar name={c.name} size="sm" />
                                                    <span className="font-medium">{c.name}</span>
                                                </div>
                                            </td>
                                            <td className="border-line border-b px-3.5 py-3 whitespace-nowrap tabular-nums">
                                                {c.phone ?? <span className="text-faint">—</span>}
                                            </td>
                                            <td className="border-line border-b px-3.5 py-3 whitespace-nowrap">
                                                {v && Icon ? (
                                                    <div className="flex items-center gap-2" title={typeLabel(v.type)}>
                                                        <Icon className="text-muted-foreground size-4" strokeWidth={1.7} />
                                                        {v.make}
                                                        <Plate value={v.plate} />
                                                        {c.vehicles.length > 1 && (
                                                            <span className="text-muted-foreground text-[13px]">+{c.vehicles.length - 1}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-faint">—</span>
                                                )}
                                            </td>
                                            <td className="border-line border-b px-3.5 py-3 tabular-nums">{c.jobs}</td>
                                            <td className="border-line border-b py-3 pr-5 pl-3.5 whitespace-nowrap tabular-nums">
                                                {c.nextVisit ? formatDate(c.nextVisit, locale) : <span className="text-faint">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {customers.total > 0 && (
                    <div className="border-line text-muted-foreground flex items-center gap-2 border-t px-5 py-3 text-[13.5px]">
                        <span>{t(':from–:to of :total', { from: customers.from ?? 0, to: customers.to ?? 0, total: customers.total })}</span>
                        <span className="flex-1" />
                        {customers.prev && (
                            <Link
                                href={customers.prev}
                                preserveScroll
                                className="hover:bg-hover grid size-8 place-items-center rounded-lg"
                                aria-label={t('Previous page')}
                            >
                                <ChevronLeft className="size-4" />
                            </Link>
                        )}
                        {customers.next && (
                            <Link
                                href={customers.next}
                                preserveScroll
                                className="hover:bg-hover grid size-8 place-items-center rounded-lg"
                                aria-label={t('Next page')}
                            >
                                <ChevronRight className="size-4" />
                            </Link>
                        )}
                    </div>
                )}
            </Card>

            {selected && <CustomerSheet customer={selected} onClose={() => visitWith('customer', null, ['selected'])} />}
            {creating && <NewCustomerSheet onClose={() => setCreating(false)} />}
        </AppLayout>
    );
}

type CustomerFields = { name: string; phone: string; email: string; company_code: string; vat_code: string; address: string; notes: string };

function CustomerFieldsForm({
    data,
    errors,
    set,
    idPrefix,
}: {
    data: CustomerFields;
    errors: Record<string, string | undefined>;
    set: (key: keyof CustomerFields, value: string) => void;
    idPrefix: string;
}) {
    const t = useT();
    const [showCompany, setShowCompany] = useState(Boolean(data.company_code || data.vat_code || data.address));
    const input = (key: keyof CustomerFields, extra: Record<string, unknown> = {}) => (
        <TextInput
            id={`${idPrefix}-${key}`}
            name={key}
            value={data[key] ?? ''}
            aria-invalid={!!errors[key]}
            onChange={(e) => set(key, e.target.value)}
            {...extra}
        />
    );

    return (
        <div className="flex flex-col gap-4">
            <Field label={t('Full name or company')} error={errors.name}>
                {input('name', { required: true, autoFocus: true })}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('Phone')} error={errors.phone}>
                    {input('phone', { type: 'tel', placeholder: '+370' })}
                </Field>
                <Field label={t('Email')} error={errors.email}>
                    {input('email', { type: 'email' })}
                </Field>
            </div>
            {showCompany ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label={t('Company code')} error={errors.company_code}>
                            {input('company_code')}
                        </Field>
                        <Field label={t('VAT code')} error={errors.vat_code}>
                            {input('vat_code')}
                        </Field>
                    </div>
                    <Field label={t('Address')} error={errors.address}>
                        {input('address')}
                    </Field>
                </>
            ) : (
                <button type="button" onClick={() => setShowCompany(true)} className="text-p self-start text-[13.5px] font-medium">
                    + {t('Company details for invoices')}
                </button>
            )}
            <Field label={t('Notes')} error={errors.notes}>
                <textarea
                    name="notes"
                    rows={2}
                    value={data.notes ?? ''}
                    onChange={(e) => set('notes', e.target.value)}
                    className="border-line-strong bg-panel focus:border-p w-full rounded-[10px] border px-3 py-2.5 outline-none focus:shadow-[0_0_0_3px_var(--p-soft)]"
                />
            </Field>
        </div>
    );
}

function VehicleFields({
    data,
    errors,
    set,
}: {
    data: { type: VehicleType; make_model: string; year: string; plate: string; vin: string };
    errors: Record<string, string | undefined>;
    set: (key: string, value: string) => void;
}) {
    const t = useT();
    const typeLabel = useVehicleLabels();
    return (
        <div className="flex flex-col gap-4">
            <Segmented
                value={data.type}
                onChange={(v) => set('type', v)}
                options={VEHICLE_TYPES.map((v) => {
                    const Icon = VEHICLE_ICON[v];
                    return {
                        value: v,
                        label: (
                            <>
                                <Icon className="size-4" strokeWidth={1.7} />
                                <span className="hidden sm:inline">{typeLabel(v)}</span>
                            </>
                        ),
                    };
                })}
            />
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_100px]">
                <Field label={t('Make and model')} error={errors.make_model}>
                    <TextInput value={data.make_model} placeholder="VW Passat" onChange={(e) => set('make_model', e.target.value)} />
                </Field>
                <Field label={t('Year')} error={errors.year}>
                    <TextInput inputMode="numeric" maxLength={4} value={data.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} />
                </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('Plate')} error={errors.plate}>
                    <TextInput
                        value={data.plate}
                        placeholder="ABC 123"
                        className="uppercase"
                        onChange={(e) => set('plate', e.target.value.toUpperCase())}
                    />
                </Field>
                <Field label={t('VIN')} error={errors.vin}>
                    <TextInput
                        value={data.vin}
                        maxLength={17}
                        className="uppercase"
                        onChange={(e) => set('vin', e.target.value.toUpperCase().replace(/\s/g, ''))}
                    />
                </Field>
            </div>
        </div>
    );
}

const emptyVehicle = { type: 'car' as VehicleType, make_model: '', year: '', plate: '', vin: '' };

function NewCustomerSheet({ onClose }: { onClose: () => void }) {
    const t = useT();
    const form = useForm({ name: '', phone: '', email: '', company_code: '', vat_code: '', address: '', notes: '', vehicle: { ...emptyVehicle } });
    const errors = form.errors as Record<string, string>;
    const vehicleErrors = Object.fromEntries(
        Object.entries(errors)
            .filter(([k]) => k.startsWith('vehicle.'))
            .map(([k, v]) => [k.slice(8), v]),
    );
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('customers.store'), { onSuccess: onClose });
    };

    return (
        <SideSheet
            open
            onClose={onClose}
            eyebrow={t('Customers')}
            title={t('Add customer')}
            footer={
                <>
                    <Button type="submit" form="new-customer" variant="primary" icon={Check} disabled={form.processing}>
                        {t('Save')}
                    </Button>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                </>
            }
        >
            <form id="new-customer" onSubmit={submit} className="flex flex-col gap-6">
                <CustomerFieldsForm data={form.data} errors={errors} set={(k, v) => form.setData(k, v)} idPrefix="new" />
                <SheetSection title={t('Vehicle')}>
                    <VehicleFields
                        data={form.data.vehicle}
                        errors={vehicleErrors}
                        set={(k, v) => form.setData('vehicle', { ...form.data.vehicle, [k]: v })}
                    />
                    <p className="text-muted-foreground mt-2 text-[13px]">{t('Leave empty to add the vehicle later.')}</p>
                </SheetSection>
            </form>
        </SideSheet>
    );
}

function CustomerSheet({ customer, onClose }: { customer: Detail; onClose: () => void }) {
    const t = useT();
    const locale = useLocale();
    const status = useStatusLabel();
    const pageErrors = usePage().props.errors as Record<string, string>;
    const [editing, setEditing] = useState(false);
    const [vehicleEdit, setVehicleEdit] = useState<VehicleView | 'new' | null>(null);

    const form = useForm({
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        company_code: customer.company_code ?? '',
        vat_code: customer.vat_code ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
    });
    const save: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('customers.update', customer.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    return (
        <SideSheet
            open
            onClose={onClose}
            eyebrow={t('Customer')}
            title={customer.name}
            footer={
                editing ? (
                    <>
                        <Button type="submit" form="edit-customer" variant="primary" icon={Check} disabled={form.processing}>
                            {t('Save')}
                        </Button>
                        <Button onClick={() => (form.reset(), setEditing(false))}>{t('Cancel')}</Button>
                    </>
                ) : (
                    <>
                        <ButtonLink href={route('calendar')} variant="primary" icon={Plus}>
                            {t('New job')}
                        </ButtonLink>
                        <span className="flex-1" />
                        {customer.canDelete && (
                            <ConfirmButton onConfirm={() => router.delete(route('customers.destroy', customer.id))}>{t('Delete')}</ConfirmButton>
                        )}
                    </>
                )
            }
        >
            {(pageErrors.customer || pageErrors.vehicle) && (
                <div className="bg-over-bg text-over-ink rounded-xl px-3.5 py-2.5">{pageErrors.customer || pageErrors.vehicle}</div>
            )}

            {editing ? (
                <form id="edit-customer" onSubmit={save}>
                    <CustomerFieldsForm data={form.data} errors={form.errors} set={(k, v) => form.setData(k, v)} idPrefix="edit" />
                </form>
            ) : (
                <SheetSection
                    title={t('Contact')}
                    action={
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>
                            {t('Edit')}
                        </Button>
                    }
                >
                    <div className="border-line flex flex-col gap-2 rounded-xl border p-3.5">
                        <div className="flex items-center gap-3">
                            <CustomerAvatar name={customer.name} />
                            <div className="min-w-0 flex-1">
                                <div className="font-medium tabular-nums">{customer.phone ?? '—'}</div>
                                {customer.email && (
                                    <a
                                        href={`mailto:${customer.email}`}
                                        className="text-muted-foreground flex items-center gap-1.5 truncate text-[13.5px]"
                                    >
                                        <Mail className="size-3.5" />
                                        {customer.email}
                                    </a>
                                )}
                            </div>
                            {customer.phone && (
                                <a
                                    href={`tel:${customer.phone.replace(/\s/g, '')}`}
                                    className="border-line-strong text-fg-2 hover:bg-hover inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13.5px] font-medium"
                                >
                                    <Phone className="size-4" strokeWidth={1.7} />
                                    {t('Call')}
                                </a>
                            )}
                        </div>
                        {(customer.company_code || customer.vat_code || customer.address) && (
                            <div className="text-muted-foreground border-line border-t pt-2 text-[13.5px]">
                                {[
                                    customer.company_code && `${t('Company code')}: ${customer.company_code}`,
                                    customer.vat_code && `${t('VAT code')}: ${customer.vat_code}`,
                                    customer.address,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </div>
                        )}
                        {customer.notes && <div className="border-line border-t pt-2 text-[13.5px] whitespace-pre-line">{customer.notes}</div>}
                    </div>
                </SheetSection>
            )}

            <SheetSection
                title={t('Vehicles')}
                action={
                    vehicleEdit === null && (
                        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setVehicleEdit('new')}>
                            {t('Add vehicle')}
                        </Button>
                    )
                }
            >
                <div className="flex flex-col gap-2">
                    {customer.vehicles.length === 0 && vehicleEdit === null && (
                        <p className="text-muted-foreground text-[13.5px]">{t('No vehicles yet.')}</p>
                    )}
                    {customer.vehicles.map((v) =>
                        vehicleEdit !== 'new' && vehicleEdit?.id === v.id ? (
                            <VehicleEditor key={v.id} customerId={customer.id} vehicle={v} onDone={() => setVehicleEdit(null)} />
                        ) : (
                            <VehicleRow key={v.id} vehicle={v} onEdit={() => setVehicleEdit(v)} />
                        ),
                    )}
                    {vehicleEdit === 'new' && <VehicleEditor customerId={customer.id} vehicle={null} onDone={() => setVehicleEdit(null)} />}
                </div>
            </SheetSection>

            <SheetSection title={t('Job history')}>
                {customer.jobs.length === 0 ? (
                    <p className="text-muted-foreground text-[13.5px]">{t('No jobs yet.')}</p>
                ) : (
                    <div className="flex flex-col">
                        {customer.jobs.map((j) => (
                            <div key={j.id} className="border-line flex items-start gap-3 border-b border-dashed py-2.5 last:border-b-0">
                                <Wrench className="text-muted-foreground mt-0.5 size-4 shrink-0" strokeWidth={1.7} />
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium">{j.description}</div>
                                    <div className="text-muted-foreground text-[13px]">
                                        #{j.number} · {formatDate(j.date, locale)}
                                        {j.mechanic && ` · ${j.mechanic}`}
                                        {j.vehicle && ` · ${j.vehicle}`}
                                    </div>
                                </div>
                                <StatusDot status={j.status} label={status(j.status)} />
                            </div>
                        ))}
                    </div>
                )}
            </SheetSection>
        </SideSheet>
    );
}

function VehicleRow({ vehicle, onEdit }: { vehicle: VehicleView; onEdit: () => void }) {
    const t = useT();
    const typeLabel = useVehicleLabels();
    const Icon = VEHICLE_ICON[vehicle.type];
    return (
        <div className="border-line flex items-center gap-3 rounded-xl border px-3.5 py-3">
            <Icon className="text-muted-foreground size-[18px] shrink-0" strokeWidth={1.7} aria-label={typeLabel(vehicle.type)} />
            <div className="min-w-0 flex-1">
                <span className="font-medium">{vehicle.make}</span> {vehicle.year && <span className="text-muted-foreground">{vehicle.year}</span>}
                {vehicle.vin && <div className="text-muted-foreground truncate font-mono text-xs">VIN {vehicle.vin}</div>}
            </div>
            <Plate value={vehicle.plate} />
            <button
                type="button"
                onClick={onEdit}
                aria-label={t('Edit')}
                className="text-muted-foreground hover:bg-hover grid size-8 place-items-center rounded-lg"
            >
                <Pencil className="size-4" strokeWidth={1.7} />
            </button>
        </div>
    );
}

function VehicleEditor({ customerId, vehicle, onDone }: { customerId: number; vehicle: VehicleView | null; onDone: () => void }) {
    const t = useT();
    const form = useForm({
        type: vehicle?.type ?? ('car' as VehicleType),
        make_model: vehicle?.make ?? '',
        year: vehicle?.year ? String(vehicle.year) : '',
        plate: vehicle?.plate ?? '',
        vin: vehicle?.vin ?? '',
    });
    const submit = () => {
        const opts = { preserveScroll: true, onSuccess: onDone };
        if (vehicle) form.patch(route('vehicles.update', vehicle.id), opts);
        else form.post(route('vehicles.store', customerId), opts);
    };

    return (
        <div className="border-p-line bg-subtle flex flex-col gap-4 rounded-xl border p-3.5">
            <VehicleFields data={form.data} errors={form.errors} set={(k, v) => form.setData(k as keyof typeof form.data, v as never)} />
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" icon={Check} onClick={submit} disabled={form.processing}>
                    {t('Save')}
                </Button>
                <Button size="sm" onClick={onDone}>
                    {t('Cancel')}
                </Button>
                <span className="flex-1" />
                {vehicle?.canDelete && (
                    <ConfirmButton
                        size="sm"
                        onConfirm={() => router.delete(route('vehicles.destroy', vehicle.id), { preserveScroll: true, onSuccess: onDone })}
                    >
                        {t('Delete')}
                    </ConfirmButton>
                )}
            </div>
        </div>
    );
}
