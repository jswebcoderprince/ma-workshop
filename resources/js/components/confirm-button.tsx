import { Button } from '@/components/ui-kit';
import { useT } from '@/lib/i18n';
import { Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/** Delete in two clicks: the first asks "Sure?", the second confirms. Resets after a few seconds. */
export function ConfirmButton({
    onConfirm,
    children,
    size = 'md',
    disabled,
    title,
}: {
    onConfirm: () => void;
    children?: ReactNode;
    size?: 'md' | 'sm';
    disabled?: boolean;
    title?: string;
}) {
    const t = useT();
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        if (!armed) return;
        const id = setTimeout(() => setArmed(false), 4000);
        return () => clearTimeout(id);
    }, [armed]);

    return (
        <Button
            size={size}
            variant={armed ? 'danger' : 'ghost'}
            icon={Trash2}
            disabled={disabled}
            title={title}
            className={armed ? '' : 'text-over-ink'}
            onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
        >
            {armed ? t('Click again to delete') : children}
        </Button>
    );
}
