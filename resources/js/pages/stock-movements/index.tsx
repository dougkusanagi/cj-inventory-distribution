import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowUpFromLine,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { index, show } from '@/routes/stock-movements';
import { create as createEntry } from '@/routes/stock-entries';
import { create as createExit } from '@/routes/stock-exits';
import type {
    Paginated,
    StockMovementSource,
    StockMovementSummary,
    StockMovementSummaryCards,
    StockMovementType,
} from '@/types';

function movementIcon(type: StockMovementType) {
    return type === 'in'
        ? ArrowDownToLine
        : type === 'out'
          ? ArrowUpFromLine
          : ArrowLeftRight;
}

function dateLabel(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
}

export default function StockMovementsIndex({
    movements,
    filters,
    types,
    sources,
    products,
    actors,
    summary,
}: {
    movements: Paginated<StockMovementSummary>;
    filters: {
        type: string;
        source: string;
        search: string;
        from: string;
        to: string;
        actor: number | null;
        product: number | null;
        sort: 'oldest' | 'newest';
        has_filters: boolean;
    };
    types: Array<{ value: StockMovementType; label: string }>;
    sources: Array<{ value: StockMovementSource; label: string }>;
    products: Array<{ id: number; label: string }>;
    actors: Array<{ id: number; label: string }>;
    summary: StockMovementSummaryCards;
}) {
    const [type, setType] = useState(filters.type || 'all');
    const [source, setSource] = useState(filters.source || 'all');
    const [actor, setActor] = useState(
        filters.actor === null ? 'all' : String(filters.actor),
    );
    const [product, setProduct] = useState(
        filters.product === null ? 'all' : String(filters.product),
    );
    const [sort, setSort] = useState(filters.sort || 'newest');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(
        filters.from !== '' ||
            filters.to !== '' ||
            filters.actor !== null ||
            filters.product !== null ||
            filters.sort === 'oldest',
    );

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        router.get(
            index.url(),
            {
                type: type === 'all' ? '' : type,
                source: source === 'all' ? '' : source,
                actor: actor === 'all' ? '' : actor,
                product: product === 'all' ? '' : product,
                search: data.get('search') ?? '',
                from: data.get('from') ?? '',
                to: data.get('to') ?? '',
                sort,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Histórico de movimentações" />
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Estoque / histórico
                        </p>
                        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
                            <ArrowLeftRight className="size-7 text-primary" />
                            Histórico de movimentações
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            Consulte entradas, saídas e ajustes para entender o
                            que aconteceu com cada saco.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button asChild variant="outline">
                            <Link href={createExit()}>
                                <ArrowUpFromLine />
                                Registrar saída
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={createEntry()}>
                                <ArrowDownToLine />
                                Registrar entrada
                            </Link>
                        </Button>
                    </div>
                </header>

                <section
                    className="flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
                    aria-label="Resumo das movimentações"
                >
                    <Card className="min-w-[calc(100%-2.5rem)] snap-start gap-2 rounded-2xl p-4 sm:min-w-0">
                        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Lançamentos
                        </span>
                        <strong className="text-2xl">{summary.count}</strong>
                    </Card>
                    <Card className="min-w-[calc(100%-2.5rem)] snap-start gap-2 rounded-2xl p-4 sm:min-w-0">
                        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Entradas
                        </span>
                        <strong className="text-2xl text-emerald-600 dark:text-emerald-400">
                            {summary.entries}
                        </strong>
                    </Card>
                    <Card className="min-w-[calc(100%-2.5rem)] snap-start gap-2 rounded-2xl p-4 sm:min-w-0">
                        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Saídas
                        </span>
                        <strong className="text-2xl text-orange-600 dark:text-orange-400">
                            {summary.exits}
                        </strong>
                    </Card>
                </section>

                <form
                    onSubmit={submit}
                    className="grid gap-4 rounded-2xl border bg-card p-4"
                >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] md:items-end">
                        <div className="grid gap-1.5">
                            <Label htmlFor="movement-search">Buscar</Label>
                            <Input
                                id="movement-search"
                                name="search"
                                defaultValue={filters.search}
                                placeholder="Produto, saco, pedido ou motivo"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Tipo</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Todos os tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos os tipos
                                    </SelectItem>
                                    {types.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Origem</Label>
                            <Select value={source} onValueChange={setSource}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Todas as origens" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todas as origens
                                    </SelectItem>
                                    {sources.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" variant="secondary">
                            <Search />
                            Filtrar
                        </Button>
                    </div>
                    <div className="flex justify-end border-t pt-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                setShowAdvancedFilters((visible) => !visible)
                            }
                            aria-expanded={showAdvancedFilters}
                        >
                            <SlidersHorizontal />
                            {showAdvancedFilters
                                ? 'Ocultar filtros'
                                : 'Mais filtros'}
                        </Button>
                    </div>
                    {showAdvancedFilters && (
                        <div className="grid gap-3 border-t pt-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="grid gap-1.5">
                                <Label>Produto</Label>
                                <Select
                                    value={product}
                                    onValueChange={setProduct}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Produto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todos os produtos
                                        </SelectItem>
                                        {products.map((option) => (
                                            <SelectItem
                                                key={option.id}
                                                value={String(option.id)}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Responsável</Label>
                                <Select value={actor} onValueChange={setActor}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Responsável" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todos os responsáveis
                                        </SelectItem>
                                        {actors.map((option) => (
                                            <SelectItem
                                                key={option.id}
                                                value={String(option.id)}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                                Data inicial (dd/mm/aaaa)
                                <Input
                                    name="from"
                                    type="date"
                                    defaultValue={filters.from}
                                    aria-label="Data inicial, formato dia mês ano"
                                />
                            </label>
                            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                                Data final (dd/mm/aaaa)
                                <Input
                                    name="to"
                                    type="date"
                                    defaultValue={filters.to}
                                    aria-label="Data final, formato dia mês ano"
                                />
                            </label>
                            <div className="grid gap-1.5">
                                <Label>Ordenação</Label>
                                <Select
                                    value={sort}
                                    onValueChange={(value) =>
                                        setSort(value as 'oldest' | 'newest')
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Ordenação" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">
                                            Mais recentes
                                        </SelectItem>
                                        <SelectItem value="oldest">
                                            Mais antigas
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </form>

                <div className="grid gap-3">
                    {movements.data.map((movement) => {
                        const Icon = movementIcon(movement.type);

                        return (
                            <Link
                                key={movement.id}
                                href={show(movement.id)}
                                className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                <Card className="grid gap-4 rounded-2xl p-4 shadow-sm transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                    <div className="grid gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                                                <Icon className="size-4" />
                                            </span>
                                            <strong>
                                                #{movement.id} ·{' '}
                                                {movement.type_label}
                                            </strong>
                                            <Badge
                                                variant={
                                                    movement.type === 'in'
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                            >
                                                {movement.source_label}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {movement.items_count}{' '}
                                            {movement.items_count === 1
                                                ? 'saco'
                                                : 'sacos'}{' '}
                                            · {movement.total_quantity} peças
                                            {movement.order_code
                                                ? ` · ${movement.order_code}`
                                                : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {movement.actor ?? 'Automático'} ·{' '}
                                            {dateLabel(movement.occurred_at)}
                                        </p>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                    {movements.data.length === 0 && (
                        <Card className="p-8 text-center text-sm text-muted-foreground">
                            {filters.has_filters
                                ? 'Nenhuma movimentação corresponde aos filtros.'
                                : 'Nenhuma movimentação registrada.'}
                        </Card>
                    )}
                </div>

                <nav className="flex flex-wrap gap-2" aria-label="Paginação">
                    {movements.links.map(
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
        </>
    );
}

StockMovementsIndex.layout = {
    breadcrumbs: [{ title: 'Histórico de estoque', href: index() }],
};
