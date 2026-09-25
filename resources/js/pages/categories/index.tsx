import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { destroy } from '@/actions/App/Http/Controllers/CategoryController';
import { Badge } from '@/components/ui/badge';
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
                            <Plus />
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
                        <Search />
                        Buscar
                    </Button>
                </form>
                <div className="grid gap-3">
                    {categories.data.map((category) => (
                        <Card
                            key={category.id}
                            className="flex-row items-center justify-between gap-4 rounded-2xl p-4 shadow-sm"
                        >
                            <div className="grid gap-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-semibold">
                                        {category.name}
                                    </h2>
                                    <Badge
                                        variant={
                                            category.is_active
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {category.is_active
                                            ? 'Ativa'
                                            : 'Inativa'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {category.products_count ?? 0} produtos
                                    vinculados
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button asChild variant="ghost" size="icon">
                                    <Link
                                        href={edit(category.id)}
                                        aria-label={`Editar ${category.name}`}
                                    >
                                        <Pencil />
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={
                                        (category.products_count ?? 0) > 0
                                    }
                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() =>
                                        setCategoryToDelete(category)
                                    }
                                    aria-label={`Excluir ${category.name}`}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        </Card>
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
                                        <Plus />
                                        Criar primeira categoria
                                    </Link>
                                </Button>
                            )}
                        </Card>
                    )}
                </div>

                <nav className="flex flex-wrap gap-2" aria-label="Paginação">
                    {categories.links.map(
                        (link) =>
                            link.url && (
                                <Button
                                    key={link.label}
                                    asChild
                                    variant={
                                        link.active ? 'default' : 'outline'
                                    }
                                    size="sm"
                                >
                                    <Link href={link.url}>
                                        {link.label
                                            .replace('&laquo;', '')
                                            .replace('&raquo;', '')
                                            .replace('Previous', 'Anterior')
                                            .replace('Next', 'Próxima')}
                                    </Link>
                                </Button>
                            ),
                    )}
                </nav>
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
