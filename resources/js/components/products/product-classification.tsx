import { Fragment } from 'react';
import type { Product, ProductLine, StockOfferType } from '@/types';

export const stockOfferTypeLabels: Record<StockOfferType, string> = {
    replenishment: 'Reposição',
    new_grade: 'Nova',
    broken_grade: 'Furada',
};

export const productLineLabels: Record<ProductLine, string> = {
    slim: 'Slim',
    plus: 'Plus',
};

export function ProductClassification({ product }: { product: Product }) {
    const stockOfferType = product.stock_offer_type;
    const productLine = product.line;

    const classifications = [
        product.is_active ? 'Ativo' : 'Inativo',
        `Grade: ${stockOfferType ? stockOfferTypeLabels[stockOfferType] : 'Sem oferta'}`,
        productLine ? productLineLabels[productLine] : null,
        product.category?.name ?? null,
        product.wash_type?.name ?? null,
    ].filter(
        (classification): classification is string => classification !== null,
    );

    return (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            {classifications.map((classification, index) => (
                <Fragment key={`${classification}-${index}`}>
                    {index > 0 && (
                        <span
                            className="size-1 rounded-full bg-muted-foreground/60"
                            aria-hidden="true"
                        />
                    )}
                    <span>{classification}</span>
                </Fragment>
            ))}
        </div>
    );
}
