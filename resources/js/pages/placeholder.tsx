import { Card, EmptyState } from '@/components/ui-kit';
import AppLayout from '@/layouts/app-layout';
import { useT } from '@/lib/i18n';
import { Construction } from 'lucide-react';

/** Pages that later phases fill in (docs/ROADMAP.md). */
export default function Placeholder({ page }: { page: string }) {
    const t = useT();
    const titles: Record<string, string> = {
        calendar: t('Calendar'),
        jobs: t('Jobs'),
        customers: t('Customers'),
        mechanics: t('Mechanics'),
        invoices: t('Invoices'),
    };
    const title = titles[page] ?? page;

    return (
        <AppLayout title={title}>
            <Card>
                <EmptyState icon={Construction} title={title}>
                    {t('This page is being built in the next phase.')}
                </EmptyState>
            </Card>
        </AppLayout>
    );
}
