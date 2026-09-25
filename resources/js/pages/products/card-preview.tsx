import {
    cardPreview as productsCardPreview,
    index as productsIndex,
} from '@/routes/products';
import ProductsIndex, { type ProductsIndexProps } from './index';

export default function ProductsCardPreview(props: ProductsIndexProps) {
    return (
        <ProductsIndex
            {...props}
            cardVariant="refined"
            indexUrl={productsCardPreview.url()}
        />
    );
}

ProductsCardPreview.layout = {
    breadcrumbs: [
        {
            title: 'Produtos',
            href: productsIndex(),
        },
        {
            title: 'Cards refinados',
            href: productsCardPreview(),
        },
    ],
};
