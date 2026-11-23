import type { Prefill } from '@/components/calendar/job-form';
import { SheetSection, SideSheet } from '@/components/side-sheet';
import { Button, MechanicAvatar } from '@/components/ui-kit';
import { DURATION_PRESETS, daysLabel, getJson, type Slot } from '@/lib/calendar';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { VEHICLE_ICON, VEHICLE_TYPES, useVehicleLabels } from '@/lib/vehicles';
import type { VehicleType } from '@/types';
import { ArrowRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const chip = (on: boolean) =>
    cn(
        'flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-semibold',
        on ? 'border-p bg-p text-white' : 'border-line bg-panel text-fg-2 hover:bg-subtle',
    );

/** "When can we take it?" The earliest free start per mechanic for a given length and vehicle type. */
export function FindSlot({ open, onClose, onBook }: { open: boolean; onClose: () => void; onBook: (p: Prefill) => void }) {
    const t = useT();
    const locale = useLocale();
    const typeLabel = useVehicleLabels();
    const [duration, setDuration] = useState(4);
    const [type, setType] = useState<VehicleType | null>(null);
    const [slots, setSlots] = useState<Slot[] | null>(null);

    useEffect(() => {
        if (!open) return;
        const ctrl = new AbortController();
        setSlots(null);
        getJson<Slot[]>(route('calendar.slots', { duration, type: type ?? undefined }), ctrl.signal)
            .then(setSlots)
            .catch(() => {});
        return () => ctrl.abort();
    }, [open, duration, type]);

    return (
        <SideSheet
            open={open}
            onClose={onClose}
            eyebrow={
                <>
                    <Search className="size-4" /> {t('Find a slot')}
                </>
            }
            title={t('When can we take it?')}
        >
            <SheetSection title={t('Vehicle type')}>
                <div className="flex flex-wrap gap-1.5">
                    <button type="button" aria-pressed={type === null} onClick={() => setType(null)} className={chip(type === null)}>
                        {t('Any')}
                    </button>
                    {VEHICLE_TYPES.map((v) => {
                        const Icon = VEHICLE_ICON[v];
                        return (
                            <button key={v} type="button" aria-pressed={type === v} onClick={() => setType(v)} className={chip(type === v)}>
                                <Icon className="size-4" /> {typeLabel(v)}
                            </button>
                        );
                    })}
                </div>
            </SheetSection>

            <SheetSection title={t('Length')}>
                <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((n) => (
                        <button
                            key={n}
                            type="button"
                            aria-pressed={duration === n}
                            onClick={() => setDuration(n)}
                            className={cn(chip(duration === n), 'min-w-[46px] justify-center font-mono')}
                        >
                            {daysLabel(n)}
                        </button>
                    ))}
                </div>
            </SheetSection>

            <SheetSection title={t('Earliest start')}>
                <div className="border-line divide-line divide-y rounded-lg border">
                    {slots === null && <div className="text-muted-foreground p-4 text-[13px]">{t('Searching…')}</div>}
                    {slots?.length === 0 && (
                        <div className="text-muted-foreground p-4 text-[13px]">{t('No mechanic works on this vehicle type.')}</div>
                    )}
                    {slots?.map((s, i) => (
                        <div key={s.mechanic.id} className={cn('flex items-center gap-3 p-3', i === 0 && s.start && 'bg-open-bg/50')}>
                            <MechanicAvatar mechanic={s.mechanic} size="md" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-[13.5px] font-bold">
                                    {s.mechanic.name}
                                    {i === 0 && s.start && (
                                        <span className="bg-open rounded px-1.5 py-px text-[10.5px] font-bold text-white">{t('Earliest')}</span>
                                    )}
                                </div>
                                <div className="text-fg-2 text-[12.5px]">
                                    {s.start ? (
                                        <>
                                            {formatDate(s.start.date, locale)} <span className="font-mono">{s.start.time}</span>
                                            {s.end && (
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    → {formatDate(s.end.date, locale)} <span className="font-mono">{s.end.time}</span>
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        t('nothing free in the next weeks')
                                    )}
                                </div>
                            </div>
                            {s.start && (
                                <Button
                                    size="sm"
                                    variant={i === 0 ? 'primary' : 'default'}
                                    icon={ArrowRight}
                                    onClick={() => onBook({ mechanicId: s.mechanic.id, date: s.start!.date, quarter: s.start!.quarter, duration })}
                                >
                                    {t('Book')}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-muted-foreground mt-2 text-[12px]">
                    {t('Searches from the next free quarter. Time off and closed days are skipped.')}
                </p>
            </SheetSection>
        </SideSheet>
    );
}
