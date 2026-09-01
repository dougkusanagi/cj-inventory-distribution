import { Head } from '@inertiajs/react';
import { Package } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { index as productsIndex } from '@/routes/products';
import type { Product } from '@/types';

export default function EditProduct({ product }: { product: Product }) {
    return (
        <>
            <Head title={`Editar ${product.name}`} />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
                    <div className="flex items-start gap-4">
                        <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-featured-card text-featured-card-foreground shadow-sm">
                            <Package className="size-5" />
                        </span>
                        <div className="grid gap-1.5">
                            <p className="font-mono text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                                {product.code}
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                Editar produto
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                                Atualize a referência da peça sem perder o
                                código interno ou o histórico de uso.
                            </p>
                        </div>
                    </div>
                </header>

                <ProductForm product={product} />
            </div>
        </>
    );
}

EditProduct.layout = {
    breadcrumbs: [
        {
            title: 'Produtos',
            href: productsIndex(),
        },
        {
            title: 'Editar produto',
            href: productsIndex(),
        },
    ],
};
