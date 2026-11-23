import { useT } from '@/lib/i18n';
import type { VehicleType } from '@/types';
import { Bike, Car, Ship, type LucideIcon } from 'lucide-react';

export const VEHICLE_TYPES: VehicleType[] = ['car', 'moto', 'water'];
export const VEHICLE_ICON: Record<VehicleType, LucideIcon> = { car: Car, moto: Bike, water: Ship };

export function useVehicleLabels() {
    const t = useT();
    const labels: Record<VehicleType, string> = { car: t('Car'), moto: t('Motorcycle'), water: t('Watercraft') };
    return (type: string) => labels[type as VehicleType] ?? type;
}
