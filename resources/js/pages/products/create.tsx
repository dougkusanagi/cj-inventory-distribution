import { Head } from '@inertiajs/react';
import { PackagePlus } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { index as productsIndex } from '@/routes/products';

export default function CreateProduct() {
    return (
        <>
            <Head title="Novo produto" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
                    <div className="flex items-start gap-4">
                        <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                            <PackagePlus className="size-5" />
                        </span>
                        <div className="grid gap-1.5">
                            <p className="text-xs font-semibold tracking-[0.2em] text-highlight uppercase">
                                Catálogo / novo registro
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                Cadastrar produto
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                                Registre a identidade da peça uma vez para que
                                ela possa receber ofertas de estoque depois.
                            </p>
                        </div>
                    </div>
                </header>

                <ProductForm />
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
