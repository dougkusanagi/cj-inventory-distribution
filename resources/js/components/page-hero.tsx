import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeroProps = {
    eyebrow: string;
    title: string;
    description: string;
    icon?: PhosphorIcon;
    aside?: ReactNode;
    asideClassName?: string;
    className?: string;
};

export function PageHero({
    eyebrow,
    title,
    description,
    icon: Icon,
    aside,
    asideClassName,
    className,
}: PageHeroProps) {
    return (
        <header
            className={cn(
                'ds-reveal relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-8 shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--foreground)_6%,transparent)] sm:px-10 sm:py-12',
                className,
            )}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-foreground/[0.04] via-transparent to-transparent"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent sm:inset-x-14"
            />
            <div
                className={cn(
                    'grid gap-8',
                    aside && 'lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end',
                )}
            >
                <div className="grid max-w-xl gap-5">
                    <p className="ds-eyebrow flex items-center gap-2.5 text-highlight">
                        <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                        />
                        {eyebrow}
                    </p>
                    <h1 className="ds-display flex items-center gap-4 text-4xl text-balance sm:text-5xl">
                        {Icon && (
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-highlight sm:size-14">
                                <Icon
                                    aria-hidden="true"
                                    className="size-6 sm:size-7"
                                />
                            </span>
                        )}
                        <span>{title}</span>
                    </h1>
                    <p className="max-w-md text-sm leading-6 text-pretty text-muted-foreground sm:text-base sm:leading-7">
                        {description}
                    </p>
                </div>
                {aside && <div className={asideClassName}>{aside}</div>}
            </div>
        </header>
    );
}
