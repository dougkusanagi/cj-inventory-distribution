import { createInertiaApp } from '@inertiajs/react';
import { IconContext } from '@phosphor-icons/react';
import * as Sentry from '@sentry/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment:
            import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
            stackFrameVariables: false,
        },
        tracesSampleRate: 0,
        beforeSendLog: () => null,
        beforeSendMetric: () => null,
    });
}

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'catalog':
            case name === 'changelog':
            case name === 'design-system':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <IconContext.Provider
                value={{ size: 24, weight: 'duotone', 'aria-hidden': true }}
            >
                <TooltipProvider delayDuration={0}>
                    {app}
                    <Toaster />
                </TooltipProvider>
            </IconContext.Provider>
        );
    },
    progress: {
        color: '#4B5563',
    },
    http: {
        xsrfCookieName: 'distribuicao-de-inventario-XSRF-TOKEN',
    },
});

// This will set light / dark mode on load...
initializeTheme();
