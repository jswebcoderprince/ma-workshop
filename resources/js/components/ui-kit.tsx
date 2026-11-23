import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { JobStatus, MechanicView } from '@/types';
import { Link } from '@inertiajs/react';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

/* Small building blocks matching design/frame.html (v3). */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className={cn('border-line bg-panel min-w-0 rounded-[14px] border shadow-[0_1px_2px_rgba(29,27,56,.04)]', className)}>{children}</div>
    );
}

export function CardHeader({ title, sub, children, className }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-wrap items-center gap-3 px-5 py-4', className)}>
            <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
            {sub && <span className="text-muted-foreground text-[13px]">{sub}</span>}
            <span className="flex-1" />
            {children}
        </div>
    );
}

type BtnVariant = 'default' | 'primary' | 'soft' | 'ghost' | 'danger';
const btnVariants: Record<BtnVariant, string> = {
    default: 'border-line-strong bg-panel text-fg-2 hover:bg-hover',
    primary: 'border-p bg-p text-white shadow-[0_6px_14px_-8px_var(--p)] hover:bg-p-hover',
    soft: 'border-transparent bg-p-soft text-p-ink hover:brightness-95',
    ghost: 'border-transparent bg-transparent text-fg-2 hover:bg-hover',
    danger: 'border-over bg-over text-white hover:brightness-95',
};

export function buttonClasses(variant: BtnVariant = 'default', size: 'md' | 'sm' = 'md', className?: string) {
    return cn(
        'inline-flex items-center justify-center gap-[7px] border font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        size === 'md' ? 'h-10 rounded-[9px] px-[18px]' : 'h-8 rounded-lg px-3 text-[13.5px]',
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
            {Icon && <Icon className="size-[17px]" strokeWidth={1.7} />}
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
            {Icon && <Icon className="size-[17px]" strokeWidth={1.7} />}
            {children}
        </Link>
    );
}

export function IconButton({
    icon: Icon,
    label,
    className,
    badge,
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; badge?: number }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={cn('text-fg-2 hover:bg-hover relative grid size-[38px] place-items-center rounded-[10px]', className)}
            {...rest}
        >
            <Icon className="size-[18px]" strokeWidth={1.7} />
            {!!badge && (
                <span className="border-panel bg-over absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full border-2 px-1 text-[10.5px] font-semibold text-white">
                    {badge}
                </span>
            )}
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
        <Link
            href={href}
            method={method}
            as={method ? 'button' : 'a'}
            aria-label={label}
            title={label}
            className={cn('text-fg-2 hover:bg-hover relative grid size-[38px] place-items-center rounded-[10px]', className)}
        >
            <Icon className="size-[18px]" strokeWidth={1.7} />
            {!!badge && (
                <span className="border-panel bg-over absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full border-2 px-1 text-[10.5px] font-semibold text-white">
                    {badge}
                </span>
            )}
        </Link>
    );
}

export function Kebab({ label = 'More', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
    return (
        <button
            type="button"
            aria-label={label}
            className="text-muted-foreground hover:bg-hover hover:text-fg grid size-[30px] place-items-center rounded-lg"
            {...rest}
        >
            <EllipsisVertical className="size-[17px]" strokeWidth={1.7} />
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
            <span className="text-fg-2 text-[13.5px] font-medium">{label}</span>
            {children}
            {hint && !error && <span className="text-muted-foreground text-[12.5px]">{hint}</span>}
            {error && <span className="text-over-ink text-[12.5px]">{error}</span>}
        </label>
    );
}

const inputCls =
    'h-[42px] w-full rounded-[10px] border border-line-strong bg-panel px-3 outline-none transition-shadow focus:border-p focus:shadow-[0_0_0_3px_var(--p-soft)] aria-invalid:border-over';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputCls, className)} {...rest} />;
});

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cn(
                inputCls,
                'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2716%27%20height=%2716%27%20fill=%27none%27%20stroke=%27%238b8aa3%27%20stroke-width=%272%27%20viewBox=%270%200%2024%2024%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[position:right_12px_center] bg-no-repeat pr-9',
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

export function Segmented<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: ReactNode }[];
}) {
    return (
        <div className="bg-subtle inline-flex gap-0.5 rounded-[10px] p-[3px]">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    aria-pressed={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 font-medium',
                        value === o.value && 'bg-panel text-fg shadow-[0_1px_3px_rgba(29,27,56,.1)]',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function MechanicAvatar({ mechanic, size = 'md' }: { mechanic: Pick<MechanicView, 'name' | 'color'>; size?: 'md' | 'sm' }) {
    return (
        <span
            className={cn(
                'inline-grid shrink-0 place-items-center rounded-full font-semibold text-white',
                size === 'md' ? 'size-[34px] text-[12.5px]' : 'size-7 text-[11px]',
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
                size === 'md' ? 'size-[34px] text-[12.5px]' : 'size-7 text-[11px]',
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
        <span className={cn('inline-flex items-center gap-[7px] text-[13.5px] font-medium whitespace-nowrap', statusColor[status])}>
            <span className="size-2 rounded-full bg-current" />
            {label}
        </span>
    );
}

type TagTone = 'default' | 'p' | 'call' | 'over' | 'parts' | 'ok';
const tagTone: Record<TagTone, string> = {
    default: 'bg-subtle text-fg-2',
    p: 'bg-p-soft text-p-ink',
    call: 'bg-call-soft text-call',
    over: 'bg-over-bg text-over-ink',
    parts: 'bg-parts-bg text-parts-ink',
    ok: 'bg-ok-soft text-ok',
};

export function Tag({ tone = 'default', icon: Icon, children, title }: { tone?: TagTone; icon?: LucideIcon; children?: ReactNode; title?: string }) {
    return (
        <span
            title={title}
            className={cn('inline-flex h-6 items-center gap-[5px] rounded-[7px] px-[9px] text-[12.5px] font-medium whitespace-nowrap', tagTone[tone])}
        >
            {Icon && <Icon className="size-[13px]" strokeWidth={1.8} />}
            {children}
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

export function StatCard({
    label,
    icon: Icon,
    color,
    value,
    aside,
    foot,
}: {
    label: ReactNode;
    icon: LucideIcon;
    color: string;
    value: ReactNode;
    aside?: ReactNode;
    foot?: ReactNode;
}) {
    return (
        <Card className="px-[18px] pt-4 pb-[18px]">
            <div className="text-fg-2 mb-3 flex items-center justify-between font-medium">
                <span>{label}</span>
                <Kebab />
            </div>
            <div className="flex items-center gap-3">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] text-white" style={{ background: color }}>
                    <Icon className="size-[17px]" strokeWidth={1.7} />
                </span>
                <span className="text-[23px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
                {aside && <span className="ml-auto">{aside}</span>}
            </div>
            {foot && <div className="text-muted-foreground mt-2 text-right text-[12.5px]">{foot}</div>}
        </Card>
    );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: ReactNode; children?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="bg-p-soft text-p grid size-12 place-items-center rounded-2xl">
                <Icon className="size-6" strokeWidth={1.7} />
            </span>
            <h3 className="mt-1 text-[17px] font-semibold">{title}</h3>
            {children && <div className="text-muted-foreground max-w-md">{children}</div>}
        </div>
    );
}
