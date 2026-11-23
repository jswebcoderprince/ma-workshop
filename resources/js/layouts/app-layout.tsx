import { LogoMark } from '@/components/logo';
import { Card, IconButton, IconLink, Switch } from '@/components/ui-kit';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { initials } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarRange,
    CalendarSearch,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleHelp,
    HardHat,
    House,
    LayoutDashboard,
    LogOut,
    MessageSquareText,
    ReceiptText,
    Search,
    Settings,
    UserRound,
    Users,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

type NavItem = { name: string; label: string; icon: LucideIcon; match: string };

function useNav(): { section: string; items: NavItem[] }[] {
    const t = useT();
    return [
        {
            section: t('Workshop'),
            items: [
                { name: 'overview', label: t('Overview'), icon: LayoutDashboard, match: '/' },
                { name: 'calendar', label: t('Calendar'), icon: CalendarRange, match: '/calendar' },
                { name: 'jobs', label: t('Jobs'), icon: Wrench, match: '/jobs' },
                { name: 'customers', label: t('Customers'), icon: Users, match: '/customers' },
                { name: 'mechanics', label: t('Mechanics'), icon: HardHat, match: '/mechanics' },
            ],
        },
        {
            section: t('Office'),
            items: [
                { name: 'invoices', label: t('Invoices'), icon: ReceiptText, match: '/invoices' },
                { name: 'settings.index', label: t('Settings'), icon: Settings, match: '/settings' },
            ],
        },
    ];
}

function isActive(url: string, match: string) {
    const path = url.split('?')[0];
    return match === '/' ? path === '/' : path === match || path.startsWith(match + '/');
}

export type Crumb = { label: string; href?: string };

