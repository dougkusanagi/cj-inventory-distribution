import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(20rem,0.9fr)_minmax(30rem,1.1fr)]">
            <aside className="relative hidden overflow-hidden bg-featured-card p-10 text-featured-card-foreground lg:flex lg:flex-col lg:justify-between">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                <Link href={home()} className="relative w-fit">
                    <img
                        src="/images/brand/logo-cronicas-white.png"
                        alt="Crônicas Jeans"
                        className="h-16 w-auto object-contain"
                    />
                </Link>
                <div className="relative grid max-w-md gap-4 pb-8">
                    <p className="text-3xl leading-tight font-semibold tracking-tight text-balance">
                        Distribuição de estoque com clareza e agilidade.
                    </p>
                    <p className="max-w-sm text-sm leading-6 text-featured-card-muted">
                        Gestão interna de produtos, sacos e pedidos da Crônicas
                        Jeans.
                    </p>
                </div>
            </aside>

            <main className="flex min-h-svh items-center justify-center p-5 sm:p-8 lg:p-12">
                <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-[0_18px_55px_-30px_oklch(0.22_0.035_38_/_0.45)] sm:p-9 dark:shadow-[0_18px_55px_-30px_black]">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-start gap-5">
                            <Link href={home()} className="block lg:hidden">
                                <img
                                    src="/images/brand/logo-cronicas-color.png"
                                    alt="Crônicas Jeans"
                                    className="h-12 w-auto object-contain dark:hidden"
                                />
                                <img
                                    src="/images/brand/logo-cronicas-white.png"
                                    alt="Crônicas Jeans"
                                    className="hidden h-12 w-auto object-contain dark:block"
                                />
                            </Link>

                            <div className="grid gap-2">
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    {title}
                                </h1>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
