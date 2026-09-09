import { Head } from '@inertiajs/react';
import { OrderForm } from '@/components/orders/order-form';
import { index } from '@/routes/orders';
import type { Order } from '@/types';

export default function EditOrder({ order }: { order: Order }) {
    return (
        <>
            <Head title={`Editar ${order.code}`} />
            <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="grid gap-2">
                    <p className="font-mono text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                        {order.code}
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Editar pedido
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Os sacos reservados não são alterados nesta edição.
                    </p>
                </header>
                <OrderForm order={order} />
            </div>
        </>
    );
}

EditOrder.layout = {
    breadcrumbs: [
        { title: 'Pedidos', href: index() },
        { title: 'Editar', href: index() },
    ],
};
