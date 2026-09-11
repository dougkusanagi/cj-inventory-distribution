import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { create, index, show } from '@/routes/orders';
import type { Order, Paginated } from '@/types';

function statusVariant(
    status: Order['status'],
): 'secondary' | 'outline' | 'destructive' {
    if (status === 'pending') return 'secondary';

    if (status === 'canceled') return 'destructive';

    return 'outline';
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
            <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Operação
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Pedidos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Acompanhe reservas e encerre as solicitações.
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
                </form>
                <div className="grid gap-3">
                    {orders.data.map((order) => (
                        <Card
                            key={order.id}
                            className="grid gap-4 rounded-2xl p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                        >
                            <div className="grid gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <strong className="font-mono">
                                        {order.code}
                                    </strong>
                                    <Badge
                                        variant={statusVariant(order.status)}
                                    >
                                        {order.status_label}
                                    </Badge>
                                </div>
                                <p className="font-semibold">
                                    {order.store_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {order.requester_name} · {order.items_count}{' '}
                                    {order.items_count === 1 ? 'saco' : 'sacos'}{' '}
                                    · {order.total_quantity} peças
                                </p>
                                {order.progress &&
                                    order.status === 'pending' && (
                                        <p className="text-xs text-muted-foreground">
                                            {order.progress.separated}/
                                            {order.items_count} separados ·{' '}
                                            {order.progress.checked}/
                                            {order.items_count} conferidos
                                            {order.progress.divergences > 0 &&
                                                ` · ${order.progress.divergences} divergência${order.progress.divergences === 1 ? '' : 's'}`}
                                        </p>
                                    )}
                                <time className="text-xs text-muted-foreground">
                                    {new Date(
                                        order.submitted_at,
                                    ).toLocaleString('pt-BR')}
                                </time>
                            </div>
                            <Button asChild variant="outline">
                                <Link href={show(order.id)}>
                                    <Eye />
                                    Ver pedido
                                </Link>
                            </Button>
                        </Card>
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

OrdersIndex.layout = { breadcrumbs: [{ title: 'Pedidos', href: index() }] };
