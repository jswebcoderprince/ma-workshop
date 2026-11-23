import { useT } from '@/lib/i18n';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The panel used for details and forms (design v3): slides in from the right on desktop,
 * up from the bottom on phones. Closing is always the parent's decision via onClose.
 */
export function SideSheet({
    open,
    onClose,
    eyebrow,
    title,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    eyebrow?: ReactNode;
    title: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const t = useT();

    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-[rgba(15,23,42,.35)] duration-200" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="bg-panel data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-6 md:data-[state=open]:slide-in-from-right-8 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-6 md:data-[state=closed]:slide-out-to-right-8 fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[20px] shadow-[0_18px_40px_-12px_rgba(29,27,56,.22)] duration-300 ease-[cubic-bezier(.22,1,.36,1)] outline-none data-[state=closed]:duration-200 md:inset-x-auto md:top-2.5 md:right-2.5 md:bottom-2.5 md:max-h-none md:w-[500px] md:rounded-[18px]"
                >
                    <div className="border-line flex items-start gap-3 border-b px-5 pt-[18px] pb-4">
                        <div className="min-w-0 flex-1">
                            {eyebrow && <div className="text-muted-foreground flex items-center gap-2 text-[13px]">{eyebrow}</div>}
                            <Dialog.Title className="mt-[3px] text-[19px] font-semibold tracking-[-0.01em]">{title}</Dialog.Title>
                        </div>
                        <Dialog.Close
                            aria-label={t('Close')}
                            className="text-muted-foreground hover:bg-hover hover:text-fg grid size-[30px] place-items-center rounded-lg"
                        >
                            <X className="size-[17px]" strokeWidth={1.7} />
                        </Dialog.Close>
                    </div>
                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-[18px]">{children}</div>
                    {footer && <div className="border-line flex flex-wrap gap-2.5 border-t px-5 py-3.5">{footer}</div>}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function SheetSection({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
    return (
        <section>
            <div className="mb-2.5 flex items-center gap-2">
                <h4 className="flex-1 text-sm font-semibold">{title}</h4>
                {action}
            </div>
            {children}
        </section>
    );
}
