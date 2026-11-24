import { useSyncExternalStore } from 'react';

/*
 * "Install the app" (PWA). Chrome and Edge (computer and Android) offer an install prompt that the app can show from
 * its own button. Safari has no such prompt: on iPhone/iPad it is Share → Add to Home Screen, on a Mac
 * File → Add to Dock, so for those we show the steps instead. Firefox on a computer cannot install web apps.
 *
 * The browser fires `beforeinstallprompt` early, often before React has drawn anything, so app.tsx calls
 * listenForInstall() first thing.
 */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/** installed: running as the installed app. prompt: our button can install. ios / mac: show the steps. none: not possible here. */
export type InstallState = 'installed' | 'prompt' | 'ios' | 'mac' | 'none';

let deferred: PromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function listenForInstall() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); // keep it for our own button instead of the browser's mini bar
        deferred = e as PromptEvent;
        emit();
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        installedNow = true;
        emit();
    });
}

function standalone() {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

function current(): InstallState {
    if (typeof window === 'undefined') return 'none';
    if (installedNow || standalone()) return 'installed';
    if (deferred) return 'prompt';
    const ua = navigator.userAgent;
    const iPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/.test(ua) || iPad) return 'ios';
    // Safari on a Mac (not Chrome, Edge or Firefox, which also say "Safari" in the user agent).
    if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua)) return 'mac';
    return 'none';
}

let snapshot: InstallState = 'none';
function read() {
    const next = current();
    if (next !== snapshot) snapshot = next;
    return snapshot;
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/** Opens the browser's install dialog. Resolves true when the owner said yes. */
export async function promptInstall(): Promise<boolean> {
    if (!deferred) return false;
    const e = deferred;
    try {
        await e.prompt();
    } catch {
        return false; // only allowed from a real click or tap; the offer stays for the next one
    }
    const { outcome } = await e.userChoice;
    deferred = null; // a prompt can be used once
    if (outcome === 'accepted') installedNow = true;
    emit();
    return outcome === 'accepted';
}

export function useInstall(): InstallState {
    return useSyncExternalStore(subscribe, read, () => 'none');
}

/** Hidden "install" hints stay hidden on this device (the option stays in Settings and the user menu). */
const KEY = 'install-hint-hidden';
export function hintHidden() {
    try {
        return localStorage.getItem(KEY) === '1';
    } catch {
        return false;
    }
}
export function hideHint() {
    try {
        localStorage.setItem(KEY, '1');
    } catch {
        /* private mode: the hint just comes back next time */
    }
}
