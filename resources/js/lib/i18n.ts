import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

type Props = { locale: string; translations: Record<string, string> };

/**
 * `t('English text', { name: 'x' })` returns the Lithuanian string from lang/lt.json when the app is in Lithuanian,
 * otherwise the key itself. Placeholders use Laravel's `:name` style.
 * Every literal passed to t() must exist in lang/lt.json (checked by tests/Feature/TranslationsTest.php).
 */
export function useT() {
    const { translations } = usePage<Props>().props;

    return useCallback(
        (key: string, replace?: Record<string, string | number>) => {
            let text = translations?.[key] ?? key;
            if (replace) {
                for (const [k, v] of Object.entries(replace)) {
                    text = text.replaceAll(`:${k}`, String(v));
                }
            }
            return text;
        },
        [translations],
    );
}

export function useLocale(): 'en' | 'lt' {
    return usePage<Props>().props.locale === 'lt' ? 'lt' : 'en';
}
