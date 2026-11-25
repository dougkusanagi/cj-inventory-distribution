import { Head, Link, router } from '@inertiajs/react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { index, product } from '@/routes/technical-sheets';
import type { Paginated } from '@/types';
import type { ProductReference } from './data';

export default function TechnicalSheetsIndex({
    products,
    search,
}: {
    products: Pick<Paginated<ProductReference>, 'data' | 'links'>;
    search: string;
}) {
    const findProducts = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = new FormData(event.currentTarget).get('search');
        router.get(index.url(), {
            search: typeof query === 'string' ? query : '',
        });
    };

    return (
        <>
            <Head title="Fichas técnicas" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Fichas técnicas
                </h1>
                <form onSubmit={findProducts} className="flex gap-2">
                    <Input
                        type="search"
                        name="search"
                        key={search}
                        defaultValue={search}
                        placeholder="Nome, modelo ou código"
                        aria-label="Buscar produto"
                        className="h-11"
                    />
                    <Button type="submit" variant="secondary" className="h-11">
                        <MagnifyingGlassIcon /> Buscar
                    </Button>
                </form>
                <div className="grid gap-3">
                    {products.data.map((item) => (
                        <Card
                            key={item.id}
                            className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold break-words">
                                    {item.name}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {item.code}
                                    {item.model && ` · Mod. ${item.model}`}
                                </p>
                            </div>
                            <Button asChild variant="outline" className="h-11">
                                <Link
                                    href={product(item.id)}
                                    aria-label={`Fichas de ${item.name}`}
                                >
                                    Ver fichas
                                </Link>
                            </Button>
                        </Card>
                    ))}
                    {!products.data.length && (
                        <Card className="grid justify-items-center gap-3 p-6 text-center">
                            <p>
                                {search
                                    ? 'Nenhum produto encontrado para esta busca.'
                                    : 'Ainda não há produtos cadastrados.'}
                            </p>
                            {search && (
                                <Button asChild variant="outline">
                                    <Link href={index()}>Limpar busca</Link>
                                </Button>
                            )}
                        </Card>
                    )}
                </div>
                {products.links.length > 3 && (
                    <Pagination
                        links={products.links}
                        ariaLabel="Paginação de produtos"
                    />
                )}
            </div>
        </>
    );
}

TechnicalSheetsIndex.layout = {
    breadcrumbs: [{ title: 'Fichas técnicas', href: index() }],
};
