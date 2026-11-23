import { Card } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { Building2, Clock3, ReceiptText, SlidersHorizontal, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

export default function SettingsLayout({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
    const t = useT();
    const { url } = usePage();
    const tabs = [
        { name: 'settings.general', label: t('General'), icon: SlidersHorizontal },
        { name: 'settings.company', label: t('Company'), icon: Building2 },
        { name: 'settings.invoices', label: t('Invoices'), icon: ReceiptText },
        { name: 'settings.hours', label: t('Working hours'), icon: Clock3 },
        { name: 'settings.account', label: t('Account'), icon: UserRound },
    ];

    return (
        <AppLayout title={title} crumbs={[{ label: t('Settings'), href: route('settings.general') }]}>
            <Card className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                <nav className="border-line flex gap-[3px] overflow-x-auto border-b p-3.5 md:flex-col md:border-r md:border-b-0">
                    {tabs.map((tab) => {
                        const href = route(tab.name);
                        const active = url.split('?')[0] === new URL(href, location.origin).pathname;
                        return (
                            <Link
                                key={tab.name}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'text-fg-2 hover:bg-hover flex items-center gap-2.5 rounded-[9px] px-3 py-[9px] font-medium whitespace-nowrap',
                                    active && 'bg-p-soft text-p-ink hover:bg-p-soft',
                                )}
                            >
                                <tab.icon className="size-[17px]" strokeWidth={1.7} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="max-w-[760px] p-[18px] md:px-[26px] md:py-[22px]">
                    <h3 className="text-[17px] font-semibold">{title}</h3>
                    {description && <p className="text-muted-foreground mt-1 mb-5">{description}</p>}
                    {!description && <div className="mb-5" />}
                    {children}
                </div>
            </Card>
        </AppLayout>
    );
}
