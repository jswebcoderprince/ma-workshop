import { Button, Field, TextInput } from '@/components/ui-kit';
import SettingsLayout from '@/layouts/settings-layout';
import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Check } from 'lucide-react';
import type { FormEventHandler } from 'react';

type Values = { name: string; code: string; vat_code: string; address: string; bank: string; phone: string; email: string };

export default function Company({ values }: { values: Values }) {
    const t = useT();
    const form = useForm<Values>(values);
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('settings.company'), { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };
    const input = (key: keyof Values, extra: Record<string, unknown> = {}) => (
        <TextInput
            name={key}
            value={form.data[key] ?? ''}
            aria-invalid={!!form.errors[key]}
            onChange={(e) => form.setData(key, e.target.value)}
            {...extra}
        />
    );

    return (
        <SettingsLayout title={t('Company')} description={t('Printed on invoices and job cards.')}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <Field label={t('Company name')} error={form.errors.name}>
                    {input('name', { required: true })}
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('Company code')} error={form.errors.code}>
                        {input('code', { inputMode: 'numeric' })}
                    </Field>
                    <Field label={t('VAT code')} error={form.errors.vat_code}>
                        {input('vat_code', { placeholder: 'LT…' })}
                    </Field>
                </div>
                <Field label={t('Address')} error={form.errors.address}>
                    {input('address')}
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('Bank account')} error={form.errors.bank}>
                        {input('bank', { placeholder: 'LT00 0000 0000 0000 0000' })}
                    </Field>
                    <Field label={t('Phone')} error={form.errors.phone}>
                        {input('phone', { type: 'tel' })}
                    </Field>
                </div>
                <Field label={t('Email')} error={form.errors.email}>
                    {input('email', { type: 'email' })}
                </Field>
                <div>
                    <Button type="submit" variant="primary" icon={Check} disabled={form.processing || !form.isDirty}>
                        {t('Save')}
                    </Button>
                </div>
            </form>
        </SettingsLayout>
    );
}
