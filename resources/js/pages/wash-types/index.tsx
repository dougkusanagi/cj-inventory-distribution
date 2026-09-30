import { Head, Link, router } from '@inertiajs/react';
import {
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusCircleIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { destroy } from '@/actions/App/Http/Controllers/WashTypeController';
import { Badge } from '@/components/ui/badge';
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
                        <Card
                            key={washType.id}
                            className="flex-row items-center justify-between gap-4 rounded-2xl p-4 shadow-sm"
                        >
                            <div className="grid gap-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-semibold">
                                        {washType.name}
                                    </h2>
                                    <Badge
                                        variant={
                                            washType.is_active
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {washType.is_active
                                            ? 'Ativo'
                                            : 'Inativo'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {washType.products_count ?? 0} produtos
                                    vinculados
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button asChild variant="ghost" size="icon">
                                    <Link
                                        href={edit(washType.id)}
                                        aria-label={`Editar ${washType.name}`}
                                    >
                                        <PencilSimpleIcon />
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={
                                        (washType.products_count ?? 0) > 0
                                    }
                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() =>
                                        setWashTypeToDelete(washType)
                                    }
                                    aria-label={`Excluir ${washType.name}`}
                                >
                                    <TrashIcon />
                                </Button>
                            </div>
                        </Card>
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

                <nav className="flex flex-wrap gap-2" aria-label="Paginação">
                    {washTypes.links.map(
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
