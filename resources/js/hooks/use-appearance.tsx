import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

// The design's default is light (docs/DESIGN.md); 'system' is still honoured if it was saved.
const DEFAULT: Appearance = 'light';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());
    document.documentElement.classList.toggle('dark', isDark);
};

const read = (): Appearance => {
    try {
        return (localStorage.getItem('appearance') as Appearance) || DEFAULT;
    } catch {
        return DEFAULT;
    }
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const handleSystemThemeChange = () => applyTheme(read());

export function initializeTheme() {
    applyTheme(read());
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(read);

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        try {
            localStorage.setItem('appearance', mode);
        } catch {
            // private mode: the choice just isn't remembered
        }
        applyTheme(mode);
    };

    useEffect(() => {
        applyTheme(appearance);
    }, [appearance]);

    return { appearance, updateAppearance };
}
