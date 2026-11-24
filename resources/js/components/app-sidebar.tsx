import { LogoMark } from '@/components/logo';
import { useAppearance } from '@/hooks/use-appearance';
import { initials } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RosterEntry, SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CirclePlay,
    Clock3,
    FileCheck2,
    FileX2,
    Grid3x3,
    HardHat,
    LayoutGrid,
    List,
    ListTodo,
    LogOut,
    Moon,
    Package,
    PhoneCall,
    ReceiptText,
    Rows3,
    Settings,
    SlidersHorizontal,
    Sun,
    TriangleAlert,
    UserRound,
    Users,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';

/*
 * Sidebar after the owner's reference picture (2026-11-24): white panel, icon + name + "›" on every row, the open page
 * as a filled pill, and a small menu that slides out to the right of a row with its sub-pages. Three round buttons at
 * the bottom. Collapsed, only the icons stay and every row opens its menu.
 */

export const SIDEBAR_WIDE = 248;
export const SIDEBAR_MINI = 70;

type Sub = {
    key: string;
    label: string;
    href: string;
    icon?: LucideIcon;
    active?: boolean;
    count?: number;
    alarm?: boolean;
    mechanic?: RosterEntry;
};

export type NavItem = {
    name: string;
    label: string;
    icon: LucideIcon;
    href: string;
    active: boolean;
    count?: number;
    alert?: number;
    subs?: Sub[];
    note?: ReactNode;
    foot?: ReactNode;
};

/** Why a mechanic is not working today. */
function useOffLabel() {
    const t = useT();
    return (status: RosterEntry['status']) =>
        status === 'holiday'
            ? t('Holiday')
            : status === 'day_off'
              ? t('Day off')
              : status === 'sick'
                ? t('Sick leave')
                : status === 'closed'
                  ? t('Closed')
                  : t('Not working');
}

