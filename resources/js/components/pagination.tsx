import { Link } from '@inertiajs/react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/types';

function direction(label: string): 'previous' | 'next' | null {
    if (label === 'pagination.previous' || /Previous|laquo/.test(label))
        return 'previous';
    if (label === 'pagination.next' || /Next|raquo/.test(label)) return 'next';
    return null;
}

export function Pagination({
    links,
    compact = false,
    ariaLabel = 'Paginação',
}: {
    links: Paginated<unknown>['links'];
    compact?: boolean;
    ariaLabel?: string;
}) {
    return (
        <nav
            className={
                compact
                    ? 'flex items-center justify-center gap-1'
                    : 'flex flex-wrap gap-2'
            }
            aria-label={ariaLabel}
        >
            {links.map((link) => {
                if (!compact && !link.url) return null;
                const side = direction(link.label);
                const label =
                    side === 'previous'
                        ? 'Anterior'
                        : side === 'next'
                          ? 'Próxima'
                          : link.label;
                return (
                    <Button
                        key={`${link.label}-${link.url ?? 'disabled'}`}
                        variant={
                            link.active
                                ? compact
                                    ? 'secondary'
                                    : 'default'
                                : compact
                                  ? 'ghost'
                                  : 'outline'
                        }
                        size="sm"
                        asChild={link.url !== null}
                        disabled={link.url === null}
                        aria-label={label}
                    >
                        {link.url ? (
                            <Link href={link.url} preserveScroll={compact}>
                                {compact && side === 'previous' && (
                                    <CaretLeftIcon weight="bold" />
                                )}
                                {compact && side === 'next' && (
                                    <CaretRightIcon weight="bold" />
                                )}
                                <span
                                    className={
                                        compact && side
                                            ? 'hidden sm:inline'
                                            : undefined
                                    }
                                >
                                    {label}
                                </span>
                            </Link>
                        ) : (
                            <span>{label}</span>
                        )}
                    </Button>
                );
            })}
        </nav>
    );
}
