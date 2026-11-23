import { router } from '@inertiajs/react';

/** Change one query parameter and reload only what is needed, keeping the rest of the page as it is. */
export function visitWith(param: string, value: string | number | null, only: string[]) {
    const url = new URL(window.location.href);
    if (value === null || value === '') url.searchParams.delete(param);
    else url.searchParams.set(param, String(value));
    if (param !== 'page') url.searchParams.delete('page');
    router.get(url.pathname + url.search, {}, { only, preserveState: true, preserveScroll: true, replace: param === 'q' });
}
