import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { OrderCard } from '@/components/orders/order-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { create, index } from '@/routes/orders';
import type { Order, Paginated } from '@/types';

function paginationLabel(label: string): string {
    if (
        label === 'pagination.previous' ||
        label.includes('Previous') ||
        label.includes('laquo')
    ) {
        return 'Anterior';
    }

    if (
        label === 'pagination.next' ||
        label.includes('Next') ||
        label.includes('raquo')
    ) {
        return 'Próxima';
    }

    return label;
}

export default function OrdersIndex({
    orders,
    filters,
    statuses,
}: {
    orders: Paginated<Order>;
    filters: { search: string; status: string };
    statuses: Array<{ value: string; label: string }>;
}) {
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const search = data.get('search');
        const status = data.get('status');
        router.get(
            index.url(),
            {
                search: typeof search === 'string' ? search : '',
                status: typeof status === 'string' ? status : '',
            },
            { preserveState: true },
        );
    };

    return (
        <>
            <Head title="Pedidos" />
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Pedidos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Acompanhe os pedidos e atualize cada solicitação.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Novo pedido
                        </Link>
                    </Button>
                </header>
                <form
                    onSubmit={submit}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_auto]"
                >
                    <Input
                        name="search"
                        defaultValue={filters.search}
                        placeholder="Número, loja ou responsável"
                    />
                    <Select
                        name="status"
                        defaultValue={filters.status || 'all'}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            {statuses.map((status) => (
                                <SelectItem
                                    key={status.value}
                                    value={status.value}
                                >
                                    {status.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="submit" variant="secondary">
                        <Search />
                        Filtrar
                    </Button>
                    {(filters.search !== '' || filters.status !== '') && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                router.get(
                                    index.url(),
                                    { search: '', status: '' },
                                    { preserveState: true, replace: true },
                                )
                            }
                        >
                            <X />
                            Limpar filtros
                        </Button>
                    )}
                </form>
                <div className="grid gap-4">
                    {orders.data.map((order) => (
                        <OrderCard key={order.id} order={order} />
                    ))}
                    {orders.data.length === 0 && (
                        <Card className="p-8 text-center text-sm text-muted-foreground">
                            Nenhum pedido encontrado.
                        </Card>
                    )}
                </div>
                <nav className="flex flex-wrap gap-2" aria-label="Paginação">
                    {orders.links.map(
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
                                        {paginationLabel(link.label)}
                                    </Link>
                                </Button>
                            ),
                    )}
                </nav>
            </div>
        </>
    );
}

OrdersIndex.layout = { breadcrumbs: [{ title: 'Pedidos', href: index() }] };
