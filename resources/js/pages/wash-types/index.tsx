import { TaxonomyCard } from '@/components/taxonomy-card';
import { Pagination } from '@/components/pagination';
import { Head, Link, router } from '@inertiajs/react';
import { MagnifyingGlassIcon, PlusCircleIcon } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { destroy } from '@/actions/App/Http/Controllers/WashTypeController';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { create, edit, index } from '@/routes/wash-types';
import type { WashType, Paginated } from '@/types';

export default function WashTypesIndex({
    washTypes,
    filters,
}: {
    washTypes: Paginated<WashType>;
    filters: { search: string };
}) {
    const [washTypeToDelete, setWashTypeToDelete] = useState<WashType | null>(
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
            <Head title="Tipos de lavagem" />
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Tipos de lavagem
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Gerencie os tipos de lavagem usados nas peças.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create()}>
                            <PlusCircleIcon />
                            Novo tipo de lavagem
                        </Link>
                    </Button>
                </header>

                <form onSubmit={submitSearch} className="flex gap-2">
                    <Input
                        name="search"
                        defaultValue={filters.search}
                        placeholder="Buscar tipo de lavagem"
                        className="max-w-md"
                    />
                    <Button type="submit" variant="secondary">
                        <MagnifyingGlassIcon />
                        Buscar
                    </Button>
                </form>
                <div className="grid gap-3">
                    {washTypes.data.map((washType) => (
                        <TaxonomyCard
                            key={washType.id}
                            name={washType.name}
                            active={washType.is_active}
                            activeLabel="Ativo"
                            inactiveLabel="Inativo"
                            productsCount={washType.products_count ?? 0}
                            editHref={edit(washType.id)}
                            deleteDisabled={(washType.products_count ?? 0) > 0}
                            onDelete={() => setWashTypeToDelete(washType)}
                        />
                    ))}
                    {washTypes.data.length === 0 && (
                        <Card className="grid justify-items-center gap-4 p-8 text-center shadow-sm">
                            <p className="text-sm text-muted-foreground">
                                {filters.search
                                    ? 'Nenhum tipo de lavagem encontrado para esta busca.'
                                    : 'Nenhum tipo de lavagem cadastrado ainda.'}
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
                                        Criar primeiro tipo de lavagem
                                    </Link>
                                </Button>
                            )}
                        </Card>
                    )}
                </div>

                <Pagination links={washTypes.links} />
            </div>
            <ConfirmationDialog
                open={washTypeToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setWashTypeToDelete(null);
                    }
                }}
                title={`Excluir o tipo de lavagem ${washTypeToDelete?.name ?? ''}?`}
                description="O tipo de lavagem será removido do catálogo. Produtos existentes não serão excluídos."
                confirmLabel="Excluir tipo de lavagem"
                destructive
                onConfirm={() => {
                    if (!washTypeToDelete) {
                        return;
                    }

                    const washTypeId = washTypeToDelete.id;

                    setWashTypeToDelete(null);
                    router.delete(destroy.url(washTypeId));
                }}
            />
        </>
    );
}

WashTypesIndex.layout = {
    breadcrumbs: [{ title: 'Tipos de lavagem', href: index() }],
};
