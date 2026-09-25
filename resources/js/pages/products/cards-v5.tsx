import { cardPreviewV5, index as productsIndex } from '@/routes/products';
import ProductsCardPreview, {
    type ProductsIndexProps,
} from './card-preview-page';

export default function ProductsCardsV5(props: ProductsIndexProps) {
    return (
        <ProductsCardPreview
            {...props}
            listingUrl={cardPreviewV5.url()}
            variant="v5"
        />
    );
}

ProductsCardsV5.layout = {
    breadcrumbs: [
        { title: 'Produtos', href: productsIndex() },
        { title: 'Cards v5', href: cardPreviewV5() },
    ],
};
