import { useT } from '@/lib/i18n';
import type { Paged } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** "1–25 of 80" with previous / next links, under a table. */
export function Pager({ page }: { page: Paged<unknown> }) {
    const t = useT();
    if (page.total === 0) return null;
    const link = 'hover:bg-hover grid size-8 place-items-center rounded-md';

    return (
        <div className="border-line text-muted-foreground flex items-center gap-2 border-t px-5 py-3 text-[13.5px]">
            <span>{t(':from–:to of :total', { from: page.from ?? 0, to: page.to ?? 0, total: page.total })}</span>
            <span className="flex-1" />
            {page.prev && (
                <Link href={page.prev} preserveScroll className={link} aria-label={t('Previous page')}>
                    <ChevronLeft className="size-4" />
                </Link>
            )}
            {page.next && (
                <Link href={page.next} preserveScroll className={link} aria-label={t('Next page')}>
                    <ChevronRight className="size-4" />
                </Link>
            )}
        </div>
    );
}
