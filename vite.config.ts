import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { loadEnv } from 'vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const appUrl = env.APP_URL ? new URL(env.APP_URL) : null;
    const devServerUrl = env.VITE_DEV_SERVER_URL
        ? new URL(env.VITE_DEV_SERVER_URL)
        : null;

    return {
        plugins: lazyPlugins(() => [
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
        ]),
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
        lint: {
            env: {
                browser: true,
                builtin: true,
            },
            ignorePatterns: [
                'vendor/**',
                'node_modules/**',
                'public/**',
                'bootstrap/ssr/**',
                'tailwind.config.js',
                'resources/js/actions/**',
                'resources/js/components/ui/*',
                'resources/js/routes/**',
                'resources/js/wayfinder/**',
            ],
            options: {
                denyWarnings: true,
                typeAware: true,
                typeCheck: true,
            },
        },
        fmt: {
            printWidth: 80,
            tabWidth: 4,
            singleQuote: true,
            semi: true,
            singleAttributePerLine: false,
            htmlWhitespaceSensitivity: 'css',
            sortPackageJson: false,
            sortTailwindcss: {
                functions: ['clsx', 'cn', 'cva'],
                stylesheet: 'resources/css/app.css',
            },
            ignorePatterns: [
                '.agents/**',
                '.ai/**',
                '.codex/**',
                '.github/**',
                'AGENTS.md',
                'boost.json',
                'composer.json',
                'docs/**',
                'opencode.json',
                'pnpm-workspace.yaml',
                'resources/js/components/ui/*',
                'resources/views/mail/*',
            ],
        },
    };
});
