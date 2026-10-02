import { cn } from '@/lib/utils';

type StockQuantityDetailsProps = {
    physicalQuantity: number;
    availableSackCount: number;
    reservedQuantity: number;
    consumedQuantity: number;
    layout?: 'rows' | 'columns';
    className?: string;
};

export function StockQuantityDetails({
    physicalQuantity,
    availableSackCount,
    reservedQuantity,
    consumedQuantity,
    layout = 'rows',
    className,
}: StockQuantityDetailsProps) {
    return (
        <dl
            className={cn(
                'grid gap-x-3 text-xs leading-4 tabular-nums',
                layout === 'columns'
                    ? 'grid-cols-2 gap-y-2'
                    : 'grid-cols-[max-content_minmax(0,1fr)] gap-y-0.5',
                className,
            )}
        >
            <div className={layout === 'columns' ? 'grid gap-0.5' : 'contents'}>
                <dt>Estoque físico</dt>
                <dd
                    className={cn(
                        'font-medium',
                        layout === 'rows' && 'text-left',
                    )}
                >
                    {physicalQuantity} peças
                </dd>
            </div>
            <div className={layout === 'columns' ? 'grid gap-0.5' : 'contents'}>
                <dt>Sacos disponíveis</dt>
                <dd
                    className={cn(
                        'font-medium',
                        layout === 'rows' && 'text-left',
                    )}
                >
                    {availableSackCount}
                </dd>
            </div>
            {reservedQuantity > 0 && (
                <div
                    className={
                        layout === 'columns' ? 'grid gap-0.5' : 'contents'
                    }
                >
                    <dt>Peças reservadas</dt>
                    <dd
                        className={cn(
                            'font-medium',
                            layout === 'rows' && 'text-left',
                        )}
                    >
                        {reservedQuantity}
                    </dd>
                </div>
            )}
            {consumedQuantity > 0 && (
                <div
                    className={
                        layout === 'columns' ? 'grid gap-0.5' : 'contents'
                    }
                >
                    <dt>Peças baixadas</dt>
                    <dd
                        className={cn(
                            'font-medium',
                            layout === 'rows' && 'text-left',
                        )}
                    >
                        {consumedQuantity}
                    </dd>
                </div>
            )}
        </dl>
    );
}
