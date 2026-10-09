import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type CompactTab<T extends string> = {
    id: T;
    label: string;
    icon: PhosphorIcon;
};

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
    const activeIndex = Math.max(
        tabs.findIndex((tab) => tab.id === activeTab),
        0,
    );

    return (
        <div
            role="tablist"
            className="sticky top-[var(--app-header-offset,0px)] z-20 grid auto-cols-fr grid-flow-col gap-1.5 rounded-2xl border border-border bg-muted/95 p-1.5 backdrop-blur transition-[top] duration-200 ease-in-out"
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
                style={{
                    width: `calc((100% - 0.75rem - ${tabs.length - 1} * 0.375rem) / ${tabs.length})`,
                    transform: `translateX(calc(${activeIndex} * (100% + 0.375rem)))`,
                }}
            />
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
                            "relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            active
                                ? "text-foreground"
                                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                        )}
                    >
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        <span
                            className={cn(
                                active ? "inline" : "sr-only sm:not-sr-only",
                            )}
                        >
                            {label}
                        </span>
                        {errors > 0 && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                                {errors}
                                <span className="sr-only">
                                    {" "}
                                    erros para revisar
                                </span>
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
