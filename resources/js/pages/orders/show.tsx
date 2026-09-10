import { Head, Link, useForm } from '@inertiajs/react';
import { Ban, CheckCircle2, MessageCircle, Pencil } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    cancel,
    complete,
} from '@/actions/App/Http/Controllers/OrderController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { edit, index } from '@/routes/orders';
import type { Order } from '@/types';

export default function ShowOrder({ order }: { order: Order }) {
    const [whatsappOpened, setWhatsappOpened] = useState(false);
    const cancelForm = useForm({ reason: '' });
    const completeForm = useForm({ whatsapp_opened: false });
    const submitCancellation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        cancelForm.post(cancel.url(order.id));
    };
    const submitCompletion = () => {
        if (
            !whatsappOpened ||
            !window.confirm(
                `Finalizar ${order.code}? Os sacos serão marcados como consumidos.`,
            )
        ) {
            return;
        }

        completeForm.transform(() => ({ whatsapp_opened: whatsappOpened }));
        completeForm.post(complete.url(order.id));
    };

    return (
        <>
            <Head title={order.code} />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="font-mono text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            {order.code}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-semibold tracking-tight">
                                {order.store_name}
                            </h1>
                            <Badge
                                variant={
                                    order.status === 'pending'
                                        ? 'secondary'
                                        : order.status === 'canceled'
                                          ? 'destructive'
                                          : 'outline'
                                }
                            >
                                {order.status_label}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Solicitado por {order.requester_name} em{' '}
                            {new Date(order.submitted_at).toLocaleString(
                                'pt-BR',
                            )}
                        </p>
                    </div>
                    {order.status === 'pending' && (
                        <Button asChild variant="outline">
                            <Link href={edit(order.id)}>
                                <Pencil />
                                Editar dados
                            </Link>
                        </Button>
                    )}
                </header>
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader>
                        <CardTitle>Contato e observações</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <span className="text-muted-foreground">
                                WhatsApp
                            </span>
                            <p>{order.whatsapp || 'Não informado'}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Observações
                            </span>
                            <p className="whitespace-pre-wrap">
                                {order.notes || 'Nenhuma observação.'}
                            </p>
                        </div>
                        {order.cancellation_reason && (
                            <div className="sm:col-span-2">
                                <span className="text-muted-foreground">
                                    Motivo do cancelamento
                                </span>
                                <p>{order.cancellation_reason}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <section
                    className="grid gap-3"
                    aria-labelledby="order-items-title"
                >
                    <div>
                        <h2
                            id="order-items-title"
                            className="text-xl font-semibold"
                        >
                            Sacos do pedido
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {order.items_count} sacos · {order.total_quantity}{' '}
                            peças
                        </p>
                    </div>
                    {order.items?.map((item) => (
                        <Card
                            key={item.id}
                            className="grid gap-4 rounded-2xl p-4 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold">
                                        {item.product_name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {item.product_code}
                                        {item.product_model
                                            ? ` · Modelo ${item.product_model}`
                                            : ''}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <strong className="font-mono text-sm">
                                        {item.volume_code}
                                    </strong>
                                    <p className="text-sm text-muted-foreground">
                                        {item.total_quantity} peças
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {item.sizes.map((size) => (
                                    <span
                                        key={size.size}
                                        className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                                    >
                                        {size.size}
                                        {size.quantity !== null
                                            ? `: ${size.quantity}`
                                            : ''}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    ))}
                </section>
                {order.status === 'pending' && (
                    <div className="grid gap-5 border-t border-border pt-5">
                        <section
                            className="grid gap-3"
                            aria-labelledby="whatsapp-step-title"
                        >
                            <div className="grid gap-1">
                                <h2
                                    id="whatsapp-step-title"
                                    className="text-xl font-semibold"
                                >
                                    Envie o pedido pelo WhatsApp
                                </h2>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Abra a conversa com o pedido preenchido
                                    antes de finalizar. Abrir o link não
                                    confirma que a mensagem foi enviada.
                                </p>
                            </div>
                            {order.whatsapp_url ? (
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <Button asChild className="h-11 sm:w-fit">
                                        <a
                                            href={order.whatsapp_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            data-testid="abrir-whatsapp-pedido"
                                            onClick={() =>
                                                setWhatsappOpened(true)
                                            }
                                        >
                                            <MessageCircle />
                                            Abrir WhatsApp com o pedido
                                        </a>
                                    </Button>
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className="text-sm text-muted-foreground"
                                    >
                                        {whatsappOpened
                                            ? 'Conversa aberta neste navegador.'
                                            : 'Abra a conversa para liberar a finalização.'}
                                    </p>
                                </div>
                            ) : (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                                >
                                    O WhatsApp de atendimento não está
                                    configurado. Configure-o antes de finalizar
                                    este pedido.
                                </p>
                            )}
                        </section>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Ban />
                                        Cancelar pedido
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <form onSubmit={submitCancellation}>
                                        <DialogHeader>
                                            <DialogTitle>
                                                Cancelar {order.code}?
                                            </DialogTitle>
                                            <DialogDescription>
                                                Os sacos serão liberados para
                                                novos pedidos. O histórico será
                                                preservado.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-2 py-5">
                                            <Label htmlFor="cancel-reason">
                                                Motivo
                                            </Label>
                                            <Textarea
                                                id="cancel-reason"
                                                value={cancelForm.data.reason}
                                                onChange={(event) =>
                                                    cancelForm.setData(
                                                        'reason',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    cancelForm.errors.reason
                                                }
                                            />
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Voltar
                                                </Button>
                                            </DialogClose>
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                disabled={cancelForm.processing}
                                            >
                                                Confirmar cancelamento
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <InputError
                                message={completeForm.errors.whatsapp_opened}
                            />
                            <Button
                                data-testid="finalizar-pedido"
                                onClick={submitCompletion}
                                disabled={
                                    !whatsappOpened || completeForm.processing
                                }
                            >
                                <CheckCircle2 />
                                Finalizar pedido
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

ShowOrder.layout = {
    breadcrumbs: [
        { title: 'Pedidos', href: index() },
        { title: 'Detalhes', href: index() },
    ],
};
