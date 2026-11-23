import { Button, Field, Switch, TextInput } from '@/components/ui-kit';
import SettingsLayout from '@/layouts/settings-layout';
import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Check } from 'lucide-react';
import type { FormEventHandler } from 'react';

type Values = {
    vat_payer: boolean;
    vat_rate: number;
    invoice_series: string;
    invoice_next_number: number;
    hourly_rate: number;
    payment_days: number;
};

export default function Invoices({ values, minNextNumber }: { values: Values; minNextNumber: number }) {
    const t = useT();
    const form = useForm<Values>(values);
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('settings.invoices'), { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };
    const preview = `${form.data.invoice_series || '—'}-${String(form.data.invoice_next_number || 0).padStart(4, '0')}`;

    return (
        <SettingsLayout title={t('Invoices')} description={t('Numbers are never reused. Issued invoices can be voided, not edited.')}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <label className="flex items-center gap-3 font-medium">
                    <Switch checked={form.data.vat_payer} onChange={(v) => form.setData('vat_payer', v)} label={t('VAT payer (PVM)')} />
                    {t('VAT payer (PVM)')}
                </label>
                <p className="text-muted-foreground -mt-2 text-[13px]">{t('When on, invoices are titled "PVM sąskaita faktūra" and show VAT.')}</p>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('Series')} error={form.errors.invoice_series}>
                        <TextInput
                            name="invoice_series"
                            value={form.data.invoice_series}
                            maxLength={10}
                            className="uppercase"
                            onChange={(e) => form.setData('invoice_series', e.target.value.toUpperCase())}
                        />
                    </Field>
                    <Field label={t('Next number')} error={form.errors.invoice_next_number} hint={t('Next invoice: :number', { number: preview })}>
                        <TextInput
                            type="number"
                            name="invoice_next_number"
                            min={minNextNumber}
                            value={form.data.invoice_next_number}
                            onChange={(e) => form.setData('invoice_next_number', Number(e.target.value))}
                        />
                    </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label={t('VAT rate, %')} error={form.errors.vat_rate}>
                        <TextInput
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            name="vat_rate"
                            value={form.data.vat_rate}
                            onChange={(e) => form.setData('vat_rate', Number(e.target.value))}
                        />
                    </Field>
                    <Field label={t('Hourly rate, €')} error={form.errors.hourly_rate}>
                        <TextInput
                            type="number"
                            step="0.01"
                            min={0}
                            name="hourly_rate"
                            value={form.data.hourly_rate}
                            onChange={(e) => form.setData('hourly_rate', Number(e.target.value))}
                        />
                    </Field>
                    <Field label={t('Payment term, days')} error={form.errors.payment_days}>
                        <TextInput
                            type="number"
                            min={0}
                            max={365}
                            name="payment_days"
                            value={form.data.payment_days}
                            onChange={(e) => form.setData('payment_days', Number(e.target.value))}
                        />
                    </Field>
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