/** The menu, with the sub-pages of each part and which one is open now (from the address). */
export function useNav(): NavItem[] {
    const t = useT();
    const { url, props } = usePage<SharedData>();
    const shell = props.shell;
    const counts = shell?.counts;
    const [path, qs = ''] = url.split('?');
    const q = new URLSearchParams(qs);
    const on = (m: string) => (m === '/' ? path === '/' : path === m || path.startsWith(m + '/'));

    const onCalendar = path === '/calendar';
    const view = onCalendar ? (q.get('view') ?? 'week') : null;
    // Switching the view from the menu keeps the shown date and mechanic.
    const keep = onCalendar ? { date: q.get('date') ?? undefined, mechanic: q.get('mechanic') ?? undefined } : {};
    const status = path === '/jobs' ? (q.get('status') ?? 'open') : null;
    const flag = path === '/jobs' ? q.get('flag') : null;
    const invoices = path === '/invoices' ? (q.get('status') ?? 'all') : null;
    const roster = shell?.roster ?? [];
    const working = roster.filter((r) => r.status === 'working');
    const booked = working.reduce((a, r) => a + r.booked, 0);
    const available = working.reduce((a, r) => a + r.available, 0);

    const jobTab = (value: string, label: string, icon: LucideIcon): Sub => ({
        key: value,
        label,
        icon,
        href: route('jobs', value === 'open' ? {} : { status: value }),
        active: status === value && !flag,
    });
    const setting = (name: string, label: string, icon: LucideIcon): Sub => {
        const href = route(name);
        return { key: name, label, icon, href, active: path === new URL(href, 'http://x').pathname };
    };

    return [
        { name: 'overview', label: t('Overview'), icon: LayoutGrid, href: route('overview'), active: on('/') },
        {
            name: 'calendar',
            label: t('Calendar'),
            icon: CalendarRange,
            href: route('calendar'),
            active: on('/calendar'),
            alert: counts?.warnings,
            subs: [
                { key: 'day', label: t('Day'), icon: CalendarDays, href: route('calendar', { ...keep, view: 'day' }), active: view === 'day' },
                { key: 'week', label: t('Week'), icon: Rows3, href: route('calendar', { ...keep, view: 'week' }), active: view === 'week' },
                { key: 'month', label: t('Month'), icon: Grid3x3, href: route('calendar', { ...keep, view: 'month' }), active: view === 'month' },
            ],
        },
        {
            name: 'jobs',
            label: t('Jobs'),
            icon: Wrench,
            href: route('jobs'),
            active: on('/jobs'),
            count: counts?.openJobs || undefined,
            subs: [
                jobTab('open', t('Open'), ListTodo),
                jobTab('scheduled', t('Scheduled'), CalendarDays),
                jobTab('in_progress', t('In progress'), CirclePlay),
                jobTab('waiting_parts', t('Waiting for parts'), Package),
                jobTab('completed', t('Completed'), CircleCheck),
                jobTab('all', t('All jobs'), List),
                {
                    key: 'call',
                    label: t('Customers to call'),
                    icon: PhoneCall,
                    href: route('jobs', { flag: 'call' }),
                    active: flag === 'call',
                    count: counts?.toCall || undefined,
                    alarm: true,
                },
                {
                    key: 'warning',
                    label: t('Overlaps'),
                    icon: TriangleAlert,
                    href: route('jobs', { flag: 'warning' }),
                    active: flag === 'warning',
                    count: counts?.warnings || undefined,
                    alarm: true,
                },
            ],
        },
        { name: 'customers', label: t('Customers'), icon: Users, href: route('customers'), active: on('/customers') },
        {
            name: 'mechanics',
            label: t('Mechanics'),
            icon: HardHat,
            href: route('mechanics'),
            active: on('/mechanics'),
            // Who works today and how full their four quarters are; a row opens the calendar for that mechanic.
            subs: roster.map((r) => ({
                key: `m${r.id}`,
                label: r.name,
                href: route('calendar', { mechanic: r.id }),
                active: onCalendar && q.get('mechanic') === String(r.id),
                mechanic: r,
            })),
            note: shell ? (
                <>
                    {t('Today')} · {shell.hours ? `${shell.hours.open}–${shell.hours.close}` : t('Closed')}
                </>
            ) : undefined,
            foot: shell?.hours && available > 0 ? t(':booked of :total quarters booked', { booked, total: available }) : undefined,
        },
        {
            name: 'invoices',
            label: t('Invoices'),
            icon: ReceiptText,
            href: route('invoices'),
            active: on('/invoices'),
            subs: [
                { key: 'all', label: t('All invoices'), icon: ReceiptText, href: route('invoices'), active: invoices === 'all' },
                { key: 'issued', label: t('Valid'), icon: FileCheck2, href: route('invoices', { status: 'issued' }), active: invoices === 'issued' },
                { key: 'voided', label: t('Voided'), icon: FileX2, href: route('invoices', { status: 'voided' }), active: invoices === 'voided' },
            ],
        },
        {
            name: 'settings',
            label: t('Settings'),
            icon: Settings,
            href: route('settings.index'),
            active: on('/settings'),
            subs: [
                setting('settings.general', t('General'), SlidersHorizontal),
                setting('settings.company', t('Company'), Building2),
                setting('settings.invoices', t('Invoices'), ReceiptText),
                setting('settings.hours', t('Working hours'), Clock3),
                setting('settings.account', t('Account'), UserRound),
            ],
        },
    ];
}

const SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const;
const list: Variants = { show: { transition: { staggerChildren: 0.022, delayChildren: 0.02 } } };
const row: Variants = {
    hidden: { opacity: 0, x: -6 },
    show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

/** The rows slide in once, when the app is first opened (not on every page change). */
let introDone = false;

export function AppSidebar({ mini, onToggle }: { mini: boolean; onToggle: () => void }) {
    const t = useT();
    const { workshop } = usePage<SharedData>().props;
    const nav = useNav();
    const { appearance, updateAppearance } = useAppearance();
    const dark = appearance === 'dark';
    const [open, setOpen] = useState<{ name: string; top: number; left: number } | null>(null);
    const timer = useRef<number | undefined>(undefined);
    const [intro] = useState(() => !introDone);

    useEffect(() => {
        introDone = true;
        return () => window.clearTimeout(timer.current);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
        const onResize = () => setOpen(null);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    const hasMenu = (item: NavItem) => mini || !!item.subs?.length;

    const place = (item: NavItem, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        setOpen({ name: item.name, top: r.top - 6, left: r.right + 10 });
    };
    // A short wait before the first menu opens, so running the mouse down the list does not flash every menu.
    const enter = (item: NavItem, el: HTMLElement) => {
        window.clearTimeout(timer.current);
        if (!hasMenu(item)) {
            if (open) timer.current = window.setTimeout(() => setOpen(null), 60);
            return;
        }
        if (open) place(item, el);
        else timer.current = window.setTimeout(() => place(item, el), 90);
    };
    const leave = (delay = 160) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOpen(null), delay);
    };
    const close = () => {
        window.clearTimeout(timer.current);
        setOpen(null);
    };

    return (
        <aside
            className={cn(
                'bg-panel border-line fixed inset-y-0 left-0 z-40 hidden flex-col border-r transition-[width] duration-300 ease-[cubic-bezier(.22,1,.36,1)] md:flex',
                mini ? 'w-[70px]' : 'w-[248px]',
            )}
        >
            {/* logo row, as tall as the header next to it */}
            <div className="flex h-16 shrink-0 items-center overflow-hidden pl-[19px]">
                <Link href={route('overview')} className="flex min-w-0 items-center gap-3" title={workshop.name}>
                    <LogoMark size={32} className="text-fg" />
                    <span className={cn('min-w-0 leading-[1.15] whitespace-nowrap transition-opacity duration-200', mini && 'opacity-0')}>
                        <span className="text-fg block truncate text-[15px] font-semibold tracking-[-0.01em]">{workshop.name}</span>
                        <span className="text-muted-foreground block text-[12px]">{t('Workshop planner')}</span>
                    </span>
                </Link>
            </div>

            <button
                type="button"
                onClick={() => {
                    close();
                    onToggle();
                }}
                aria-label={mini ? t('Expand menu') : t('Collapse menu')}
                title={mini ? t('Expand menu') : t('Collapse menu')}
                className="border-line bg-panel text-muted-foreground hover:border-p-line hover:text-p absolute top-5 -right-3 z-10 grid size-6 place-items-center rounded-full border shadow-[0_1px_3px_rgba(15,23,42,.12)] transition-[color,border-color,scale] duration-150 active:scale-90"
            >
                <ChevronLeft className={cn('size-3.5 transition-transform duration-300', mini && 'rotate-180')} strokeWidth={2.2} />
            </button>

            <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-3 pb-4" aria-label={t('Navigation')} onScroll={close}>
                <ul className="flex flex-col gap-1">
                    {nav.map((item, i) => {
                        const isOpen = open?.name === item.name;
                        return (
                            <li
                                key={item.name}
                                className={cn(intro && 'nav-in')}
                                style={intro ? { animationDelay: `${60 + i * 35}ms` } : undefined}
                                onMouseEnter={(e) => enter(item, e.currentTarget)}
                                onMouseLeave={() => leave()}
                                onFocus={(e: FocusEvent<HTMLLIElement>) => {
                                    // Keyboard users get the menu too; a mouse click just opens the page.
                                    if (e.target === e.currentTarget.firstElementChild && (e.target as HTMLElement).matches(':focus-visible') && hasMenu(item)) {
                                        window.clearTimeout(timer.current);
                                        place(item, e.currentTarget);
                                    }
                                }}
                                onBlur={(e: FocusEvent<HTMLLIElement>) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) leave(0);
                                }}
                            >
                                <Link
                                    href={item.href}
                                    onClick={close}
                                    aria-current={item.active ? 'page' : undefined}
                                    aria-label={mini ? item.label : undefined}
                                    className={cn(
                                        'group relative flex h-10 items-center gap-3 rounded-lg px-3.5 text-[14px] font-medium whitespace-nowrap transition-[background-color,color] duration-200',
                                        item.active ? 'text-white' : isOpen ? 'bg-subtle text-fg' : 'text-fg-2 hover:bg-subtle hover:text-fg',
                                    )}
                                >
                                    {item.active && (
                                        <motion.span
                                            layoutId="nav-active"
                                            className="bg-p absolute inset-0 rounded-lg shadow-[0_8px_18px_-10px_var(--p)]"
                                            transition={SPRING}
                                        />
                                    )}
                                    <item.icon
                                        className={cn(
                                            'relative size-[18px] shrink-0 transition-[color,scale] duration-200 group-hover:scale-110',
                                            item.active ? 'text-white' : 'text-muted-foreground group-hover:text-fg-2',
                                        )}
                                        strokeWidth={1.8}
                                    />
                                    {!mini && <span className="relative flex-1 truncate">{item.label}</span>}
                                    {!mini && item.count !== undefined && (
                                        <span
                                            className={cn(
                                                'pop-in relative rounded-full px-1.5 py-px text-[11.5px] leading-4 font-semibold tabular-nums',
                                                item.active ? 'bg-white/20 text-white' : 'bg-p-soft text-p-ink',
                                            )}
                                        >
                                            {item.count}
                                        </span>
                                    )}
                                    {!!item.alert && (
                                        <span
                                            className={cn('bg-over ring-panel pop-in relative size-2 shrink-0 rounded-full ring-2', mini && 'absolute! top-2 right-2')}
                                            title={t('Overlaps: :n', { n: item.alert })}
                                        />
                                    )}
                                    {!mini && (
                                        <ChevronRight
                                            className={cn(
                                                'relative size-4 shrink-0 transition-[translate,color] duration-200 group-hover:translate-x-0.5',
                                                item.active ? 'text-white/80' : 'text-faint',
                                                isOpen && 'translate-x-0.5',
                                            )}
                                            strokeWidth={2}
                                        />
                                    )}
                                </Link>

                                <AnimatePresence>
                                    {isOpen && open && (
                                        <Flyout item={item} mini={mini} top={open.top} left={open.left} onPick={close} />
                                    )}
                                </AnimatePresence>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* three round buttons, as in the reference */}
            <div className={cn('border-line flex shrink-0 items-center justify-center border-t py-4', mini ? 'flex-col gap-2' : 'gap-4')}>
                <button
                    type="button"
                    onClick={() => updateAppearance(dark ? 'light' : 'dark')}
                    aria-label={dark ? t('Light mode') : t('Dark mode')}
                    title={dark ? t('Light mode') : t('Dark mode')}
                    className={roundBtn}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={dark ? 'sun' : 'moon'}
                            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.2 }}
                            className="grid place-items-center"
                        >
                            {dark ? <Sun className="size-[17px]" strokeWidth={1.8} /> : <Moon className="size-[17px]" strokeWidth={1.8} />}
                        </motion.span>
                    </AnimatePresence>
                </button>
                <Link href={route('settings.account')} aria-label={t('Account')} title={t('Account')} className={roundBtn}>
                    <UserRound className="size-[17px]" strokeWidth={1.8} />
                </Link>
                <Link href={route('logout')} method="post" as="button" aria-label={t('Log out')} title={t('Log out')} className={roundBtn}>
                    <LogOut className="size-[17px]" strokeWidth={1.8} />
                </Link>
            </div>
        </aside>
    );
}

