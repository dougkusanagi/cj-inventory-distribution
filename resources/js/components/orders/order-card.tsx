import { Link } from '@inertiajs/react';
import { CalendarDays, Eye, Shirt, User } from 'lucide-react';
import { PaperBag } from '@/components/icons/paper-bag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { show } from '@/routes/orders';
import type { Order } from '@/types';
import { OrderStatusTimeline } from './order-status-timeline';

const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

function statusVariant(
    status: Order['status'],
): 'secondary' | 'outline' | 'destructive' {
    if (status === 'pending') {
        return 'secondary';
    }

    if (status === 'canceled') {
        return 'destructive';
    }

    return 'outline';
}

export function OrderCard({ order }: { order: Order }) {
    const progress = order.progress ?? {
        separated: 0,
        checked: 0,
        divergences: 0,
    };
    const submittedAt = new Date(order.submitted_at);

    return (
        <Card
            data-testid={`pedido-${order.id}`}
            className="rounded-2xl p-4 shadow-sm sm:p-5"
        >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <strong className="font-mono text-xs tracking-wide">
                            {order.code}
                        </strong>
                        <Badge variant={statusVariant(order.status)}>
                            {order.status_label}
                        </Badge>
                    </div>
                    <p className="truncate text-lg font-semibold tracking-tight">
                        {order.store_name}
                    </p>
                    <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                        <div className="flex min-w-0 items-center">
                            <dt className="sr-only">Responsável</dt>
                            <dd className="flex min-w-0 items-center gap-1.5">
                                <User
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {order.requester_name}
                                </span>
                            </dd>
                        </div>
                        <div className="flex items-center">
                            <dt className="sr-only">Sacos</dt>
                            <dd className="flex items-center gap-1.5 tabular-nums">
                                <PaperBag
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {order.items_count}{' '}
                                {order.items_count === 1 ? 'saco' : 'sacos'}
                            </dd>
                        </div>
                        <div className="flex items-center">
                            <dt className="sr-only">Peças</dt>
                            <dd className="flex items-center gap-1.5 tabular-nums">
                                <Shirt
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {order.total_quantity}{' '}
                                {order.total_quantity === 1 ? 'peça' : 'peças'}
                            </dd>
                        </div>
                        <div className="flex items-center">
                            <dt className="sr-only">Enviado em</dt>
                            <dd className="flex items-center gap-1.5">
                                <CalendarDays
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <time
                                    dateTime={order.submitted_at}
                                    className="hidden tabular-nums sm:inline"
                                >
                                    {fullDateFormatter.format(submittedAt)}
                                </time>
                                <time
                                    dateTime={order.submitted_at}
                                    className="tabular-nums sm:hidden"
                                >
                                    {shortDateFormatter.format(submittedAt)}
                                </time>
                            </dd>
                        </div>
                    </dl>
                    {order.status === 'pending' && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {progress.separated}/{order.items_count} separados ·{' '}
                            {progress.checked}/{order.items_count} conferidos
                            {progress.divergences > 0 &&
                                ` · ${progress.divergences} divergência${progress.divergences === 1 ? '' : 's'}`}
                        </p>
                    )}
                </div>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href={show(order.id)}>
                        <Eye />
                        Ver pedido
                    </Link>
                </Button>
            </div>
            <OrderStatusTimeline
                status={order.status}
                separated={progress.separated}
                checked={progress.checked}
                itemsCount={order.items_count}
                className="mt-4 border-t border-border pt-4"
            />
        </Card>
    );
}
