import { LogoMark } from '@/components/logo';
import { Button, Card, Field, TextInput } from '@/components/ui-kit';
import { useT } from '@/lib/i18n';
import type { SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle, LogIn } from 'lucide-react';
import type { FormEventHandler } from 'react';

export default function Login({ status }: { status?: string }) {
    const t = useT();
    const { workshop } = usePage<SharedData>().props;
    const { data, setData, post, processing, errors, reset } = useForm<{ email: string; password: string; remember: boolean }>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="bg-canvas grid min-h-screen place-items-center px-4 py-10">
            <Head title={t('Log in')} />
            <div className="w-full max-w-[400px]">
                <div className="mb-6 flex items-center justify-center gap-3">
                    <LogoMark size={40} />
                    <div className="leading-tight">
                        <div className="text-lg font-semibold">{workshop.name}</div>
                        <div className="text-muted-foreground text-[13px]">{t('Workshop planner')}</div>
                    </div>
                </div>
                <Card className="p-7">
                    <h1 className="text-[21px] font-semibold tracking-[-0.01em]">{t('Log in')}</h1>
                    <p className="text-muted-foreground mt-1 mb-6">{t('Enter your email and password.')}</p>
                    {status && <div className="bg-ok-soft text-ok mb-4 rounded-xl px-3.5 py-2.5">{status}</div>}
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <Field label={t('Email')} error={errors.email}>
                            <TextInput
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                value={data.email}
                                aria-invalid={!!errors.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </Field>
                        <Field label={t('Password')} error={errors.password}>
                            <TextInput
                                type="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                value={data.password}
                                aria-invalid={!!errors.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                        </Field>
                        <label className="text-fg-2 flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="size-[18px] rounded-[5px] accent-[var(--p)]"
                            />
                            {t('Remember me on this device')}
                        </label>
                        <Button
                            type="submit"
                            variant="primary"
                            className="mt-2 w-full"
                            disabled={processing}
                            icon={processing ? LoaderCircle : LogIn}
                        >
                            {t('Log in')}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
