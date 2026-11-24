import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobStatus, MechanicView } from '@/types';
import { Link } from '@inertiajs/react';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';
import {
    forwardRef,
    useEffect,
    useId,
    useRef,
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
} from 'react';

/* Building blocks for the Engine Precision Planner design (design/stitch/engine_precision_planner/DESIGN.md). */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                'border-line bg-panel min-w-0 rounded-xl border shadow-[0_1px_2px_0_rgba(15,23,42,.04),0_1px_3px_0_rgba(15,23,42,.03)]',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    icon: Icon,
    sub,
    children,
    className,
}: {
    title: ReactNode;
    icon?: LucideIcon;
    sub?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2.5 px-4 py-3.5', className)}>
            {Icon && <Icon className="text-p size-5" strokeWidth={1.8} />}
            <h3 className="text-[17px] leading-6 font-semibold tracking-[-0.01em]">{title}</h3>
            {typeof sub === 'number' || (typeof sub === 'string' && sub.length <= 16) ? (
                <span className="bg-subtle text-fg-2 rounded-full px-2 py-0.5 text-[11px] font-semibold">{sub}</span>
            ) : (
                sub && <span className="text-muted-foreground text-[12.5px]">{sub}</span>
            )}
            <span className="flex-1" />
            {children}
        </div>
    );
}

/** Small label above numbers and sections (sentence case, no letter-spacing). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={cn('text-muted-foreground text-[13px] leading-4 font-medium', className)}>{children}</span>;
}

type BtnVariant = 'default' | 'primary' | 'soft' | 'ghost' | 'danger';
const btnVariants: Record<BtnVariant, string> = {
    default: 'border-line bg-panel text-fg hover:bg-hover hover:border-line-strong shadow-[0_1px_2px_0_rgba(15,23,42,.05)]',
    primary:
        'border-p bg-p text-white hover:bg-p-hover shadow-[0_1px_2px_0_rgba(15,23,42,.1)] hover:-translate-y-px hover:shadow-[0_8px_18px_-8px_var(--p)] active:translate-y-0',
    soft: 'border-transparent bg-p-soft text-p-ink hover:brightness-95',
    ghost: 'border-transparent bg-transparent text-fg-2 hover:bg-subtle',
    danger: 'border-over bg-over text-white hover:brightness-95',
};

export function buttonClasses(variant: BtnVariant = 'default', size: 'md' | 'sm' = 'md', className?: string) {
    return cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md border font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,translate,scale] duration-150 ease-out active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100',
        size === 'md' ? 'h-[38px] px-3.5 text-[13px]' : 'h-8 px-2.5 text-[12.5px]',
        btnVariants[variant],
        className,
    );
}

export const Button = forwardRef<
    HTMLButtonElement,
    ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'md' | 'sm'; icon?: LucideIcon }
>(function Button({ variant = 'default', size = 'md', icon: Icon, className, children, type = 'button', ...rest }, ref) {
    return (
        <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest}>
            {Icon && <Icon className="size-[17px]" strokeWidth={1.8} />}
            {children}
        </button>
    );
});

/** A link that looks like a button (no button nested inside a link). */
export function ButtonLink({
    href,
    variant,
    size,
    icon: Icon,
    className,
    children,
    label,
}: {
    href: string;
    variant?: BtnVariant;
    size?: 'md' | 'sm';
    icon?: LucideIcon;
    className?: string;
    children?: ReactNode;
    label?: string;
}) {
    return (
        <Link href={href} className={buttonClasses(variant, size, className)} aria-label={label} title={label}>
            {Icon && <Icon className="size-[17px]" strokeWidth={1.8} />}
            {children}
        </Link>
    );
}

const iconBtn =
    'relative grid size-9 place-items-center rounded-lg text-fg-2 transition-[background-color,color,scale] duration-150 hover:bg-subtle hover:text-fg active:scale-[.92]';
function Badge({ n }: { n?: number }) {
    return n ? (
        <span className="bg-over border-panel absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full border-2 px-1 font-mono text-[10px] font-bold text-white">
            {n}
        </span>
    ) : null;
}

export function IconButton({
    icon: Icon,
    label,
    className,
    badge,
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; badge?: number }) {
    return (
        <button type="button" aria-label={label} title={label} className={cn(iconBtn, className)} {...rest}>
            <Icon className="size-[19px]" strokeWidth={1.8} />
            <Badge n={badge} />
        </button>
    );
}

export function IconLink({
    href,
    icon: Icon,
    label,
    badge,
    className,
    method,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    badge?: number;
    className?: string;
    method?: 'post';
}) {
    return (
        <Link href={href} method={method} as={method ? 'button' : 'a'} aria-label={label} title={label} className={cn(iconBtn, className)}>
            <Icon className="size-[19px]" strokeWidth={1.8} />
            <Badge n={badge} />
        </Link>
    );
}

