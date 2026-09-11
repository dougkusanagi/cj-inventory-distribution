import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { OrderForm } from '@/components/orders/order-form';
import { index, show } from '@/routes/orders';
import type { Order } from '@/types';

export default function EditOrder({ order }: { order: Order }) {
    return (
        <>
            <Head title={`Editar ${order.code}`} />
            <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="font-mono text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            {order.code}
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Editar pedido
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Os sacos reservados não são alterados nesta edição.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="h-11 sm:h-9">
                        <Link href={show(order.id)} data-testid="voltar-pedido">
                            Voltar para o pedido
                        </Link>
                    </Button>
                </header>
                <OrderForm order={order} cancelHref={show(order.id)} />
            </div>
        </>
    );
}

EditOrder.layout = ({ order }: { order: Order }) => ({
    breadcrumbs: [
        { title: 'Pedidos', href: index() },
        { title: order.code, href: show(order.id) },
        { title: 'Editar pedido', href: show(order.id) },
    ],
});
