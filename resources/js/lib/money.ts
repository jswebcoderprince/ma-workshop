type Locale = 'en' | 'lt';

/** Cents → "1 234,50 €" (lt) / "€1,234.50" (en). */
export function money(cents: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Cents → "12.50" for a price input. */
export function centsToInput(cents: number): string {
    return (cents / 100).toFixed(2);
}

/** Quantity without trailing zeros: 1, 1.5, 0.25. */
export function qty(n: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-IE', { maximumFractionDigits: 2 }).format(n);
}
