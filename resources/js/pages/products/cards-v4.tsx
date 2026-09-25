import { cardPreviewV4 } from '@/routes/products';
import ProductsCardPreview, {
    type ProductsIndexProps,
} from './card-preview-page';

export default function ProductsCardsV4(props: ProductsIndexProps) {
    return (
        <ProductsCardPreview
            {...props}
            listingUrl={cardPreviewV4.url()}
            variant="v4"
        />
    );
}

ProductsCardsV4.layout = {
    breadcrumbs: [{ title: 'Produtos', href: cardPreviewV4() }],
};
