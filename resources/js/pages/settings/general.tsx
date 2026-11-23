import { Button, Segmented } from '@/components/ui-kit';
import { useAppearance } from '@/hooks/use-appearance';
import SettingsLayout from '@/layouts/settings-layout';
import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { Check, Moon, Sun } from 'lucide-react';
import type { FormEventHandler } from 'react';

type Values = { locale: 'en' | 'lt'; accent: 'cobalt' | 'teal' };

export default function General({ values }: { values: Values }) {
    const t = useT();
    const { appearance, updateAppearance } = useAppearance();
    const form = useForm<Values>(values);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('settings.general'), { preserveScroll: true, onSuccess: () => form.setDefaults() });
    };

    return (
        <SettingsLayout title={t('General')} description={t('Language and look of the app. These apply to everyone who uses it.')}>
            <form onSubmit={submit} className="flex flex-col gap-7">
                <section>
                    <h4 className="font-semibold">{t('Language')}</h4>
                    <p className="text-muted-foreground mb-3 text-[13.5px]">
                        {t('Lithuanian for the workshop. English is used during development.')}
                    </p>
                    <Segmented
                        value={form.data.locale}
                        onChange={(v) => form.setData('locale', v)}
                        options={[
                            { value: 'lt', label: 'Lietuvių' },
                            { value: 'en', label: 'English' },
                        ]}
                    />
                </section>
                <section>
                    <h4 className="font-semibold">{t('Accent colour')}</h4>
                    <p className="text-muted-foreground mb-3 text-[13.5px]">{t('Cobalt blue, or the teal from the MA Engine Lab brand.')}</p>
                    <Segmented
                        value={form.data.accent}
                        onChange={(v) => form.setData('accent', v)}
                        options={[
                            {
                                value: 'cobalt',
                                label: (
                                    <>
                                        <i className="size-3.5 rounded-full bg-[#1e40af]" />
                                        {t('Cobalt blue')}
                                    </>
                                ),
                            },
                            {
                                value: 'teal',
                                label: (
                                    <>
                                        <i className="size-3.5 rounded-full bg-[#0b8a8c]" />
                                        {t('Brand teal')}
                                    </>
                                ),
                            },
                        ]}
                    />
                </section>
                <div>
                    <Button type="submit" variant="primary" icon={Check} disabled={form.processing || !form.isDirty}>
                        {t('Save')}
                    </Button>
                </div>
                <section className="border-line border-t pt-6">
                    <h4 className="font-semibold">{t('Theme on this device')}</h4>
                    <p className="text-muted-foreground mb-3 text-[13.5px]">{t('Saved in this browser only.')}</p>
                    <Segmented
                        value={appearance === 'dark' ? 'dark' : 'light'}
                        onChange={(v) => updateAppearance(v)}
                        options={[
                            {
                                value: 'light',
                                label: (
                                    <>
                                        <Sun className="size-4" />
                                        {t('Light')}
                                    </>
                                ),
                            },
                            {
                                value: 'dark',
                                label: (
                                    <>
                                        <Moon className="size-4" />
                                        {t('Dark')}
                                    </>
                                ),
                            },
                        ]}
                    />
                </section>
            </form>
        </SettingsLayout>
    );
}
