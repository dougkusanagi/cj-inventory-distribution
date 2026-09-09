import { Head } from '@inertiajs/react';
import { OrderForm } from '@/components/orders/order-form';
import { index } from '@/routes/orders';
import type { AvailableOrderVolume } from '@/types';

export default function CreateOrder({
    availableVolumes,
}: {
    availableVolumes: AvailableOrderVolume[];
}) {
    return (
        <>
            <Head title="Novo pedido" />
            <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="grid gap-2">
                    <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                        Pedidos
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Novo pedido
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Selecione sacos inteiros disponíveis e identifique a
                        solicitação.
                    </p>
                </header>
                <OrderForm availableVolumes={availableVolumes} />
            </div>
        </>
    );
}

CreateOrder.layout = {
    breadcrumbs: [
        { title: 'Pedidos', href: index() },
        { title: 'Novo pedido', href: index() },
    ],
};
