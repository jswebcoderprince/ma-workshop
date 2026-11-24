import { SideSheet } from '@/components/side-sheet';
import { Button } from '@/components/ui-kit';
import { useT } from '@/lib/i18n';
import { hideHint, hintHidden, promptInstall, useInstall } from '@/lib/install';
import { cn } from '@/lib/utils';
import { CircleCheck, Download, MonitorDown, Share, SquarePlus, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';

/** The install button's action: the browser's own dialog where there is one, the steps where there is not. */
export function useInstallAction() {
    const state = useInstall();
    const [steps, setSteps] = useState(false);
    const can = state === 'prompt' || state === 'ios' || state === 'mac';
    const run = () => {
        if (state === 'prompt') void promptInstall();
        else if (state === 'ios' || state === 'mac') setSteps(true);
    };
    const dialog = <InstallSheet open={steps} onClose={() => setSteps(false)} kind={state === 'mac' ? 'mac' : 'ios'} />;
    return { state, can, run, dialog };
}

/** Bottom of the sidebar: a small card until it is installed or hidden; collapsed, a round button. */
export function SidebarInstall({ mini }: { mini: boolean }) {
    const t = useT();
    const { can, run, dialog } = useInstallAction();
    const [hidden, setHidden] = useState(hintHidden);
    const hide = () => {
        hideHint();
        setHidden(true);
    };

    return (
        <>
            <AnimatePresence initial={false}>
                {can && !hidden && (
                    <motion.div
                        key={mini ? 'mini' : 'card'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.5, type: 'spring', stiffness: 380, damping: 30 } }}
                        exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
                        className={cn('shrink-0', mini ? 'flex justify-center pb-3' : 'px-3 pb-3')}
                    >
                        {mini ? (
                            <button
                                type="button"
                                onClick={run}
                                aria-label={t('Install the app')}
                                title={t('Install the app')}
                                className="bg-p grid size-9 place-items-center rounded-full text-white shadow-[0_6px_14px_-6px_var(--p)] transition-[scale] duration-150 active:scale-90"
                            >
                                <Download className="size-[17px]" strokeWidth={1.9} />
                            </button>
                        ) : (
                            <div className="border-p-line bg-p-soft relative rounded-xl border p-3.5">
                                <button
                                    type="button"
                                    onClick={hide}
                                    aria-label={t('Hide')}
                                    title={t('Hide')}
                                    className="text-muted-foreground hover:text-fg hover:bg-panel/70 absolute top-2 right-2 grid size-6 place-items-center rounded-md"
                                >
                                    <X className="size-3.5" strokeWidth={2} />
                                </button>
                                <span className="bg-p grid size-9 place-items-center rounded-lg text-white">
                                    <MonitorDown className="size-[18px]" strokeWidth={1.8} />
                                </span>
                                <div className="text-fg mt-2.5 text-[13.5px] font-semibold">{t('Install the app')}</div>
                                <p className="text-fg-2 mt-0.5 text-[12.5px] leading-[1.4]">
                                    {t('Its own window and the MA icon, like any other program.')}
                                </p>
                                <Button variant="primary" size="sm" icon={Download} className="mt-3 w-full" onClick={run}>
                                    {t('Install')}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            {dialog}
        </>
    );
}

/** Phones (no sidebar): one slim line above the page until it is installed or hidden. */
export function PhoneInstallBanner() {
    const t = useT();
    const { can, run, dialog } = useInstallAction();
    const [hidden, setHidden] = useState(hintHidden);
    if (!can || hidden) return dialog;

    return (
        <>
            <div className="border-p-line bg-p-soft flex items-center gap-3 rounded-xl border p-3 md:hidden">
                <span className="bg-p grid size-9 shrink-0 place-items-center rounded-lg text-white">
                    <Download className="size-[18px]" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-fg text-[13.5px] font-semibold">{t('Install on this phone')}</div>
                    <div className="text-fg-2 text-[12px]">{t('Opens full screen with the MA icon.')}</div>
                </div>
                <Button variant="primary" size="sm" onClick={run}>
                    {t('Install')}
                </Button>
                <button
                    type="button"
                    onClick={() => {
                        hideHint();
                        setHidden(true);
                    }}
                    aria-label={t('Hide')}
                    className="text-muted-foreground -mr-1 grid size-8 shrink-0 place-items-center rounded-md"
                >
                    <X className="size-4" />
                </button>
            </div>
            {dialog}
        </>
    );
}

/** Settings → General: what this device can do, and the button or the steps. */
export function InstallSection() {
    const t = useT();
    const { state, run, dialog } = useInstallAction();

    return (
        <section className="border-line border-t pt-6">
            <h4 className="font-semibold">{t('App on this device')}</h4>
            {state === 'installed' ? (
                <p className="text-ok-ink mt-1 flex items-center gap-2 text-[13.5px] font-medium">
                    <CircleCheck className="size-4" strokeWidth={2} />
                    {t('Installed. You are using the app now.')}
                </p>
            ) : state === 'prompt' ? (
                <>
                    <p className="text-muted-foreground mb-3 text-[13.5px]">
                        {t(
                            'Adds MA Engine Lab to this computer or phone: its own window, and the MA icon in the Start menu, taskbar or home screen. It updates by itself.',
                        )}
                    </p>
                    <Button variant="primary" icon={Download} onClick={run}>
                        {t('Install the app')}
                    </Button>
                </>
            ) : state === 'ios' || state === 'mac' ? (
                <div className="mt-3 max-w-[520px]">
                    <Steps kind={state} />
                </div>
            ) : (
                <p className="text-muted-foreground mt-1 max-w-[620px] text-[13.5px]">
                    {t(
                        'To install, open this page in Chrome or Edge (computer, Android) or Safari (iPhone, iPad). If the app is already installed, open it from the desktop, Start menu or home screen.',
                    )}
                </p>
            )}
            {dialog}
        </section>
    );
}

function InstallSheet({ open, onClose, kind }: { open: boolean; onClose: () => void; kind: 'ios' | 'mac' }) {
    const t = useT();
    return (
        <SideSheet
            open={open}
            onClose={onClose}
            eyebrow={
                <>
                    <Download className="size-4" />
                    {t('Install the app')}
                </>
            }
            title={t('How to install')}
            footer={
                <Button variant="primary" onClick={onClose}>
                    {t('Done')}
                </Button>
            }
        >
            <Steps kind={kind} />
        </SideSheet>
    );
}

function Steps({ kind }: { kind: 'ios' | 'mac' }) {
    const t = useT();
    const steps: { icon?: LucideIcon; title: ReactNode; text?: ReactNode }[] =
        kind === 'ios'
            ? [
                  { icon: Share, title: t('Tap the Share button'), text: t('At the bottom of Safari (at the top on iPad).') },
                  { icon: SquarePlus, title: t('Choose “Add to Home Screen”'), text: t('Scroll down the list if you do not see it.') },
                  { title: t('Tap “Add”'), text: t('The MA icon appears on the home screen. Open the app from there.') },
              ]
            : [
                  { title: t('In Safari, open the File menu') },
                  { icon: SquarePlus, title: t('Choose “Add to Dock”') },
                  { title: t('Click “Add”'), text: t('The app opens in its own window from the Dock.') },
              ];

    return (
        <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
                <li key={i} className="border-line bg-panel flex gap-3 rounded-xl border p-3.5">
                    <span className="bg-p-soft text-p-ink grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold">
                        {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-semibold">
                            {s.title}
                            {s.icon && <s.icon className="text-p size-[18px]" strokeWidth={1.9} />}
                        </div>
                        {s.text && <p className="text-muted-foreground mt-0.5 text-[13px]">{s.text}</p>}
                    </div>
                </li>
            ))}
        </ol>
    );
}
