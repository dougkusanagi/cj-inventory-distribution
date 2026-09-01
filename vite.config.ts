import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const appUrl = env.APP_URL ? new URL(env.APP_URL) : null;
    const devServerUrl = env.VITE_DEV_SERVER_URL
        ? new URL(env.VITE_DEV_SERVER_URL)
        : null;

    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                refresh: true,
                fonts: [
                    bunny('Instrument Sans', {
                        weights: [400, 500, 600],
                    }),
                ],
                detectTls: false,
            }),
            inertia(),
            react({
                babel: {
                    plugins: ['babel-plugin-react-compiler'],
                },
            }),
            tailwindcss(),
            wayfinder({
                formVariants: true,
            }),
        ],
        server: {
            ...(devServerUrl
                ? {
                      host: devServerUrl.hostname,
                      origin: devServerUrl.origin,
                      port: Number(devServerUrl.port) || 5173,
                      hmr: {
                          host: devServerUrl.hostname,
                          port: Number(devServerUrl.port) || 5173,
                      },
                      cors: appUrl
                          ? {
                                origin: appUrl.origin,
                            }
                          : undefined,
                  }
                : {}),
            watch: {
                ignored: [
                    '**/.agents/**',
                    '**/.claude/**',
                    '**/.cursor/**',
                    '**/.junie/**',
                    '**/vendor/**',
                ],
            },
        },
    };
});
