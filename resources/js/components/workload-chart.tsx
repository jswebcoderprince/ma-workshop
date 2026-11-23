import { formatDays } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';

export type WorkloadWeek = { week: number; from: string; available: number; booked: number };

const NICE_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 50, 100];

/** Smooth area chart: booked vs available mechanic days per week (values come in quarters). */
export function WorkloadChart({ weeks, highlight = 1 }: { weeks: WorkloadWeek[]; highlight?: number }) {
    const t = useT();
    const locale = useLocale();
    const [small, setSmall] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 759px)');
        const update = () => setSmall(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const N = weeks.length;
    if (N < 2) return null;

    const W = small ? 380 : 720;
    const H = small ? 230 : 260;
    const padL = 34;
    const padB = 30;
    const padT = 20;
    const booked = weeks.map((w) => w.booked / 4);
    const cap = weeks.map((w) => w.available / 4);
    const top = Math.max(...cap, ...booked);
    const step = NICE_STEPS.find((s) => s * 4 >= top) ?? 100;
    const max = step * 4;
    const x = (i: number) => padL + (W - padL - 10) * (i / (N - 1));
    const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);

    const path = (arr: number[]) => {
        const pts = arr.map((v, i) => [x(i), y(v)]);
        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(pts.length - 1, i + 2)];
            d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
        }
        return d;
    };
    const area = (arr: number[]) => `${path(arr)} L${x(N - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    const label = (w: WorkloadWeek) => t('W:n', { n: w.week });

    const hi = Math.min(highlight, N - 1);
    const tx = x(hi);
    const ty = y(booked[hi]);
    const boxX = tx + 160 > W ? tx - 160 : tx + 10;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t('Workload')}>
            <defs>
                <linearGradient id="wl-booked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--p)" stopOpacity=".28" />
                    <stop offset="1" stopColor="var(--p)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="wl-cap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3fc6a0" stopOpacity=".22" />
                    <stop offset="1" stopColor="#3fc6a0" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((g) => (
                <g key={g}>
                    <line x1={padL} x2={W - 10} y1={y(step * g)} y2={y(step * g)} stroke="var(--line)" strokeDasharray="3 4" />
                    <text x={padL - 8} y={y(step * g) + 4} textAnchor="end" fontSize="11" fill="var(--muted-fg)">
                        {step * g}
                    </text>
                </g>
            ))}
            {weeks.map((w, i) =>
                small && i % 2 ? null : (
                    <text
                        key={w.from}
                        x={x(i)}
                        y={H - 8}
                        textAnchor={i === 0 ? 'start' : i === N - 1 ? 'end' : 'middle'}
                        fontSize="11.5"
                        fill="var(--muted-fg)"
                    >
                        {label(w)}
                    </text>
                ),
            )}
            <path d={area(cap)} fill="url(#wl-cap)" />
            <path d={path(cap)} fill="none" stroke="#3fc6a0" strokeWidth="2.2" />
            <path d={area(booked)} fill="url(#wl-booked)" />
            <path d={path(booked)} fill="none" stroke="var(--p)" strokeWidth="2.4" />
            <line x1={tx} x2={tx} y1={ty} y2={y(0)} stroke="var(--p)" strokeDasharray="3 3" opacity=".5" />
            <circle cx={tx} cy={ty} r="5" fill="var(--panel)" stroke="var(--p)" strokeWidth="2.5" />
            <g transform={`translate(${boxX},${Math.max(4, ty - 50)})`}>
                <rect width="150" height="42" rx="8" fill="var(--panel)" stroke="var(--line)" />
                <text x="10" y="17" fontSize="11" fill="var(--muted-fg)">
                    {label(weeks[hi])} · {t('Booked')}
                </text>
                <text x="10" y="34" fontSize="13" fontWeight="600" fill="var(--fg)">
                    {formatDays(weeks[hi].booked, locale)} / {formatDays(weeks[hi].available, locale)}
                </text>
            </g>
        </svg>
    );
}