export function Kebab({ label = 'More', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
    return (
        <button
            type="button"
            aria-label={label}
            className="text-muted-foreground hover:bg-subtle hover:text-fg grid size-[30px] place-items-center rounded-md"
            {...rest}
        >
            <EllipsisVertical className="size-[17px]" strokeWidth={1.8} />
        </button>
    );
}

export function Field({
    label,
    error,
    hint,
    children,
    className,
}: {
    label: ReactNode;
    error?: string;
    hint?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <span className="text-fg text-[12.5px] font-semibold">{label}</span>
            {children}
            {hint && !error && <span className="text-muted-foreground text-[12px]">{hint}</span>}
            {error && <span className="text-over-ink text-[12px] font-medium">{error}</span>}
        </label>
    );
}

const inputCls =
    'h-[38px] w-full rounded-md border border-line-strong bg-panel px-3 text-[14px] outline-none transition-shadow focus:border-p focus:shadow-[0_0_0_3px_var(--p-soft)] aria-invalid:border-over disabled:bg-subtle disabled:text-muted-foreground';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputCls, className)} {...rest} />;
});

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cn(
                inputCls,
                'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2716%27%20height=%2716%27%20fill=%27none%27%20stroke=%27%2364748b%27%20stroke-width=%272%27%20viewBox=%270%200%2024%2024%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[position:right_10px_center] bg-no-repeat pr-9',
                className,
            )}
            {...rest}
        >
            {children}
        </select>
    );
}

export function Switch({
    checked,
    onChange,
    label,
    className,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            title={label}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors after:absolute after:top-[3px] after:left-[3px] after:size-4 after:rounded-full after:bg-white after:shadow after:transition-[left]',
                checked ? 'bg-p after:left-[19px]' : 'bg-line-strong',
                className,
            )}
        />
    );
}

/** Segmented control: slate track, white active pill with primary text (Stitch view switch). */
export function Segmented<T extends string | number>({
    value,
    onChange,
    options,
    className,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: ReactNode }[];
    className?: string;
}) {
    // Each control needs its own id so its pill slides only inside itself.
    const id = useId();
    return (
        <div className={cn('border-line bg-subtle inline-flex gap-0.5 rounded-lg border p-[3px]', className)}>
            {options.map((o) => (
                <button
                    key={String(o.value)}
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'relative inline-flex h-[30px] items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition-colors duration-150 active:scale-[.96]',
                        value === o.value ? 'text-p font-semibold' : 'text-fg-2 hover:text-fg',
                    )}
                >
                    {value === o.value && (
                        <motion.span
                            layoutId={`seg-${id}`}
                            className="bg-panel absolute inset-0 rounded-md shadow-[0_1px_3px_rgba(15,23,42,.12)]"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                    )}
                    <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
                </button>
            ))}
        </div>
    );
}

export function MechanicAvatar({
    mechanic,
    size = 'md',
    muted,
}: {
    mechanic: Pick<MechanicView, 'name' | 'color'>;
    size?: 'lg' | 'md' | 'sm';
    muted?: boolean;
}) {
    return (
        <span
            className={cn(
                'inline-grid shrink-0 place-items-center rounded-lg font-bold text-white',
                size === 'lg' ? 'size-10 text-[13px]' : size === 'md' ? 'size-9 text-[12.5px]' : 'size-7 text-[10.5px]',
                muted && 'bg-subtle! text-muted-foreground!',
            )}
            style={{ background: mechanic.color }}
        >
            {initials(mechanic.name)}
        </span>
    );
}

export function CustomerAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'sm' }) {
    return (
        <span
            className={cn(
                'border-line bg-subtle text-fg-2 inline-grid shrink-0 place-items-center rounded-full border font-semibold',
                size === 'md' ? 'size-9 text-[12px]' : 'size-7 text-[10.5px]',
            )}
        >
            {initials(name)}
        </span>
    );
}

const statusColor: Record<JobStatus, string> = {
    scheduled: 'text-p',
    in_progress: 'text-ok',
    waiting_parts: 'text-parts',
    completed: 'text-muted-foreground',
};

export function StatusDot({ status, label }: { status: JobStatus; label: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap', statusColor[status])}>
            <span className="size-2 rounded-full bg-current" />
            {label}
        </span>
    );
}

