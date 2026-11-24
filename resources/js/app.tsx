import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { MotionConfig } from 'motion/react';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';
import { listenForInstall } from './lib/install';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Before anything is drawn: the browser's install offer can come right away (lib/install.ts).
listenForInstall();

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Animations follow the system setting "reduce motion" (docs/DESIGN.md "Motion").
        root.render(
            <MotionConfig reducedMotion="user">
                <App {...props} />
            </MotionConfig>,
        );
    },
    progress: {
        color: '#1fa5a8',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Installable app (PWA). Only in a production build: the dev server's hot reload and a service worker do not mix.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
