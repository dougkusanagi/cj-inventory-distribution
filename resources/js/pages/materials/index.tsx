import { Head, Link, router } from '@inertiajs/react';
import {
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusCircleIcon,
} from '@phosphor-icons/react';
import { useRef, useState, type FormEvent } from 'react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { index } from '@/routes/materials';
import type { Paginated } from '@/types';
import {
    MaterialForm,
    type Material,
    type MaterialOption,
} from './material-form';

export default function MaterialsIndex({
    materials,
    search,
    canEdit,
    types,
    units,
}: {
    materials: Pick<Paginated<Material>, 'data' | 'links'>;
    search: string;
    canEdit: boolean;
    types: MaterialOption[];
    units: MaterialOption[];
}) {
    const [editing, setEditing] = useState<Material | null | undefined>();
    const opener = useRef<HTMLButtonElement | null>(null);

    const closeForm = () => {
        setEditing(undefined);
        requestAnimationFrame(() => opener.current?.focus());
    };

    const searchMaterials = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = new FormData(event.currentTarget).get('search');
        router.get(
            index.url(),
            { search: typeof query === 'string' ? query : '' },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Insumos" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Insumos
                    </h1>
                    {canEdit && (
                        <Button
                            className="h-11"
                            onClick={(event) => {
                                opener.current = event.currentTarget;
                                setEditing(null);
                            }}
                        >
                            <PlusCircleIcon /> Novo insumo
                        </Button>
                    )}
                </header>
                <form onSubmit={searchMaterials} className="flex gap-2">
                    <Input
                        type="search"
                        name="search"
                        key={search}
                        defaultValue={search}
                        aria-label="Buscar por nome ou código"
                        placeholder="Nome ou código"
                        className="h-11"
                    />
                    <Button type="submit" variant="secondary" className="h-11">
                        <MagnifyingGlassIcon /> Buscar
                    </Button>
                </form>
                <div className="grid gap-3">
                    {materials.data.map((material) => (
                        <Card
                            key={material.id}
                            className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="min-w-0 text-lg font-semibold break-words">
                                        {material.name}
                                    </h2>
                                    {!material.is_active && (
                                        <Badge variant="secondary">
                                            Inativo
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {material.code} ·{' '}
                                    {
                                        types.find(
                                            (option) =>
                                                option.value === material.type,
                                        )?.label
                                    }{' '}
                                    ·{' '}
                                    {
                                        units.find(
                                            (option) =>
                                                option.value === material.unit,
                                        )?.label
                                    }
                                </p>
                            </div>
                            {canEdit && (
                                <Button
                                    variant="outline"
                                    className="h-11"
                                    aria-label={`Editar ${material.name}`}
                                    onClick={(event) => {
                                        opener.current = event.currentTarget;
                                        setEditing(material);
                                    }}
                                >
                                    <PencilSimpleIcon /> Editar
                                </Button>
                            )}
                        </Card>
                    ))}
                    {materials.data.length === 0 && (
                        <Card className="grid justify-items-center gap-3 p-6 text-center">
                            <p>
                                {search
                                    ? 'Nenhum insumo encontrado para esta busca.'
                                    : 'Ainda não há insumos cadastrados.'}
                            </p>
                            {search && (
                                <Button asChild variant="outline">
                                    <Link href={index()}>Limpar busca</Link>
                                </Button>
                            )}
                        </Card>
                    )}
                </div>
                {materials.links.length > 3 && (
                    <Pagination
                        links={materials.links}
                        ariaLabel="Paginação de insumos"
                    />
                )}
            </div>
            {editing !== undefined && (
                <MaterialForm
                    material={editing}
                    types={types}
                    units={units}
                    onClose={closeForm}
                />
            )}
        </>
    );
}

MaterialsIndex.layout = { breadcrumbs: [{ title: 'Insumos', href: index() }] };
