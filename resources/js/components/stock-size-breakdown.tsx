import { cn } from '@/lib/utils';

type StockSize = {
    size: string;
    quantity: number | null;
};

export function StockSizeBreakdown({
    sizes,
    compact = false,
    showUnknownAsCards = false,
    sizesOnly = false,
}: {
    sizes: StockSize[];
    compact?: boolean;
    showUnknownAsCards?: boolean;
    sizesOnly?: boolean;
}) {
    if (sizes.length === 0) {
        return (
            <p
                className={cn(
                    'text-sm text-muted-foreground',
                    compact && 'text-xs',
                )}
            >
                Tamanhos não informados
            </p>
        );
    }

    if (sizesOnly) {
        return (
            <div
                aria-label="Tamanhos presentes"
                className="flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-1"
            >
                {sizes.map(({ size }) => (
                    <span
                        key={size}
                        className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted px-1.5 text-xs font-semibold whitespace-nowrap tabular-nums"
                    >
                        {size}
                    </span>
                ))}
            </div>
        );
    }

    const sizesWithKnownQuantity = sizes.filter(
        ({ quantity }) => quantity !== null,
    );

    if (!showUnknownAsCards && sizesWithKnownQuantity.length === 0) {
        return (
            <div className="grid gap-1 text-muted-foreground">
                <p className={cn('text-sm', compact && 'text-xs')}>
                    Tamanhos: {sizes.map(({ size }) => size).join(' · ')}
                </p>
                <p className={cn('text-xs', compact && 'text-[10px]')}>
                    Quantidade por tamanho não informada.
                </p>
            </div>
        );
    }

    return (
        <div className={cn('grid gap-2', compact && 'gap-1.5')}>
            {!compact && (
                <p className="text-xs font-medium text-muted-foreground">
                    Conteúdo por tamanho
                </p>
            )}
            <dl
                aria-label="Conteúdo por tamanho"
                className={cn('flex flex-wrap gap-2', compact && 'gap-1.5')}
            >
                {(showUnknownAsCards ? sizes : sizesWithKnownQuantity).map(
                    ({ size, quantity }) => (
                        <div
                            key={size}
                            className={cn(
                                'grid min-w-16 justify-items-center gap-0.5 rounded-lg bg-muted px-3 py-2 tabular-nums',
                                compact &&
                                    'min-w-10 rounded-md border border-border/70 px-2 py-1.5',
                            )}
                            aria-label={
                                quantity === null
                                    ? `Tamanho ${size}, quantidade não informada`
                                    : `Tamanho ${size}, ${quantity} ${quantity === 1 ? 'peça' : 'peças'}`
                            }
                        >
                            <dt
                                className={cn(
                                    'text-base leading-5 font-semibold text-foreground',
                                    compact && 'text-sm leading-4',
                                )}
                            >
                                {size}
                            </dt>
                            <dd
                                className={cn(
                                    'text-xs leading-4 text-muted-foreground',
                                    compact && 'text-[10px] leading-3',
                                )}
                                title={
                                    quantity === null
                                        ? 'Quantidade não informada'
                                        : undefined
                                }
                            >
                                {quantity === null
                                    ? compact
                                        ? '—'
                                        : 'Não informada'
                                    : `${quantity} ${quantity === 1 ? 'pç' : 'pçs'}`}
                            </dd>
                        </div>
                    ),
                )}
            </dl>
            {sizesWithKnownQuantity.length < sizes.length && (
                <p
                    className={cn(
                        'text-xs text-muted-foreground',
                        compact && 'text-[10px]',
                    )}
                >
                    Alguns tamanhos não têm quantidade informada.
                </p>
            )}
        </div>
    );
}
