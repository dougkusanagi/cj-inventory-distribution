import {
    cardPreviewV3 as productsCardPreviewV3,
    index as productsIndex,
} from '@/routes/products';
import ProductsIndex, { type ProductsIndexProps } from './index';

export default function ProductsCardPreviewV3(props: ProductsIndexProps) {
    return (
        <ProductsIndex
            {...props}
            cardVariant="v3"
            indexUrl={productsCardPreviewV3.url()}
        />
    );
}

ProductsCardPreviewV3.layout = {
    breadcrumbs: [
        {
            title: 'Produtos',
            href: productsIndex(),
        },
        {
            title: 'Cards v3',
            href: productsCardPreviewV3(),
        },
    ],
};
