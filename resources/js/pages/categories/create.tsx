import { Head } from '@inertiajs/react';
import { CategoryForm } from '@/components/categories/category-form';
import { index } from '@/routes/categories';

export default function CreateCategory() {
    return (
        <>
            <Head title="Nova categoria" />
            <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
                <header className="grid gap-2">
                    <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                        Categorias
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Nova categoria
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Crie uma classificação simples para organizar os
                        produtos.
                    </p>
                </header>
                <CategoryForm />
            </div>
        </>
    );
}

CreateCategory.layout = {
    breadcrumbs: [
        { title: 'Categorias', href: index() },
        { title: 'Nova categoria', href: index() },
    ],
};