export default function AppLayout({
    title,
    crumbs = [],
    actions,
    children,
}: {
    title: string;
    crumbs?: Crumb[];
    actions?: ReactNode;
    children: ReactNode;
}) {
    const t = useT();
    const page = usePage<SharedData>();
    const { auth, counts, workshop, flash } = page.props;
    const nav = useNav();
    const { appearance, updateAppearance } = useAppearance();
    const [mini, setMini] = useState(() => typeof window !== 'undefined' && localStorage.getItem('sidebar-mini') === '1');
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        // The server sets these on the first load; keep them right after client-side navigation too.
        document.documentElement.dataset.accent = workshop.accent;
        document.documentElement.lang = page.props.locale;
    }, [workshop.accent, page.props.locale]);

    useEffect(() => {
        if (!flash?.status) return;
        setToast(t('Saved'));
        const id = setTimeout(() => setToast(null), 2200);
        return () => clearTimeout(id);
    }, [flash, t]);

    const toggleMini = () => {
        setMini((v) => {
            localStorage.setItem('sidebar-mini', v ? '0' : '1');
            return !v;
        });
    };

    const user = auth.user!;
    const dark = appearance === 'dark';

    return (
        <>
            <Head title={title} />
            <div
                className={cn(
                    'grid min-h-screen grid-rows-[58px_minmax(0,1fr)] md:grid-rows-[64px_minmax(0,1fr)]',
                    mini ? 'md:grid-cols-[76px_minmax(0,1fr)]' : 'md:grid-cols-[248px_minmax(0,1fr)]',
                )}
            >
                {/* logo block */}
                <div
                    className={cn(
                        'border-line bg-panel sticky top-0 z-20 hidden items-center gap-2.5 border-r border-b md:flex',
                        mini ? 'justify-center' : 'pr-3.5 pl-5',
                    )}
                >
                    <LogoMark />
                    {!mini && (
                        <>
                            <div className="leading-tight whitespace-nowrap">
                                <div className="text-[16.5px] font-semibold tracking-[-0.01em]">{workshop.name}</div>
                                <div className="text-muted-foreground text-xs">{t('Workshop planner')}</div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleMini}
                                aria-label={t('Collapse menu')}
                                className="text-muted-foreground hover:bg-hover ml-auto grid size-[30px] place-items-center rounded-lg"
                            >
                                <ChevronLeft className="size-[17px]" strokeWidth={1.7} />
                            </button>
                        </>
                    )}
                </div>

                {/* top bar */}
                <header className="border-line bg-panel sticky top-0 z-20 flex items-center gap-3 border-b px-3.5 md:px-6">
                    <span className="flex items-center gap-2.5 text-[17px] font-semibold md:hidden">
                        <LogoMark size={30} />
                        {workshop.name}
                    </span>
                    {mini && (
                        <button
                            type="button"
                            onClick={toggleMini}
                            aria-label={t('Expand menu')}
                            className="text-muted-foreground hover:bg-hover hidden size-[30px] place-items-center rounded-lg md:grid"
                        >
                            <ChevronRight className="size-[17px]" strokeWidth={1.7} />
                        </button>
                    )}
                    <form
                        className="relative hidden max-w-[380px] flex-1 md:block"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const q = new FormData(e.currentTarget).get('q');
                            router.get(route('customers'), { q: String(q ?? '') });
                        }}
                    >
                        <Search className="text-muted-foreground absolute top-3 left-[13px] size-4" strokeWidth={1.7} />
                        <input
                            name="q"
                            aria-label={t('Search customers, phones, plates')}
                            placeholder={t('Search customers, phones, plates')}
                            className="bg-subtle focus:bg-panel h-10 w-full rounded-[10px] pr-4 pl-10 outline-none focus:shadow-[0_0_0_2px_var(--p-line)]"
                        />
                    </form>
                    <div className="ml-auto flex items-center gap-2 md:gap-3.5">
                        <Switch
                            className="hidden md:block"
                            checked={dark}
                            onChange={(v) => updateAppearance(v ? 'dark' : 'light')}
                            label={t('Dark mode')}
                        />
                        <IconLink
                            href={route('jobs', { filter: 'notify' })}
                            icon={MessageSquareText}
                            label={t('Customers to call')}
                            badge={counts?.toCall}
                        />
                        <IconLink href={route('calendar')} icon={CalendarSearch} label={t('Find a slot')} className="hidden md:grid" />
                        <DropdownMenu>
                            <DropdownMenuTrigger className="grid size-[38px] place-items-center rounded-full bg-[linear-gradient(135deg,#f8b4d9,#a78bfa)] font-semibold text-white shadow-[0_0_0_2px_var(--p-line)] outline-none">
                                {initials(user.name)}
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
                                    <Link href={route('logout')} method="post" as="button" className="w-full">
                                        <LogOut /> {t('Log out')}
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* sidebar */}
                <aside className="border-line bg-panel sticky top-16 hidden h-[calc(100vh-64px)] flex-col border-r px-3.5 py-[18px] md:flex">
                    <nav className="flex flex-col gap-[3px]">
                        {nav.map((group) => (
                            <div key={group.section} className="flex flex-col gap-[3px]">
                                {!mini && <div className="text-faint px-3 pt-3 pb-1.5 text-xs font-medium">{group.section}</div>}
                                {group.items.map((item) => {
                                    const active = isActive(page.url, item.match);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={route(item.name)}
                                            title={item.label}
                                            aria-current={active ? 'page' : undefined}
                                            className={cn(
                                                'text-fg-2 hover:bg-hover flex items-center gap-3 rounded-[9px] py-[9px] font-medium whitespace-nowrap',
                                                mini ? 'justify-center px-0' : 'px-3',
                                                active && 'bg-p hover:bg-p text-white shadow-[0_6px_14px_-6px_var(--p)]',
                                            )}
                                        >
                                            <item.icon className="size-[17px]" strokeWidth={1.7} />
                                            {!mini && <span>{item.label}</span>}
                                            {!mini && item.name === 'jobs' && counts && (
                                                <span
                                                    className={cn(
                                                        'ml-auto text-xs font-semibold',
                                                        active ? 'text-white/85' : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {counts.openJobs}
                                                </span>
                                            )}
                                            {!mini && item.name !== 'jobs' && (
                                                <ChevronRight className={cn('ml-auto size-[15px]', active ? 'text-white/85' : 'text-faint')} />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                    <div className={cn('border-line mt-auto flex border-t pt-3.5', mini ? 'flex-col items-center gap-1.5' : 'justify-around')}>
                        <IconButton icon={CircleHelp} label={t('Help')} />
                        <IconLink href={route('settings.index')} icon={Settings} label={t('Settings')} />
                        <IconLink href={route('logout')} method="post" icon={LogOut} label={t('Log out')} />
                    </div>
                </aside>

                {/* content */}
                <main className="flex min-w-0 flex-col gap-3.5 px-3 pt-3.5 pb-24 md:gap-5 md:px-6 md:pt-[22px] md:pb-10">
                    <Card className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                        <div className="flex items-center gap-2 text-[15px] font-medium">
                            <Link href={route('overview')} className="text-p hidden items-center gap-2 md:flex">
                                <House className="text-fg-2 size-[17px]" strokeWidth={1.7} />
                                {t('Dashboard')}
                            </Link>
                            {crumbs.map((c) => (
                                <span key={c.label} className="hidden items-center gap-2 md:flex">
                                    <span className="text-muted-foreground">/</span>
                                    {c.href ? (
                                        <Link href={c.href} className="text-p">
                                            {c.label}
                                        </Link>
                                    ) : (
                                        <span className="text-p">{c.label}</span>
                                    )}
                                </span>
                            ))}
                            <span className="text-muted-foreground hidden md:inline">/</span>
                            <b className="text-fg md:text-fg-2 text-base font-semibold md:text-[15px] md:font-medium">{title}</b>
                        </div>
                        <span className="flex-1" />
                        {actions}
                    </Card>
                    {children}
                </main>
            </div>

            {/* phone tab bar */}
            <nav className="border-line bg-panel fixed inset-x-0 bottom-0 z-30 flex border-t px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] md:hidden">
                {[nav[0].items[0], nav[0].items[1], nav[0].items[2], nav[0].items[3], nav[1].items[1]].map((item) => (
                    <Link
                        key={item.name}
                        href={route(item.name)}
                        className={cn(
                            'text-muted-foreground flex min-h-12 flex-1 flex-col items-center gap-[3px] py-1 text-[11.5px] font-medium',
                            isActive(page.url, item.match) && 'text-p',
                        )}
                    >
                        <item.icon className="size-[21px]" strokeWidth={1.7} />
                        {item.label}
                    </Link>
                ))}
            </nav>

            {toast && (
                <div
                    role="status"
                    className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#1d1b38] px-4 py-[11px] text-white shadow-lg md:bottom-6"
                >
                    <CircleCheck className="size-[17px]" strokeWidth={1.7} />
                    {toast}
                </div>
            )}
        </>
    );
}
