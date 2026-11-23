import { Switch } from '@/components/ui-kit';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { formatDate, initials } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RosterEntry, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarRange,
    ChevronsLeft,
    ChevronsRight,
    CircleCheck,
    HardHat,
    LayoutGrid,
    LogOut,
    Moon,
    ReceiptText,
    Search,
    Settings,
    TriangleAlert,
    UserRound,
    Users,
    Wrench,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type NavItem = { name: string; label: string; icon: LucideIcon; match: string };

function useNav(): NavItem[] {
    const t = useT();
    return [
        { name: 'overview', label: t('Overview'), icon: LayoutGrid, match: '/' },
        { name: 'calendar', label: t('Calendar'), icon: CalendarRange, match: '/calendar' },
        { name: 'jobs', label: t('Jobs'), icon: Wrench, match: '/jobs' },
        { name: 'customers', label: t('Customers'), icon: Users, match: '/customers' },
        { name: 'mechanics', label: t('Mechanics'), icon: HardHat, match: '/mechanics' },
        { name: 'invoices', label: t('Invoices'), icon: ReceiptText, match: '/invoices' },
        { name: 'settings.index', label: t('Settings'), icon: Settings, match: '/settings' },
    ];
}

function isActive(url: string, match: string) {
    const path = url.split('?')[0];
    return match === '/' ? path === '/' : path === match || path.startsWith(match + '/');
}

export type Crumb = { label: string; href?: string };

/** A mechanic's state today as a short badge for the sidebar roster. */
function useRosterBadge() {
    const t = useT();
    return (r: RosterEntry): { text: string; dot: string; badge: string } => {
        if (r.status !== 'working') {
            const text =
                r.status === 'holiday'
                    ? t('Holiday')
                    : r.status === 'day_off'
                      ? t('Day off')
                      : r.status === 'sick'
                        ? t('Sick leave')
                        : r.status === 'closed'
                          ? t('Closed')
                          : t('Not working');
            return { text, dot: 'bg-hold', badge: 'bg-side-2 text-side-muted' };
        }
        const pct = r.available ? Math.round((r.booked / r.available) * 100) : 0;
        if (pct >= 100) return { text: t(':n% load', { n: pct }), dot: 'bg-over', badge: 'bg-over-bg text-over-ink' };
        if (pct === 0) return { text: t('Free today'), dot: 'bg-open', badge: 'bg-open-bg text-open-ink' };
        return {
            text: t(':n% load', { n: pct }),
            dot: pct >= 75 ? 'bg-parts' : 'bg-ok',
            badge: pct >= 75 ? 'bg-parts-bg text-parts-ink' : 'bg-ok-soft text-ok-ink',
        };
    };
}

