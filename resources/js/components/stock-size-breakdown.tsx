type StockSize = {
    size: string;
    quantity: number | null;
};

export function StockSizeBreakdown({ sizes }: { sizes: StockSize[] }) {
    if (sizes.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Tamanhos não informados
            </p>
        );
    }

    const sizesWithKnownQuantity = sizes.filter(
        ({ quantity }) => quantity !== null,
    );

    if (sizesWithKnownQuantity.length === 0) {
        return (
            <div className="grid gap-1 text-muted-foreground">
                <p className="text-sm">
                    Tamanhos: {sizes.map(({ size }) => size).join(' · ')}
                </p>
                <p className="text-xs">Quantidade por tamanho não informada.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
                Conteúdo por tamanho
            </p>
            <dl className="flex flex-wrap gap-2">
                {sizesWithKnownQuantity.map(({ size, quantity }) => (
                    <div
                        key={size}
                        className="grid min-w-16 justify-items-center gap-0.5 rounded-lg bg-muted px-3 py-2 tabular-nums"
                        aria-label={
                            quantity === null
                                ? `Tamanho ${size}, quantidade não informada`
                                : `Tamanho ${size}, ${quantity} ${quantity === 1 ? 'peça' : 'peças'}`
                        }
                    >
                        <dt className="text-base leading-5 font-semibold text-foreground">
                            {size}
                        </dt>
                        <dd className="text-xs leading-4 text-muted-foreground">
                            {quantity === null
                                ? 'Não informada'
                                : `${quantity} ${quantity === 1 ? 'pç' : 'pçs'}`}
                        </dd>
                    </div>
                ))}
            </dl>
            {sizesWithKnownQuantity.length < sizes.length && (
                <p className="text-xs text-muted-foreground">
                    Alguns tamanhos não têm quantidade informada.
                </p>
            )}
        </div>
    );
}
