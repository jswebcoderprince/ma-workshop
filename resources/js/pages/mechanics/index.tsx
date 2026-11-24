import { ConfirmButton } from '@/components/confirm-button';
import { SideSheet } from '@/components/side-sheet';
import { Button, Card, CardHeader, EmptyState, Field, MechanicAvatar, SelectInput, Switch, Tag, TextInput } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatShortDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { VEHICLE_ICON, VEHICLE_TYPES, useVehicleLabels } from '@/lib/vehicles';
import type { MechanicView, TimeOffView, VehicleType } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import { CalendarOff, CalendarX2, Check, HardHat, Palmtree, Pencil, Plus, Stethoscope, X } from 'lucide-react';
import { useState, type FormEventHandler } from 'react';

type Mechanic = MechanicView & {
    active: boolean;
    load: number;
    nextFree: string | null;
    openJobs: number;
    canDelete: boolean;
    timeOff: TimeOffView[];
};
type Closure = { id: number; date: string; name: string };
interface Props {
    mechanics: Mechanic[];
    closures: Closure[];
    palette: string[];
    today: string;
}

const TIME_OFF_ICON = { holiday: Palmtree, day_off: CalendarOff, sick: Stethoscope };

function useDayNames() {
    const t = useT();
    return [t('Mo'), t('Tu'), t('We'), t('Th'), t('Fr'), t('Sa'), t('Su')];
}

function useTimeOffLabels() {
    const t = useT();
    const labels = { holiday: t('Holiday'), day_off: t('Day off'), sick: t('Sick leave') };
    return (type: TimeOffView['type']) => labels[type];
}

