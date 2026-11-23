import { cn } from '@/lib/utils';

/**
 * MA Engine Lab mark, drawn after the logo on maenginelab.lt: a white "M" of two peaks with a teal "A"
 * laid over its last leg. Placeholder until the client sends the logo file; swap the paths then.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
    return (
        <svg viewBox="0 0 48 26" width={size} height={(size * 26) / 48} className={cn('shrink-0', className)} aria-hidden="true">
            <path
                d="M2 24 10 4l6.5 11L23 4l4.3 10.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.4"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <path d="M34 2 46 24h-6.8l-5.2-10.2L28.8 24H22z" fill="var(--brand, #1fa5a8)" />
        </svg>
    );
}
