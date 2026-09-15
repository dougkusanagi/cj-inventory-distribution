import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CompactTab<T extends string> = { id: T; label: string; icon: LucideIcon };

export function CompactTabs<T extends string>({
    tabs,
    activeTab,
    onChange,
    errorCount,
    idPrefix,
    panelIdPrefix,
}: {
    tabs: readonly CompactTab<T>[];
    activeTab: T;
    onChange: (tab: T) => void;
    errorCount?: (tab: T) => number;
    idPrefix: string;
    panelIdPrefix: string;
}) {
    return (
        <div
            role="tablist"
            className="sticky top-0 z-20 grid grid-flow-col auto-cols-fr gap-1.5 rounded-2xl border border-border bg-muted/95 p-1.5 backdrop-blur"
        >
            {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                const errors = errorCount?.(id) ?? 0;

                return (
                    <button
                        key={id}
                        id={`${idPrefix}-${id}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={`${panelIdPrefix}-${id}`}
                        onClick={() => onChange(id)}
                        className={cn(
                            'flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            active
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                        )}
                    >
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        <span
                            className={cn(
                                active ? 'inline' : 'sr-only sm:not-sr-only',
                            )}
                        >
                            {label}
                        </span>
                        {errors > 0 && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                                {errors}
                                <span className="sr-only"> erros para revisar</span>
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