export default function AppLayout({
    title,
    subtitle,
    titleExtra,
    crumbs = [],
    actions,
    children,
}: {
    title: string;
    subtitle?: ReactNode;
    titleExtra?: ReactNode;
    crumbs?: Crumb[];
    actions?: ReactNode;
    children: ReactNode;
}) {
    const t = useT();
    const locale = useLocale();
    const page = usePage<SharedData>();
    const { auth, shell, workshop, flash } = page.props;
    const nav = useNav();
    const rosterBadge = useRosterBadge();
    const { appearance, updateAppearance } = useAppearance();
    const [mini, setMini] = useState(() => typeof window !== 'undefined' && localStorage.getItem('sidebar-mini') === '1');
    const [toast, setToast] = useState<{ text: string; warn: boolean } | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // The server sets these on the first load; keep them right after client-side navigation too.
        document.documentElement.dataset.accent = workshop.accent;
        document.documentElement.lang = page.props.locale;
    }, [workshop.accent, page.props.locale]);

    useEffect(() => {
        if (!flash?.status && !flash?.warning) return;
        // A warning (e.g. "3 jobs fall in this time off") stays longer than a plain "Saved".
        setToast(flash.warning ? { text: flash.warning, warn: true } : { text: t('Saved'), warn: false });
        const id = setTimeout(() => setToast(null), flash.warning ? 9000 : 2200);
        return () => clearTimeout(id);
    }, [flash, t]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggleMini = () =>
        setMini((v) => {
            localStorage.setItem('sidebar-mini', v ? '0' : '1');
            return !v;
        });

    const user = auth.user!;
    const dark = appearance === 'dark';
    const roster = shell?.roster ?? [];
    const working = roster.filter((r) => r.status === 'working');
    const booked = working.reduce((a, r) => a + r.booked, 0);
    const available = working.reduce((a, r) => a + r.available, 0);
    const bookedPct = available ? Math.round((booked / available) * 100) : 0;
    const counts = shell?.counts;

    return (
        <>
            <Head title={title} />

            {/* ---------- dark sidebar (desktop) ---------- */}
            <aside
                className={cn(
                    'bg-side text-side-fg fixed inset-y-0 left-0 z-40 hidden flex-col justify-between overflow-y-auto md:flex',
                    mini ? 'w-16' : 'w-[264px]',
                )}
            >
                <div className="flex flex-col">
                    <div className={cn('border-side-line flex h-16 items-center gap-2.5 border-b', mini ? 'justify-center' : 'px-4')}>
                        <span className="bg-p grid size-9 shrink-0 place-items-center rounded-lg text-[13px] font-bold tracking-wider text-white shadow-md">
                            MA
                        </span>
                        {!mini && (
                            <>
                                <div className="min-w-0 leading-tight">
                                    <div className="truncate text-[14px] font-semibold text-white">{workshop.name}</div>
                                    <div className="text-side-muted text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                                        {t('Workshop planner')}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleMini}
                                    aria-label={t('Collapse menu')}
                                    className="text-side-muted hover:bg-side-2 ml-auto grid size-7 place-items-center rounded-md hover:text-white"
                                >
                                    <ChevronsLeft className="size-4" />
                                </button>
                            </>
                        )}
                    </div>

                    {mini && (
                        <button
                            type="button"
                            onClick={toggleMini}
                            aria-label={t('Expand menu')}
                            className="text-side-muted hover:bg-side-2 mx-auto mt-3 grid size-8 place-items-center rounded-md hover:text-white"
                        >
                            <ChevronsRight className="size-4" />
                        </button>
                    )}

                    {!mini && shell && (
                        <div className="bg-side-2/70 border-side-line mx-3 mt-4 rounded-lg border p-3">
                            <div className="mb-1.5 flex items-center justify-between text-[12px]">
                                <span className="text-side-muted font-medium">{t('Booked today')}</span>
                                <span className="font-mono font-semibold text-emerald-400">
                                    {shell.hours ? t(':booked of :total quarters', { booked, total: available }) : t('Closed')}
                                </span>
                            </div>
                            <div className="bg-side h-1.5 overflow-hidden rounded-full">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${bookedPct}%` }} />
                            </div>
                            <div className="text-side-muted mt-1.5 flex items-center justify-between text-[11px]">
                                <span>{shell.hours ? `${shell.hours.open} – ${shell.hours.close}` : t('Workshop closed today')}</span>
                                <span className="font-mono">{bookedPct}%</span>
                            </div>
                        </div>
                    )}

                    <div className={cn('pt-4', mini ? 'px-2' : 'px-3')}>
                        {!mini && (
                            <div className="text-side-muted px-2 pb-1.5 text-[10px] font-bold tracking-[0.08em] uppercase">{t('Navigation')}</div>
                        )}
                        <nav className="flex flex-col gap-1">
                            {nav.map((item) => {
                                const active = isActive(page.url, item.match);
                                return (
                                    <Link
                                        key={item.name}
                                        href={route(item.name)}
                                        title={item.label}
                                        aria-current={active ? 'page' : undefined}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors',
                                            mini ? 'justify-center px-0' : 'px-3',
                                            active ? 'bg-p font-semibold text-white shadow-sm' : 'text-side-muted hover:bg-side-2 hover:text-white',
                                        )}
                                    >
                                        <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                                        {!mini && <span className="flex-1">{item.label}</span>}
                                        {!mini && item.name === 'jobs' && counts && (
                                            <span
                                                className={cn(
                                                    'rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold',
                                                    active ? 'bg-white/20' : 'bg-side-2 text-side-fg',
                                                )}
                                            >
                                                {counts.openJobs}
                                            </span>
                                        )}
                                        {!mini && item.name === 'calendar' && !!counts?.warnings && (
                                            <span className="bg-parts size-2 rounded-full" title={t('Overlaps')} />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {!mini && roster.length > 0 && (
                        <div className="px-3 pt-5 pb-3">
                            <div className="text-side-muted flex items-center justify-between px-2 pb-2 text-[10px] font-bold tracking-[0.08em] uppercase">
                                <span>{t('Mechanics today')}</span>
                                <span className="font-mono text-[11px] normal-case">
                                    {t(':n / :total in', { n: working.length, total: roster.length })}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 px-1">
                                {roster.map((r) => {
                                    const b = rosterBadge(r);
                                    return (
                                        <div
                                            key={r.id}
                                            className={cn(
                                                'flex items-center justify-between py-1 text-[12.5px]',
                                                r.status !== 'working' && 'opacity-60',
                                            )}
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className={cn('size-2 shrink-0 rounded-full', b.dot)} />
                                                <span className="truncate font-medium">{r.name}</span>
                                            </span>
                                            <span
                                                className={cn('rounded px-1.5 py-px font-mono text-[10px] font-semibold whitespace-nowrap', b.badge)}
                                            >
                                                {b.text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className={cn('border-side-line border-t p-3', mini && 'px-2')}>
                    <div
                        className={cn(
                            'bg-side-2/60 border-side-line flex items-center rounded-lg border p-2',
                            mini ? 'justify-center' : 'justify-between',
                        )}
                    >
                        {!mini && (
                            <span className="text-side-fg flex items-center gap-2 text-[11.5px] font-medium">
                                <Moon className="size-4" />
                                {t('Dark mode')}
                            </span>
                        )}
                        <Switch checked={dark} onChange={(v) => updateAppearance(v ? 'dark' : 'light')} label={t('Dark mode')} />
                    </div>
                </div>
            </aside>

            <div className={cn('min-h-screen', mini ? 'md:pl-16' : 'md:pl-[264px]')}>
                {/* ---------- header ---------- */}
                <header className="border-line bg-panel/95 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 shadow-[0_1px_8px_rgba(0,0,0,.04)] backdrop-blur md:h-16 md:px-6">
                    <span className="flex min-w-0 items-center gap-2 md:hidden">
                        <span className="bg-p grid size-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold text-white">MA</span>
                        <span className="truncate text-[15px] font-semibold">{workshop.name}</span>
                    </span>
                    <nav className="hidden min-w-0 items-center gap-2 text-[12.5px] md:flex" aria-label="Breadcrumb">
                        <Link href={route('overview')} className="text-muted-foreground hover:text-fg font-medium whitespace-nowrap">
                            {workshop.name}
                        </Link>
                        {crumbs.map((c) => (
                            <span key={c.label} className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-line-strong font-bold">/</span>
                                {c.href ? (
                                    <Link href={c.href} className="text-muted-foreground hover:text-fg font-medium">
                                        {c.label}
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground font-medium">{c.label}</span>
                                )}
                            </span>
                        ))}
                        <span className="text-line-strong font-bold">/</span>
                        <span className="text-fg truncate text-[13.5px] font-bold tracking-tight">{title}</span>
                    </nav>
                    {shell && (
                        <span
                            className={cn(
                                'hidden items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold whitespace-nowrap lg:inline-flex',
                                shell.hours ? 'border-p-line bg-p-soft text-p-ink' : 'border-hold-line bg-hold-bg text-hold-ink',
                            )}
                        >
                            <span className={cn('size-2 rounded-full', shell.hours ? 'bg-p animate-pulse' : 'bg-hold')} />
                            {shell.hours ? t('Open today') : t('Closed today')}
                            {shell.hours && (
                                <span className="font-mono text-[11px] font-normal opacity-80">
                                    · {shell.hours.open} – {shell.hours.close}
                                </span>
                            )}
                        </span>
                    )}

                    <div className="ml-auto flex items-center gap-2 md:gap-3">
                        <form
                            className="relative hidden w-72 items-center xl:flex"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const q = new FormData(e.currentTarget).get('q');
                                router.get(route('customers'), { q: String(q ?? '') });
                            }}
                        >
                            <Search className="text-faint pointer-events-none absolute left-3 size-[17px]" strokeWidth={1.8} />
                            <input
                                ref={searchRef}
                                name="q"
                                aria-label={t('Search customers, phones, plates')}
                                placeholder={t('Search customers, phones, plates')}
                                className="border-line bg-hover focus:border-p focus:bg-panel h-9 w-full rounded-lg border pr-14 pl-9 text-[12.5px] outline-none focus:shadow-[0_0_0_3px_var(--p-soft)]"
                            />
                            <kbd className="border-line bg-panel text-muted-foreground absolute right-2 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                                Ctrl K
                            </kbd>
                        </form>
                        <span className="bg-line hidden h-5 w-px xl:block" />
                        <Link
                            href={route('jobs', { filter: 'notify' })}
                            aria-label={t('Customers to call')}
                            title={t('Customers to call')}
                            className="text-fg-2 hover:bg-subtle hover:text-fg relative grid size-9 place-items-center rounded-lg"
                        >
                            <Bell className="size-[20px]" strokeWidth={1.8} />
                            {!!counts?.toCall && (
                                <span className="bg-over border-panel absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full border-2 px-1 font-mono text-[10px] font-bold text-white">
                                    {counts.toCall}
                                </span>
                            )}
                        </Link>
                        <span className="bg-line hidden h-5 w-px md:block" />
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-0.5 text-left outline-none md:pr-2">
                                <span className="bg-p ring-p-soft grid size-8 place-items-center rounded-full text-[12px] font-bold text-white ring-2">
                                    {initials(user.name)}
                                </span>
                                <span className="hidden flex-col leading-tight md:flex">
                                    <span className="text-fg text-[12.5px] font-bold">{user.name}</span>
                                    <span className="text-muted-foreground text-[11px]">{t('Owner')}</span>
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-muted-foreground text-xs">{user.email}</div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('settings.account')} className="w-full">
                                        <UserRound /> {t('Account')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={route('settings.index')} className="w-full">
                                        <Settings /> {t('Settings')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => updateAppearance(dark ? 'light' : 'dark')}>
                                    <Moon /> {t('Dark mode')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('logout')} method="post" as="button" className="w-full">
                                        <LogOut /> {t('Log out')}
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* ---------- page ---------- */}
                <main className="flex min-w-0 flex-col gap-5 px-4 pt-4 pb-24 md:px-6 md:pt-5 md:pb-10">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-[24px] leading-8 font-bold tracking-[-0.015em] md:text-[30px] md:leading-[38px] md:tracking-[-0.02em]">
                                    {title}
                                </h1>
                                {titleExtra}
                            </div>
                            {subtitle !== undefined ? (
                                <p className="text-muted-foreground text-[14px]">{subtitle}</p>
                            ) : (
                                shell && (
                                    <p className="text-muted-foreground text-[14px]">
                                        {t('Today')} · {formatDate(shell.today, locale)} · {t('Week')} {shell.week}
                                    </p>
                                )
                            )}
                        </div>
                        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                    </div>
                    {children}
                </main>
            </div>

            {/* ---------- phone tab bar ---------- */}
            <nav className="bg-panel/95 fixed inset-x-0 bottom-0 z-40 flex shadow-[0_-2px_12px_rgba(0,0,0,.04)] backdrop-blur md:hidden">
                <div className="flex h-16 w-full items-center justify-around px-1 pb-[env(safe-area-inset-bottom,0px)]">
                    {nav.slice(0, 5).map((item) => {
                        const active = isActive(page.url, item.match);
                        return (
                            <Link
                                key={item.name}
                                href={route(item.name)}
                                className={cn(
                                    'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                                    active ? 'text-p' : 'text-muted-foreground',
                                )}
                            >
                                <item.icon className="size-[22px]" strokeWidth={1.8} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {toast && (
                <div
                    role="status"
                    className={cn(
                        'fixed bottom-24 left-1/2 z-[60] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-start gap-2 rounded-lg px-4 py-[11px] text-[13.5px] shadow-lg md:bottom-6',
                        toast.warn ? 'border-parts-line bg-parts-bg text-parts-ink w-[440px] border' : 'bg-[#0f172a] text-white',
                    )}
                >
                    {toast.warn ? (
                        <TriangleAlert className="mt-0.5 size-[17px] shrink-0" strokeWidth={1.8} />
                    ) : (
                        <CircleCheck className="size-[17px]" strokeWidth={1.8} />
                    )}
                    <span className="flex-1">{toast.text}</span>
                    {toast.warn && (
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            aria-label={t('Close')}
                            className="-mr-1 grid size-6 place-items-center rounded-md hover:bg-black/5"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
            )}
        </>
    );
}
