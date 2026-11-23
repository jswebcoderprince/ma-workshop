import { Button, Field, TextInput } from '@/components/ui-kit';
import SettingsLayout from '@/layouts/settings-layout';
import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Check, KeyRound } from 'lucide-react';
import type { FormEventHandler } from 'react';

export default function Account({ user }: { user: { name: string; email: string } }) {
    const t = useT();
    const profile = useForm(user);
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });

    const saveProfile: FormEventHandler = (e) => {
        e.preventDefault();
        profile.patch(route('settings.account'), { preserveScroll: true, onSuccess: () => profile.setDefaults() });
    };
    const savePassword: FormEventHandler = (e) => {
        e.preventDefault();
        password.put(route('settings.password'), { preserveScroll: true, onSuccess: () => password.reset() });
    };

    return (
        <SettingsLayout title={t('Account')} description={t('Your login to this app.')}>
            <form onSubmit={saveProfile} className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('Name')} error={profile.errors.name}>
                        <TextInput
                            name="name"
                            required
                            value={profile.data.name}
                            onChange={(e) => profile.setData('name', e.target.value)}
                            autoComplete="name"
                        />
                    </Field>
                    <Field label={t('Email')} error={profile.errors.email}>
                        <TextInput
                            type="email"
                            name="email"
                            required
                            value={profile.data.email}
                            onChange={(e) => profile.setData('email', e.target.value)}
                            autoComplete="username"
                        />
                    </Field>
                </div>
                <div>
                    <Button type="submit" variant="primary" icon={Check} disabled={profile.processing || !profile.isDirty}>
                        {t('Save')}
                    </Button>
                </div>
            </form>

            <form onSubmit={savePassword} className="border-line mt-8 flex flex-col gap-4 border-t pt-6">
                <h4 className="font-semibold">{t('Change password')}</h4>
                <Field label={t('Current password')} error={password.errors.current_password}>
                    <TextInput
                        type="password"
                        name="current_password"
                        autoComplete="current-password"
                        value={password.data.current_password}
                        onChange={(e) => password.setData('current_password', e.target.value)}
                    />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t('New password')} error={password.errors.password}>
                        <TextInput
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            value={password.data.password}
                            onChange={(e) => password.setData('password', e.target.value)}
                        />
                    </Field>
                    <Field label={t('Repeat new password')} error={password.errors.password_confirmation}>
                        <TextInput
                            type="password"
                            name="password_confirmation"
                            autoComplete="new-password"
                            value={password.data.password_confirmation}
                            onChange={(e) => password.setData('password_confirmation', e.target.value)}
                        />
                    </Field>
                </div>
                <div>
                    <Button type="submit" icon={KeyRound} disabled={password.processing}>
                        {t('Change password')}
                    </Button>
                </div>
            </form>
        </SettingsLayout>
    );
}