export default function Mechanics({ mechanics, closures, palette, today }: Props) {
    const t = useT();
    const locale = useLocale();
    const days = useDayNames();
    const typeLabel = useVehicleLabels();
    const offLabel = useTimeOffLabels();
    const [editing, setEditing] = useState<Mechanic | 'new' | null>(null);

    const removeTimeOff = (id: number) => router.delete(route('time-off.destroy', id), { preserveScroll: true });
    const removeClosure = (id: number) => router.delete(route('closures.destroy', id), { preserveScroll: true });

    return (
        <AppLayout
            title={t('Mechanics')}
            actions={
                <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                    <span className="hidden md:inline">{t('Add mechanic')}</span>
                </Button>
            }
        >
            {mechanics.length === 0 ? (
                <Card>
                    <EmptyState icon={HardHat} title={t('No mechanics yet')}>
                        {t('Add the people who work in the workshop. Each gets a row in the calendar.')}
                    </EmptyState>
                </Card>
            ) : (
                <div className="stagger grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5 md:gap-5">
                    {mechanics.map((m) => (
                        <Card key={m.id} className={cn(!m.active && 'opacity-70')}>
                            <CardHeader
                                title={
                                    <span className="flex items-center gap-3">
                                        <MechanicAvatar mechanic={m} />
                                        <span>
                                            {m.name}
                                            <span className="text-muted-foreground block text-[13px] font-normal">
                                                {m.vehicleTypes.map(typeLabel).join(', ')}
                                            </span>
                                        </span>
                                    </span>
                                }
                            >
                                {!m.active && <Tag>{t('Inactive')}</Tag>}
                                <button
                                    type="button"
                                    onClick={() => setEditing(m)}
                                    aria-label={t('Edit :name', { name: m.name })}
                                    className="text-muted-foreground hover:bg-hover hover:text-fg grid size-[30px] place-items-center rounded-lg"
                                >
                                    <Pencil className="size-4" strokeWidth={1.7} />
                                </button>
                            </CardHeader>
                            <div className="flex flex-col gap-3 px-5 pb-5">
                                <div className="text-muted-foreground text-[13px]">{t('Working days')}</div>
                                <div className="flex gap-[5px]">
                                    {days.map((d, i) => (
                                        <span
                                            key={d}
                                            className={cn(
                                                'grid h-7 w-[30px] place-items-center rounded-lg text-xs font-medium',
                                                m.workDays.includes(i + 1) ? 'bg-p-soft text-p-ink' : 'bg-subtle text-faint',
                                            )}
                                        >
                                            {d}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center text-[13px]">
                                    <span className="text-muted-foreground">{t('Booked, next 4 weeks')}</span>
                                    <span className="flex-1" />
                                    <b className="font-semibold tabular-nums">{m.load}%</b>
                                </div>
                                <div className="bg-subtle h-[7px] overflow-hidden rounded-full">
                                    <i
                                        className={cn(
                                            'grow-x block h-full rounded-full',
                                            m.load >= 90 ? 'bg-over' : m.load >= 70 ? 'bg-parts' : 'bg-p',
                                        )}
                                        style={{ width: `${m.load}%` }}
                                    />
                                </div>
                                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                                    <span>
                                        {t('Open jobs')}: <b className="text-fg font-medium">{m.openJobs}</b>
                                    </span>
                                    <span>
                                        {t('Next free 1-day slot')}:{' '}
                                        <b className="text-fg font-medium">{m.nextFree ? formatShortDate(m.nextFree, locale) : '—'}</b>
                                    </span>
                                </div>
                                <div className="text-muted-foreground mt-1 text-[13px]">{t('Time off')}</div>
                                {m.timeOff.length === 0 && <span className="text-faint text-[13px]">{t('None planned')}</span>}
                                <div className="flex flex-col gap-1.5">
                                    {m.timeOff.map((o) => {
                                        const Icon = TIME_OFF_ICON[o.type];
                                        return (
                                            <div key={o.id} className="flex items-center gap-2">
                                                <Tag icon={Icon} tone={o.type === 'sick' ? 'over' : 'default'}>
                                                    {offLabel(o.type)}
                                                </Tag>
                                                <span className="text-[13.5px] tabular-nums">
                                                    {formatShortDate(o.from, locale)}
                                                    {o.to !== o.from && ` – ${formatShortDate(o.to, locale)}`}
                                                </span>
                                                {o.note && <span className="text-muted-foreground truncate text-[13px]">· {o.note}</span>}
                                                <span className="flex-1" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeTimeOff(o.id)}
                                                    aria-label={t('Remove')}
                                                    title={t('Remove')}
                                                    className="text-muted-foreground hover:bg-over-bg hover:text-over-ink grid size-7 place-items-center rounded-md"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <div className="grid items-start gap-3.5 md:gap-5 xl:grid-cols-2">
                <TimeOffForm mechanics={mechanics.filter((m) => m.active)} today={today} />
                <Card>
                    <CardHeader title={t('Workshop closed')} sub={t('Public holidays and other days nobody works.')} />
                    <div className="px-5 pb-5">
                        <ClosureForm today={today} />
                        <div className="mt-3 flex flex-col">
                            {closures.length === 0 && <p className="text-muted-foreground py-2">{t('No closed days ahead.')}</p>}
                            {closures.map((c) => (
                                <div key={c.id} className="border-line flex items-center gap-3 border-b border-dashed py-2.5 last:border-b-0">
                                    <Tag icon={CalendarX2} />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium">{formatDate(c.date, locale)}</div>
                                        <div className="text-muted-foreground truncate text-[13px]">{c.name}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeClosure(c.id)}
                                        aria-label={t('Remove')}
                                        title={t('Remove')}
                                        className="text-muted-foreground hover:bg-over-bg hover:text-over-ink grid size-7 place-items-center rounded-md"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {editing && <MechanicSheet mechanic={editing === 'new' ? null : editing} palette={palette} onClose={() => setEditing(null)} />}
        </AppLayout>
    );
}

function MechanicSheet({ mechanic, palette, onClose }: { mechanic: Mechanic | null; palette: string[]; onClose: () => void }) {
    const t = useT();
    const days = useDayNames();
    const typeLabel = useVehicleLabels();
    const pageErrors = usePage().props.errors as Record<string, string>;
    const form = useForm({
        name: mechanic?.name ?? '',
        vehicle_types: mechanic?.vehicleTypes ?? (['car'] as VehicleType[]),
        work_days: mechanic?.workDays ?? [1, 2, 3, 4, 5],
        color: mechanic?.color ?? palette[0],
        active: mechanic?.active ?? true,
    });

    const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (mechanic) form.patch(route('mechanics.update', mechanic.id), opts);
        else form.post(route('mechanics.store'), opts);
    };

    return (
        <SideSheet
            open
            onClose={onClose}
            eyebrow={t('Mechanics')}
            title={mechanic ? mechanic.name : t('Add mechanic')}
            footer={
                <>
                    <Button type="submit" form="mechanic-form" variant="primary" icon={Check} disabled={form.processing}>
                        {t('Save')}
                    </Button>
                    <Button onClick={onClose}>{t('Cancel')}</Button>
                    <span className="flex-1" />
                    {mechanic &&
                        (mechanic.canDelete ? (
                            <ConfirmButton
                                onConfirm={() => router.delete(route('mechanics.destroy', mechanic.id), { preserveScroll: true, onSuccess: onClose })}
                            >
                                {t('Delete')}
                            </ConfirmButton>
                        ) : null)}
                </>
            }
        >
            <form id="mechanic-form" onSubmit={submit} className="flex flex-col gap-5">
                {pageErrors.mechanic && <div className="bg-over-bg text-over-ink rounded-xl px-3.5 py-2.5">{pageErrors.mechanic}</div>}
                <Field label={t('Name')} error={form.errors.name}>
                    <TextInput name="name" required autoFocus value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                </Field>
                <Field label={t('Works on')} error={form.errors.vehicle_types}>
                    <div className="flex flex-wrap gap-2">
                        {VEHICLE_TYPES.map((v) => {
                            const Icon = VEHICLE_ICON[v];
                            const on = form.data.vehicle_types.includes(v);
                            return (
                                <button
                                    key={v}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => form.setData('vehicle_types', toggle(form.data.vehicle_types, v))}
                                    className={cn(
                                        'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 font-medium',
                                        on ? 'border-p bg-p text-white' : 'border-line-strong text-fg-2 bg-panel',
                                    )}
                                >
                                    <Icon className="size-4" strokeWidth={1.7} />
                                    {typeLabel(v)}
                                </button>
                            );
                        })}
                    </div>
                </Field>
                <Field label={t('Working days')} error={form.errors.work_days} hint={t('Days off for holidays are added separately.')}>
                    <div className="flex flex-wrap gap-1.5">
                        {days.map((d, i) => {
                            const on = form.data.work_days.includes(i + 1);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => form.setData('work_days', toggle(form.data.work_days, i + 1))}
                                    className={cn(
                                        'grid h-9 w-11 place-items-center rounded-[9px] border font-medium',
                                        on ? 'border-p bg-p-soft text-p-ink' : 'border-line-strong text-faint',
                                    )}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </Field>
                <Field label={t('Colour in the calendar')} error={form.errors.color}>
                    <div className="flex flex-wrap gap-2">
                        {palette.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={c}
                                aria-pressed={form.data.color === c}
                                onClick={() => form.setData('color', c)}
                                className={cn(
                                    'size-8 rounded-full ring-offset-2 ring-offset-[var(--panel)]',
                                    form.data.color === c && 'ring-2 ring-[var(--fg)]',
                                )}
                                style={{ background: c }}
                            />
                        ))}
                    </div>
                </Field>
                {mechanic && (
                    <label className="flex items-center gap-3 font-medium">
                        <Switch checked={form.data.active} onChange={(v) => form.setData('active', v)} label={t('Active')} />
                        {t('Active')}
                    </label>
                )}
                {mechanic && !mechanic.canDelete && (
                    <p className="text-muted-foreground -mt-3 text-[13px]">
                        {t('Mechanics with jobs cannot be deleted. Set them inactive to hide them from new bookings.')}
                    </p>
                )}
            </form>
        </SideSheet>
    );
}

function TimeOffForm({ mechanics, today }: { mechanics: Mechanic[]; today: string }) {
    const t = useT();
    const form = useForm({ mechanic: mechanics[0]?.id ?? 0, type: 'holiday', starts_on: today, ends_on: today, note: '' });
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // The mechanic goes in the URL, not the body.
        form.transform((d) => ({ type: d.type, starts_on: d.starts_on, ends_on: d.ends_on, note: d.note }));
        form.post(route('time-off.store', form.data.mechanic), { preserveScroll: true, onSuccess: () => form.reset('note') });
    };

    return (
        <Card>
            <CardHeader title={t('Add time off')} sub={t('Holidays, days off and sick leave.')} />
            <form onSubmit={submit} className="flex flex-col gap-4 px-5 pb-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('Mechanic')}>
                        <SelectInput
                            value={form.data.mechanic}
                            onChange={(e) => form.setData('mechanic', Number(e.target.value))}
                            disabled={!mechanics.length}
                        >
                            {mechanics.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </SelectInput>
                    </Field>
                    <Field label={t('Type')} error={form.errors.type}>
                        <SelectInput value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                            <option value="holiday">{t('Holiday')}</option>
                            <option value="day_off">{t('Day off')}</option>
                            <option value="sick">{t('Sick leave')}</option>
                        </SelectInput>
                    </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('From')} error={form.errors.starts_on}>
                        <TextInput
                            type="date"
                            value={form.data.starts_on}
                            onChange={(e) =>
                                form.setData((d) => ({
                                    ...d,
                                    starts_on: e.target.value,
                                    ends_on: d.ends_on < e.target.value ? e.target.value : d.ends_on,
                                }))
                            }
                        />
                    </Field>
                    <Field label={t('To')} error={form.errors.ends_on}>
                        <TextInput
                            type="date"
                            min={form.data.starts_on}
                            value={form.data.ends_on}
                            onChange={(e) => form.setData('ends_on', e.target.value)}
                        />
                    </Field>
                </div>
                <Field label={t('Note (optional)')} error={form.errors.note}>
                    <TextInput value={form.data.note} maxLength={120} onChange={(e) => form.setData('note', e.target.value)} />
                </Field>
                <div>
                    <Button type="submit" variant="primary" icon={Plus} disabled={form.processing || !mechanics.length}>
                        {t('Add')}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function ClosureForm({ today }: { today: string }) {
    const t = useT();
    const form = useForm({ date: today, name: '' });
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('closures.store'), { preserveScroll: true, onSuccess: () => form.reset('name') });
    };

    return (
        <form onSubmit={submit} className="grid items-end gap-3 md:grid-cols-[170px_minmax(0,1fr)_auto]">
            <Field label={t('Date')} error={form.errors.date}>
                <TextInput type="date" min={today} value={form.data.date} onChange={(e) => form.setData('date', e.target.value)} />
            </Field>
            <Field label={t('Reason')} error={form.errors.name}>
                <TextInput
                    value={form.data.name}
                    maxLength={80}
                    placeholder={t('e.g. public holiday')}
                    onChange={(e) => form.setData('name', e.target.value)}
                />
            </Field>
            <Button type="submit" icon={Plus} disabled={form.processing}>
                {t('Add')}
            </Button>
        </form>
    );
}
