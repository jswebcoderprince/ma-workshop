import { Button, SelectInput } from '@/components/ui-kit';
import SettingsLayout from '@/layouts/settings-layout';
import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Check, TriangleAlert } from 'lucide-react';
import type { FormEventHandler } from 'react';

type Day = { open: string; quarters: number };
type Hours = Record<string, Day>;

const QUARTER_MINUTES = 150;
// 24-hour opening times every 15 minutes, 05:00–13:00 (a browser time field would show AM/PM in some locales).
const TIMES = Array.from({ length: 33 }, (_, i) => {
    const m = 5 * 60 + i * 15;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

function closeTime(d: Day) {
    const [h, m] = d.open.split(':').map(Number);
    const end = h * 60 + m + d.quarters * QUARTER_MINUTES;
    return end > 24 * 60 ? '—' : `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

export default function HoursPage({ values }: { values: Hours }) {
    const t = useT();
    const form = useForm<{ hours: Hours }>({ hours: values });
    const days = [t('Monday'), t('Tuesday'), t('Wednesday'), t('Thursday'), t('Friday'), t('Saturday'), t('Sunday')];

    const set = (day: number, patch: Partial<Day>) => form.setData('hours', { ...form.data.hours, [day]: { ...form.data.hours[day], ...patch } });
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('settings.hours'), { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };
    const errors = form.errors as Record<string, string>;

    return (
        <SettingsLayout title={t('Working hours')} description={t('Each working day is split into 2.5-hour quarters. Jobs are booked in quarters.')}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="bg-parts-bg text-parts-ink flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px]">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {t('Changing hours moves where existing jobs end on the calendar. Check the calendar after saving.')}
                </div>
                <div className="border-line overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-subtle text-muted-foreground text-left text-[13px]">
                                <th className="px-4 py-2.5 font-medium">{t('Day')}</th>
                                <th className="px-4 py-2.5 font-medium">{t('Opens')}</th>
                                <th className="px-4 py-2.5 font-medium">{t('Quarters')}</th>
                                <th className="px-4 py-2.5 font-medium">{t('Closes')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((label, i) => {
                                const day = i + 1;
                                const d = form.data.hours[day];
                                const err = errors[`hours.${day}.open`] || errors[`hours.${day}.quarters`];
                                return (
                                    <tr key={day} className="border-line border-t">
                                        <td className="px-4 py-2 font-medium">{label}</td>
                                        <td className="px-4 py-2">
                                            <SelectInput
                                                className="h-9 w-32"
                                                value={d.open}
                                                disabled={d.quarters === 0}
                                                onChange={(e) => set(day, { open: e.target.value })}
                                                aria-label={`${label} ${t('Opens')}`}
                                            >
                                                {(TIMES.includes(d.open) ? TIMES : [d.open, ...TIMES]).map((time) => (
                                                    <option key={time} value={time}>
                                                        {time}
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        </td>
                                        <td className="px-4 py-2">
                                            <SelectInput
                                                className="h-9 w-40"
                                                value={d.quarters}
                                                onChange={(e) => set(day, { quarters: Number(e.target.value) })}
                                                aria-label={`${label} ${t('Quarters')}`}
                                            >
                                                <option value={0}>{t('Closed')}</option>
                                                {[1, 2, 3, 4].map((q) => (
                                                    <option key={q} value={q}>
                                                        {q} × 2,5 h
                                                    </option>
                                                ))}
                                            </SelectInput>
                                        </td>
                                        <td className="px-4 py-2 tabular-nums">
                                            {d.quarters ? closeTime(d) : <span className="text-muted-foreground">{t('Closed')}</span>}
                                            {err && <div className="text-over-ink text-[12.5px]">{err}</div>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div>
                    <Button type="submit" variant="primary" icon={Check} disabled={form.processing || !form.isDirty}>
                        {t('Save')}
                    </Button>
                </div>
            </form>
        </SettingsLayout>
    );
}
