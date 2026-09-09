import { Head } from '@inertiajs/react';
import { PackagePlus } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { index as productsIndex } from '@/routes/products';
import type { Category } from '@/types';

export default function CreateProduct({
    categories,
}: {
    categories: Category[];
}) {
    return (
        <>
            <Head title="Novo produto" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <PackagePlus className="size-5" />
                        </span>
                        <div className="grid gap-1.5">
                            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                                Cadastrar produto
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                                Registre a identidade da peça uma vez para que
                                ela possa receber ofertas de estoque depois.
                            </p>
                        </div>
                    </div>
                </header>

                <ProductForm categories={categories} />
            </div>
        </>
    );
}

CreateProduct.layout = {
    breadcrumbs: [
        {
            title: 'Produtos',
            href: productsIndex(),
        },
        {
            title: 'Novo produto',
            href: productsIndex(),
        },
    ],
};
