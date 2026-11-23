/** Dates, durations and money in the workshop's two languages. Dates are plain Y-m-d strings (workshop-local). */

type Locale = 'en' | 'lt';

const WD: Record<Locale, string[]> = {
    en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    lt: ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'],
};
const WD_SHORT: Record<Locale, string[]> = {
    en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    lt: ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'],
};
const MONTH: Record<Locale, string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    // genitive, as used in "lapkričio 23 d."
    lt: ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'],
};
const MONTH_ABBR: Record<Locale, string[]> = {
    en: MONTH.en,
    lt: ['saus.', 'vas.', 'kov.', 'bal.', 'geg.', 'birž.', 'liep.', 'rugp.', 'rugs.', 'spal.', 'lapkr.', 'gruod.'],
};

function parts(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    const js = new Date(Date.UTC(y, m - 1, d));
    return { y, m: m - 1, d, wd: (js.getUTCDay() + 6) % 7 };
}

/** "Mon, 23 Nov" / "Pr, lapkričio 23 d." */
export function formatDate(date: string, locale: Locale, withWeekday = true): string {
    const p = parts(date);
    if (locale === 'lt') return `${withWeekday ? WD.lt[p.wd] + ', ' : ''}${MONTH.lt[p.m]} ${p.d} d.`;
    return `${withWeekday ? WD.en[p.wd] + ', ' : ''}${p.d} ${MONTH.en[p.m]}`;
}

/** "23 Nov" / "lapkr. 23" */
export function formatShortDate(date: string, locale: Locale): string {
    const p = parts(date);
    return locale === 'lt' ? `${MONTH_ABBR.lt[p.m]} ${p.d}` : `${p.d} ${MONTH.en[p.m]}`;
}

export function weekdayShort(date: string, locale: Locale): string {
    return WD_SHORT[locale][parts(date).wd];
}

/** Quarters → "1½ d" / "1½ d." */
export function formatDays(quarters: number, locale: Locale, withUnit = true): string {
    const whole = Math.floor(quarters / 4);
    const frac = ['', '¼', '½', '¾'][quarters % 4];
    const n = `${whole || (frac ? '' : '0')}${frac}`;
    return withUnit ? `${n}${locale === 'lt' ? ' d.' : ' d'}` : n;
}

export function formatMoney(value: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(value);
}

export function initials(name: string): string {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase();
}