type TagTone = 'default' | 'p' | 'call' | 'over' | 'parts' | 'ok' | 'open' | 'hold';
const tagTone: Record<TagTone, string> = {
    default: 'bg-subtle text-fg-2 border-line',
    p: 'bg-p-soft text-p-ink border-p-line',
    call: 'bg-call-soft text-over-ink border-over-line',
    over: 'bg-over-bg text-over-ink border-over-line',
    parts: 'bg-parts-bg text-parts-ink border-parts-line',
    ok: 'bg-ok-soft text-ok-ink border-ok-line',
    open: 'bg-open-bg text-open-ink border-open-line',
    hold: 'bg-hold-bg text-hold-ink border-hold-line',
};

/** Status chips (Stitch: light fill, crisp border, dark label). */
export function Tag({
    tone = 'default',
    icon: Icon,
    children,
    title,
    className,
}: {
    tone?: TagTone;
    icon?: LucideIcon;
    children?: ReactNode;
    title?: string;
    className?: string;
}) {
    return (
        <span
            title={title}
            className={cn(
                'inline-flex h-[22px] items-center gap-1 rounded border px-1.5 text-[11px] font-semibold whitespace-nowrap',
                tagTone[tone],
                className,
            )}
        >
            {Icon && <Icon className="size-[13px]" strokeWidth={2} />}
            {children}
        </span>
    );
}

/** Quarter-day duration chip in mono, e.g. "0.5d". */
export function DurationChip({ quarters, className }: { quarters: number; className?: string }) {
    return (
        <span
            className={cn(
                'bg-subtle text-fg-2 border-line rounded border px-1.5 py-px font-mono text-[10.5px] font-semibold whitespace-nowrap',
                className,
            )}
        >
            {(quarters / 4).toFixed(2).replace(/0$/, '')}d
        </span>
    );
}

export function Plate({ value }: { value: string | null | undefined }) {
    if (!value) return null;
    return (
        <span className="plate">
            <i
                className="grid w-3.5 place-items-end justify-center bg-[#1d3fa8] pb-[3px] text-[8.5px] leading-none font-bold text-[#ffd84d] not-italic"
                style={{ fontFamily: 'var(--font-sans)' }}
            >
                LT
            </i>
            <span className="grid place-items-center px-1.5 tracking-[0.04em]">{value}</span>
        </span>
    );
}

type Tone = 'p' | 'ok' | 'parts' | 'over' | 'open';
const toneIcon: Record<Tone, string> = {
    p: 'bg-p-soft text-p',
    ok: 'bg-ok-soft text-ok',
    parts: 'bg-parts-bg text-parts',
    over: 'bg-over-bg text-over',
    open: 'bg-open-bg text-open',
};
const toneLabel: Record<Tone, string> = {
    p: 'text-muted-foreground',
    ok: 'text-muted-foreground',
    parts: 'text-parts-ink',
    over: 'text-over-ink',
    open: 'text-open-ink',
};
const toneValue: Record<Tone, string> = { p: 'text-fg', ok: 'text-fg', parts: 'text-parts-ink', over: 'text-over-ink', open: 'text-open-ink' };

/** KPI card (Stitch overview): small label, big number, tinted icon square, detail area below. */
export function StatCard({
    label,
    icon: Icon,
    tone = 'p',
    value,
    note,
    children,
}: {
    label: ReactNode;
    icon: LucideIcon;
    tone?: Tone;
    value: ReactNode;
    note?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <Card className="lift flex flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <Eyebrow className={toneLabel[tone]}>{label}</Eyebrow>
                    <div className="flex flex-wrap items-baseline gap-2">
                        <span className={cn('text-[30px] leading-[38px] font-bold tracking-[-0.02em] tabular-nums', toneValue[tone])}>
                            {typeof value === 'number' ? <CountUp value={value} /> : value}
                        </span>
                        {note && <span className="text-fg-2 text-[13px]">{note}</span>}
                    </div>
                </div>
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', toneIcon[tone])}>
                    <Icon className="size-[22px]" strokeWidth={1.8} />
                </span>
            </div>
            {children && <div className="mt-3">{children}</div>}
        </Card>
    );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: ReactNode; children?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="bg-p-soft text-p grid size-12 place-items-center rounded-lg">
                <Icon className="size-6" strokeWidth={1.8} />
            </span>
            <h3 className="mt-1 text-[16px] font-semibold">{title}</h3>
            {children && <div className="text-muted-foreground max-w-md text-[13.5px]">{children}</div>}
        </div>
    );
}

/** A number that counts up from 0 when it first shows (and glides when it changes). */
export function CountUp({ value, duration = 0.7 }: { value: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const from = useRef(0);
    const reduce = useReducedMotion();
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const controls = animate(from.current, value, {
            duration: reduce ? 0 : duration,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => (el.textContent = String(Math.round(v))),
        });
        from.current = value;
        return () => controls.stop();
    }, [value, duration, reduce]);
    return <span ref={ref}>{reduce ? value : 0}</span>;
}
