import { cn } from '@/lib/utils';

type StockQuantityDetailsProps = {
    physicalQuantity: number;
    availableSackCount: number;
    reservedQuantity: number;
    consumedQuantity: number;
    className?: string;
};

export function StockQuantityDetails({
    physicalQuantity,
    availableSackCount,
    reservedQuantity,
    consumedQuantity,
    className,
}: StockQuantityDetailsProps) {
    return (
        <dl
            className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-xs leading-4 tabular-nums',
                className,
            )}
        >
            <dt>Estoque físico</dt>
            <dd className="text-right font-medium">{physicalQuantity} peças</dd>
            <dt>Sacos disponíveis</dt>
            <dd className="text-right font-medium">{availableSackCount}</dd>
            {reservedQuantity > 0 && (
                <>
                    <dt>Peças reservadas</dt>
                    <dd className="text-right font-medium">
                        {reservedQuantity}
                    </dd>
                </>
            )}
            {consumedQuantity > 0 && (
                <>
                    <dt>Peças baixadas</dt>
                    <dd className="text-right font-medium">
                        {consumedQuantity}
                    </dd>
                </>
            )}
        </dl>
    );
}
