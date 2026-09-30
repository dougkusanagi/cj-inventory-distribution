import { TaxonomyCard } from '@/components/taxonomy-card';
import { Pagination } from '@/components/pagination';
import { Head, Link, router } from '@inertiajs/react';
import { MagnifyingGlassIcon, PlusCircleIcon } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { destroy } from '@/actions/App/Http/Controllers/CategoryController';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { create, edit, index } from '@/routes/categories';
import type { Category, Paginated } from '@/types';

export default function CategoriesIndex({
    categories,
    filters,
}: {
    categories: Paginated<Category>;
    filters: { search: string };
}) {
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
        null,
    );

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const search = data.get('search');
        router.get(
            index.url(),
            { search: typeof search === 'string' ? search : '' },
            { preserveState: true },
        );
    };

    return (
        <>
            <Head title="Categorias" />
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Catálogo
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Categorias
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Organize as classificações usadas nos produtos.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create()}>
                            <PlusCircleIcon />
                            Nova categoria
                        </Link>
                    </Button>
                </header>

                <form onSubmit={submitSearch} className="flex gap-2">
                    <Input
                        name="search"
                        defaultValue={filters.search}
                        placeholder="Buscar categoria"
                        className="max-w-md"
                    />
                    <Button type="submit" variant="secondary">
                        <MagnifyingGlassIcon />
                        Buscar
                    </Button>
                </form>
                <div className="grid gap-3">
                    {categories.data.map((category) => (
                        <TaxonomyCard
                            key={category.id}
                            name={category.name}
                            active={category.is_active}
                            activeLabel="Ativa"
                            inactiveLabel="Inativa"
                            productsCount={category.products_count ?? 0}
                            editHref={edit(category.id)}
                            deleteDisabled={(category.products_count ?? 0) > 0}
                            onDelete={() => setCategoryToDelete(category)}
                        />
                    ))}
                    {categories.data.length === 0 && (
                        <Card className="grid justify-items-center gap-4 p-8 text-center shadow-sm">
                            <p className="text-sm text-muted-foreground">
                                {filters.search
                                    ? 'Nenhuma categoria encontrada para esta busca.'
                                    : 'Nenhuma categoria cadastrada ainda.'}
                            </p>
                            {filters.search ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        router.get(
                                            index.url(),
                                            { search: '' },
                                            {
                                                preserveState: true,
                                                replace: true,
                                            },
                                        )
                                    }
                                >
                                    Limpar busca
                                </Button>
                            ) : (
                                <Button asChild>
                                    <Link href={create()}>
                                        <PlusCircleIcon />
                                        Criar primeira categoria
                                    </Link>
                                </Button>
                            )}
                        </Card>
                    )}
                </div>

                <Pagination links={categories.links} />
            </div>
            <ConfirmationDialog
                open={categoryToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCategoryToDelete(null);
                    }
                }}
                title={`Excluir a categoria ${categoryToDelete?.name ?? ''}?`}
                description="A categoria será removida do catálogo. Produtos existentes não serão excluídos."
                confirmLabel="Excluir categoria"
                destructive
                onConfirm={() => {
                    if (!categoryToDelete) {
                        return;
                    }

                    const categoryId = categoryToDelete.id;

                    setCategoryToDelete(null);
                    router.delete(destroy.url(categoryId));
                }}
            />
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [{ title: 'Categorias', href: index() }],
};
