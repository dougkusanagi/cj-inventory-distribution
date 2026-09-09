import { Head } from '@inertiajs/react';
import { CategoryForm } from '@/components/categories/category-form';
import { index } from '@/routes/categories';
import type { Category } from '@/types';

export default function EditCategory({ category }: { category: Category }) {
    return (
        <>
            <Head title={`Editar ${category.name}`} />
            <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
                <header className="grid gap-2">
                    <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                        Categorias
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Editar categoria
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Atualize o nome ou a disponibilidade para novos
                        produtos.
                    </p>
                </header>
                <CategoryForm category={category} />
            </div>
        </>
    );
}

EditCategory.layout = {
    breadcrumbs: [
        { title: 'Categorias', href: index() },
        { title: 'Editar categoria', href: index() },
    ],
};