const roundBtn =
    'border-line text-fg-2 hover:border-p-line hover:bg-p-soft hover:text-p grid size-9 place-items-center rounded-full border transition-[background-color,border-color,color,scale] duration-150 active:scale-90';

/** The small menu to the right of a row. Collapsed, it also carries the row's own name. */
function Flyout({ item, mini, top, left, onPick }: { item: NavItem; mini: boolean; top: number; left: number; onPick: () => void }) {
    const t = useT();
    const offLabel = useOffLabel();
    const ref = useRef<HTMLDivElement>(null);
    const subs = item.subs ?? [];

    // Keep it on screen: a long menu near the bottom moves up.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const h = el.offsetHeight;
        el.style.top = `${Math.max(12, Math.min(top, window.innerHeight - 12 - h))}px`;
    }, [top]);

    return (
        <motion.div
            ref={ref}
            role="group"
            aria-label={item.label}
            initial={{ opacity: 0, x: -8, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 560, damping: 36 }}
            style={{ top, left, transformOrigin: 'left top' }}
            className="bg-panel border-line fixed z-50 w-[240px] rounded-xl border p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,.25),0_2px_6px_-2px_rgba(15,23,42,.08)]"
        >
            <motion.ul variants={list} initial="hidden" animate="show" className="flex flex-col gap-0.5">
                {mini && (
                    <motion.li variants={row}>
                        <Link
                            href={item.href}
                            onClick={onPick}
                            className={cn(
                                'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold transition-colors duration-150',
                                item.active && !subs.some((s) => s.active) ? 'bg-p text-white' : 'text-fg hover:bg-subtle',
                            )}
                        >
                            <item.icon className="size-4 shrink-0" strokeWidth={1.8} />
                            <span className="flex-1 truncate">{item.label}</span>
                            <ChevronRight className="size-3.5 shrink-0 opacity-50" strokeWidth={2} />
                        </Link>
                    </motion.li>
                )}
                {mini && subs.length > 0 && <li className="border-line mx-2 my-1 border-t" aria-hidden="true" />}
                {item.note && (
                    <motion.li variants={row} className="text-muted-foreground px-2.5 pt-1 pb-1.5 text-[12px] font-medium">
                        {item.note}
                    </motion.li>
                )}
                {subs.map((s) => (
                    <motion.li key={s.key} variants={row}>
                        <Link
                            href={s.href}
                            onClick={onPick}
                            aria-current={s.active ? 'page' : undefined}
                            title={s.mechanic ? t('Open calendar') + ' · ' + s.label : undefined}
                            className={cn(
                                'group/sub flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150',
                                s.active ? 'bg-p text-white shadow-[0_6px_14px_-8px_var(--p)]' : 'text-fg-2 hover:bg-subtle hover:text-fg',
                            )}
                        >
                            {s.mechanic ? (
                                <span
                                    className={cn(
                                        'grid size-[22px] shrink-0 place-items-center rounded-md text-[10.5px] font-semibold text-white',
                                        s.mechanic.status !== 'working' && 'opacity-45',
                                    )}
                                    style={{ background: s.mechanic.color }}
                                    aria-hidden="true"
                                >
                                    {initials(s.mechanic.name).slice(0, 1)}
                                </span>
                            ) : (
                                s.icon && (
                                    <s.icon
                                        className={cn(
                                            'size-4 shrink-0 transition-colors',
                                            s.active ? 'text-white' : s.alarm && s.count ? 'text-over' : 'text-muted-foreground group-hover/sub:text-fg-2',
                                        )}
                                        strokeWidth={1.8}
                                    />
                                )
                            )}
                            <span className="min-w-0 flex-1 truncate">{s.label}</span>
                            {s.mechanic ? (
                                s.mechanic.status === 'working' ? (
                                    <span
                                        className="flex gap-[3px]"
                                        role="img"
                                        aria-label={t(':booked of :total quarters', { booked: s.mechanic.booked, total: s.mechanic.available })}
                                    >
                                        {s.mechanic.slots.map((busy, k) => (
                                            <span
                                                key={k}
                                                className={cn(
                                                    'h-2.5 w-2.5 rounded-[3px]',
                                                    s.active ? (busy ? 'bg-white' : 'bg-white/30') : busy ? 'bg-p' : 'bg-line',
                                                )}
                                            />
                                        ))}
                                    </span>
                                ) : (
                                    <span className={cn('text-[12px]', s.active ? 'text-white/80' : 'text-faint')}>{offLabel(s.mechanic.status)}</span>
                                )
                            ) : (
                                <>
                                    {s.count !== undefined && (
                                        <span
                                            className={cn(
                                                'rounded-full px-1.5 py-px text-[11px] leading-4 font-semibold tabular-nums',
                                                s.active ? 'bg-white/20 text-white' : s.alarm ? 'bg-over-bg text-over-ink' : 'bg-subtle text-fg-2',
                                            )}
                                        >
                                            {s.count}
                                        </span>
                                    )}
                                    <ChevronRight
                                        className={cn(
                                            'size-3.5 shrink-0 transition-[translate,opacity] duration-150 group-hover/sub:translate-x-0.5',
                                            s.active ? 'opacity-80' : 'opacity-40 group-hover/sub:opacity-70',
                                        )}
                                        strokeWidth={2}
                                    />
                                </>
                            )}
                        </Link>
                    </motion.li>
                ))}
                {item.foot && (
                    <motion.li variants={row} className="text-faint border-line mt-1 border-t px-2.5 pt-2 pb-1 text-[12px]">
                        {item.foot}
                    </motion.li>
                )}
            </motion.ul>
        </motion.div>
    );
}
