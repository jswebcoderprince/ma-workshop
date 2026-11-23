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
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Head title={t('Log in')} />

            {/* brand side (desktop): the graphite and teal of the sidebar, with a week of quarters as the picture */}
            <aside className="bg-side text-side-fg hidden flex-col justify-between p-12 lg:flex">
                <div className="flex items-center gap-3">
                    <LogoMark size={44} className="text-white" />
                    <div className="leading-tight">
                        <div className="text-[17px] font-semibold text-white">{workshop.name}</div>
                        <div className="text-side-muted text-[13px]">{t('Workshop planner')}</div>
                    </div>
                </div>
                <WeekPattern />
                <div className="text-side-dim text-[12.5px]">
                    © {new Date().getFullYear()} {workshop.name}
                </div>
            </aside>

            <div className="bg-canvas grid place-items-center px-4 py-10">
                <div className="w-full max-w-[400px]">
                    <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
                        <LogoMark size={40} className="text-fg" />
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
        </div>
    );
}

/** Four mechanics, five days of four quarters: teal is booked. Decoration only. */
const WEEK = ['1100111111110111110', '1111111111111100000', '1110011111111111011', '0111111100111111111'];

function WeekPattern() {
    return (
        <div aria-hidden="true" className="flex flex-col gap-[5px]">
            {WEEK.map((row, r) => (
                <div key={r} className="flex gap-[14px]">
                    {[0, 1, 2, 3, 4].map((day) => (
                        <div key={day} className="flex gap-[4px]">
                            {[0, 1, 2, 3].map((q) => {
                                const busy = (row + '1')[day * 4 + q] === '1';
                                return <span key={q} className={busy ? 'bg-brand h-3 w-5 rounded-[3px]' : 'h-3 w-5 rounded-[3px] bg-white/[.07]'} />;
                            })}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
