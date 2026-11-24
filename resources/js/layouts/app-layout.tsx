import { AppSidebar, useNav } from '@/components/app-sidebar';
import { LogoMark } from '@/components/logo';
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
import type { SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bell, ChevronRight, CircleCheck, House, LogOut, Moon, Search, Settings, TriangleAlert, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type Crumb = { label: string; href?: string };

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
    const { appearance, updateAppearance } = useAppearance();
    const [mini, setMini] = useState(() => typeof window !== 'undefined' && localStorage.getItem('sidebar-mini') === '1');
    const [toast, setToast] = useState<{ text: string; warn: boolean; undo: number | null } | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // The server sets these on the first load; keep them right after client-side navigation too.
        document.documentElement.dataset.accent = workshop.accent;
        document.documentElement.lang = page.props.locale;
    }, [workshop.accent, page.props.locale]);

    useEffect(() => {
        if (!flash?.status && !flash?.warning) return;
        // A warning (e.g. "3 jobs fall in this time off") stays longer than a plain "Saved". A move can be undone.
        const undo = flash.undo ?? null;
        setToast(flash.warning ? { text: flash.warning, warn: true, undo } : { text: undo ? t('Job moved.') : t('Saved'), warn: false, undo });
        const id = setTimeout(() => setToast(null), flash.warning ? 9000 : undo ? 6000 : 2200);
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
    const counts = shell?.counts;

    return (
        <>
            <Head title={title} />
            <a
                href="#main"
                className="focus:bg-panel focus:text-fg sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:px-3 focus:py-2 focus:shadow-lg"
            >
                {t('Skip to content')}
            </a>

            <AppSidebar mini={mini} onToggle={toggleMini} />

            <div
                className={cn(
                    'min-h-screen transition-[padding] duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
                    mini ? 'md:pl-[70px]' : 'md:pl-[248px]',
                )}
            >
                {/* ---------- header ---------- */}
                <header className="border-line bg-panel/95 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 shadow-[0_1px_8px_rgba(0,0,0,.04)] backdrop-blur md:h-16 md:px-6">
                    <span className="flex min-w-0 items-center gap-2 md:hidden">
                        <LogoMark size={30} className="text-fg" />
                        <span className="truncate text-[15px] font-semibold">{workshop.name}</span>
                    </span>
                    <nav className="hidden min-w-0 items-center gap-1.5 text-[12.5px] md:flex" aria-label="Breadcrumb">
                        <Link
                            href={route('overview')}
                            className="text-muted-foreground hover:text-p flex items-center gap-1.5 font-medium whitespace-nowrap transition-colors"
                        >
                            <House className="size-[15px]" strokeWidth={1.8} />
                            {workshop.name}
                        </Link>
                        {crumbs.map((c) => (
                            <span key={c.label} className="flex items-center gap-1.5 whitespace-nowrap">
                                <ChevronRight className="text-faint size-3.5" strokeWidth={2} />
                                {c.href ? (
                                    <Link href={c.href} className="text-muted-foreground hover:text-p font-medium transition-colors">
                                        {c.label}
                                    </Link>
                                ) : (
                                    <span className="text-muted-foreground font-medium">{c.label}</span>
                                )}
                            </span>
                        ))}
                        <ChevronRight className="text-faint size-3.5 shrink-0" strokeWidth={2} />
                        <span className="text-fg truncate text-[13.5px] font-semibold tracking-tight">{title}</span>
                    </nav>
                    {shell && (
                        <span
                            className={cn(
                                'hidden items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold whitespace-nowrap lg:inline-flex',
                                shell.hours ? 'border-p-line bg-p-soft text-p-ink' : 'border-hold-line bg-hold-bg text-hold-ink',
                            )}
                        >
                            <span className={cn('size-2 rounded-full', shell.hours ? 'bg-ok' : 'bg-hold')} />
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
                            className="relative hidden w-[310px] items-center xl:flex"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const q = new FormData(e.currentTarget).get('q');
                                router.get(route('customers'), { q: String(q ?? '') });
                            }}
                        >
                            <Search className="text-muted-foreground pointer-events-none absolute left-3 size-[17px]" strokeWidth={1.8} />
                            <input
                                ref={searchRef}
                                name="q"
                                aria-label={t('Search customers, phones, plates')}
                                placeholder={t('Search customers, phones, plates')}
                                className="bg-subtle focus:border-p focus:bg-panel h-10 w-full rounded-lg border border-transparent pr-14 pl-9 text-[13px] transition-[background-color,border-color,box-shadow] duration-200 outline-none focus:shadow-[0_0_0_3px_var(--p-soft)]"
                            />
                            <kbd className="border-line bg-panel text-muted-foreground absolute right-2.5 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                                Ctrl K
                            </kbd>
                        </form>
                        <span className="bg-line hidden h-5 w-px xl:block" />
                        <Link
                            href={route('jobs', { flag: 'call' })}
                            aria-label={t('Customers to call')}
                            title={t('Customers to call')}
                            className="text-fg-2 hover:bg-subtle hover:text-fg relative grid size-9 place-items-center rounded-lg"
                        >
                            <Bell className={cn('size-[20px]', !!counts?.toCall && 'bell-ring')} strokeWidth={1.8} />
                            {!!counts?.toCall && (
                                <span className="bg-over border-panel pop-in absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full border-2 px-1 font-mono text-[10px] font-bold text-white">
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
                <main
                    id="main"
                    tabIndex={-1}
                    className="page-enter flex min-w-0 flex-col gap-5 px-4 pt-4 pb-24 outline-none md:px-6 md:pt-5 md:pb-10"
                >
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
                        const active = item.active;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-[color,transform] duration-150 active:scale-[.94]',
                                    active ? 'text-p' : 'text-muted-foreground',
                                )}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="tab-active"
                                        className="bg-p absolute -top-px h-[3px] w-8 rounded-b-full"
                                        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                                    />
                                )}
                                <item.icon className="size-[22px]" strokeWidth={1.8} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.text}
                        role="status"
                        initial={{ opacity: 0, y: 16, scale: 0.96, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 8, scale: 0.98, x: '-50%', transition: { duration: 0.15 } }}
                        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                        className={cn(
                            'fixed bottom-24 left-1/2 z-[60] flex max-w-[calc(100vw-24px)] items-start gap-2 rounded-lg px-4 py-[11px] text-[13.5px] shadow-lg md:bottom-6',
                            toast.warn ? 'border-parts-line bg-parts-bg text-parts-ink w-[440px] border' : 'bg-[#141618] text-white',
                        )}
                    >
                        {toast.warn ? (
                            <TriangleAlert className="mt-0.5 size-[17px] shrink-0" strokeWidth={1.8} />
                        ) : (
                            <CircleCheck className="size-[17px]" strokeWidth={1.8} />
                        )}
                        <span className="flex-1">{toast.text}</span>
                        {toast.undo !== null && (
                            <button
                                type="button"
                                onClick={() => {
                                    const id = toast.undo!;
                                    setToast(null);
                                    router.post(route('jobs.undo-move', id), {}, { preserveScroll: true, preserveState: true });
                                }}
                                className={cn(
                                    'press -my-1 ml-2 rounded-md px-2 py-1 text-[13px] font-semibold transition-colors duration-150',
                                    toast.warn ? 'border-parts-line hover:bg-panel/60 border' : 'text-brand hover:bg-white/10',
                                )}
                            >
                                {t('Undo')}
                            </button>
                        )}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
