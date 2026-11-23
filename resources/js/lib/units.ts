import { useT } from '@/lib/i18n';

/** Line units are stored as codes (app/Support/Invoicing::UNITS) and shown in the app language. */
export function useUnitLabel() {
    const t = useT();
    const labels: Record<string, string> = { h: t('h'), pcs: t('pcs'), l: t('l'), set: t('set') };
    return (u: string) => labels[u] ?? u;
}
