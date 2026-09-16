import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    Check,
    CheckCircle2,
    Ellipsis,
    Pencil,
    RotateCcw,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    cancel,
    check,
    complete,
    reportDivergence,
    resolveDivergence,
    separate,
    undoCheck,
    undoSeparation,
} from '@/actions/App/Http/Controllers/OrderController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { edit, index } from '@/routes/orders';
import type { Order, OrderItem } from '@/types';

export default function ShowOrder({ order }: { order: Order }) {
    const cancelForm = useForm({ reason: '' });
    const completeForm = useForm({});
    const progressForm = useForm({ reason: '' });
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [divergenceItem, setDivergenceItem] = useState<OrderItem | null>(
        null,
    );
    const [divergenceAction, setDivergenceAction] = useState<
        'report' | 'resolve'
    >('report');
    const submitCancellation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        cancelForm.post(cancel.url(order.id));
    };
    const submitCompletion = () => {
        if (
            !readyForCompletion ||
            !window.confirm(
                `Finalizar ${order.code}? Os sacos serão marcados como consumidos.`,
            )
        ) {
            return;
        }

        completeForm.post(complete.url(order.id));
    };

    const updateItemProgress = (url: string) => {
        progressForm.post(url, { preserveScroll: true });
    };

    const openDivergenceDialog = (
        item: OrderItem,
        action: 'report' | 'resolve',
    ) => {
        setDivergenceItem(item);
        setDivergenceAction(action);
        progressForm.reset('reason');
    };

    const submitDivergence = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!divergenceItem) {
            return;
        }

        progressForm.post(
            (divergenceAction === 'report'
                ? reportDivergence
                : resolveDivergence
            ).url({ order: order.id, item: divergenceItem.id }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDivergenceItem(null);
                    progressForm.reset();
                },
            },
        );
    };

    const items = order.items ?? [];
    const progress = order.progress ?? {
        separated: 0,
        checked: 0,
        divergences: 0,
    };
    const completeErrors = completeForm.errors as Record<
        string,
        string | undefined
    >;
    const progressErrors = progressForm.errors as Record<
        string,
        string | undefined
    >;
    const readyForCompletion =
        items.length > 0 &&
        progress.separated === items.length &&
        progress.checked === items.length &&
        progress.divergences === 0;

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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 sm:h-9"
                                    aria-label="Mais ações do pedido"
                                    data-testid="menu-acoes-pedido"
                                >
                                    <Ellipsis />
                                    Mais ações
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-56"
                            >
                                <DropdownMenuLabel>
                                    Ações do pedido
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={edit(order.id)}
                                        data-testid="editar-pedido"
                                    >
                                        <Pencil />
                                        Editar pedido
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={
                                        !readyForCompletion ||
                                        completeForm.processing
                                    }
                                    data-testid="finalizar-pedido-menu"
                                    onSelect={submitCompletion}
                                >
                                    <CheckCircle2 />
                                    Finalizar pedido
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    data-testid="cancelar-pedido"
                                    onSelect={() => setCancelDialogOpen(true)}
                                >
                                    <Ban />
                                    Cancelar pedido
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                            peças · {progress.checked}/{order.items_count}{' '}
                            conferidos
                        </p>
                    </div>
                    {items.map((item) => {
                        const isSeparated = item.separated_at !== null;
                        const isChecked = item.checked_at !== null;
                        const hasOpenDivergence =
                            item.divergence_note !== null &&
                            item.divergence_resolved_at === null;

                        return (
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
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge
                                        variant={
                                            hasOpenDivergence
                                                ? 'destructive'
                                                : isChecked
                                                  ? 'outline'
                                                  : isSeparated
                                                    ? 'secondary'
                                                    : 'secondary'
                                        }
                                    >
                                        {hasOpenDivergence
                                            ? 'Divergência aberta'
                                            : isChecked
                                              ? 'Conferido'
                                              : isSeparated
                                                ? 'Separado'
                                                : 'Aguardando separação'}
                                    </Badge>
                                    {item.divergence_note && (
                                        <span className="text-destructive">
                                            {item.divergence_note}
                                        </span>
                                    )}
                                </div>
                                {item.sizes.some(
                                    ({ quantity }) => quantity !== null,
                                ) ? (
                                    <div className="grid gap-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Conteúdo por tamanho
                                        </p>
                                        <dl className="flex flex-wrap gap-2">
                                            {item.sizes.map(
                                                ({ size, quantity }) => (
                                                    <div
                                                        key={size}
                                                        className="grid min-w-16 justify-items-center gap-0.5 rounded-lg bg-muted px-3 py-2 tabular-nums"
                                                        aria-label={
                                                            quantity === null
                                                                ? `Tamanho ${size}, quantidade não informada`
                                                                : `Tamanho ${size}, ${quantity} ${quantity === 1 ? 'peça' : 'peças'}`
                                                        }
                                                    >
                                                        <dt className="text-base leading-5 font-semibold text-foreground">
                                                            {size}
                                                        </dt>
                                                        <dd className="text-xs leading-4 text-muted-foreground">
                                                            {quantity === null
                                                                ? 'Não informada'
                                                                : `${quantity} ${quantity === 1 ? 'pç' : 'pçs'}`}
                                                        </dd>
                                                    </div>
                                                ),
                                            )}
                                        </dl>
                                    </div>
                                ) : (
                                    <div className="grid gap-1 text-muted-foreground">
                                        <p className="text-sm">
                                            Tamanhos:{' '}
                                            {item.sizes
                                                .map(({ size }) => size)
                                                .join(' · ')}
                                        </p>
                                        <p className="text-xs">
                                            Quantidade por tamanho não
                                            informada.
                                        </p>
                                    </div>
                                )}
                                {order.status === 'pending' && (
                                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                                        {!isSeparated && (
                                            <Button
                                                size="sm"
                                                data-testid={`separar-saco-${item.id}`}
                                                onClick={() =>
                                                    updateItemProgress(
                                                        separate.url({
                                                            order: order.id,
                                                            item: item.id,
                                                        }),
                                                    )
                                                }
                                                disabled={
                                                    progressForm.processing
                                                }
                                            >
                                                <Check />
                                                Marcar como separado
                                            </Button>
                                        )}
                                        {isSeparated &&
                                            !isChecked &&
                                            !hasOpenDivergence && (
                                                <Button
                                                    size="sm"
                                                    data-testid={`conferir-saco-${item.id}`}
                                                    onClick={() =>
                                                        updateItemProgress(
                                                            check.url({
                                                                order: order.id,
                                                                item: item.id,
                                                            }),
                                                        )
                                                    }
                                                    disabled={
                                                        progressForm.processing
                                                    }
                                                >
                                                    <CheckCircle2 />
                                                    Conferir saco
                                                </Button>
                                            )}
                                        {isSeparated && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                data-testid={`desfazer-separacao-${item.id}`}
                                                onClick={() =>
                                                    updateItemProgress(
                                                        undoSeparation.url({
                                                            order: order.id,
                                                            item: item.id,
                                                        }),
                                                    )
                                                }
                                                disabled={
                                                    progressForm.processing
                                                }
                                            >
                                                <RotateCcw />
                                                Desfazer separação
                                            </Button>
                                        )}
                                        {isChecked && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                data-testid={`desfazer-conferencia-${item.id}`}
                                                onClick={() =>
                                                    updateItemProgress(
                                                        undoCheck.url({
                                                            order: order.id,
                                                            item: item.id,
                                                        }),
                                                    )
                                                }
                                                disabled={
                                                    progressForm.processing
                                                }
                                            >
                                                <RotateCcw />
                                                Desfazer conferência
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                openDivergenceDialog(
                                                    item,
                                                    'report',
                                                )
                                            }
                                            disabled={progressForm.processing}
                                        >
                                            <AlertTriangle />
                                            {hasOpenDivergence
                                                ? 'Atualizar divergência'
                                                : 'Registrar divergência'}
                                        </Button>
                                        {hasOpenDivergence && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    openDivergenceDialog(
                                                        item,
                                                        'resolve',
                                                    )
                                                }
                                                disabled={
                                                    progressForm.processing
                                                }
                                            >
                                                <Check />
                                                Resolver divergência
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </section>
                {order.status === 'pending' && (
                    <div
                        className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center"
                        data-testid="acoes-finalizacao"
                    >
                        <div className="grid gap-2 sm:mr-auto">
                            {!readyForCompletion && (
                                <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                                    Separe e confira todos os sacos e resolva as
                                    divergências antes de finalizar.
                                </p>
                            )}
                            <InputError message={completeErrors.order} />
                        </div>
                        <Button
                            data-testid="finalizar-pedido"
                            className="h-11 sm:w-fit"
                            onClick={submitCompletion}
                            disabled={
                                !readyForCompletion || completeForm.processing
                            }
                        >
                            <CheckCircle2 />
                            Finalizar pedido
                        </Button>
                        <Dialog
                            open={cancelDialogOpen}
                            onOpenChange={setCancelDialogOpen}
                        >
                            <DialogContent>
                                <form onSubmit={submitCancellation}>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Cancelar {order.code}?
                                        </DialogTitle>
                                        <DialogDescription>
                                            Os sacos serão liberados para novos
                                            pedidos. O histórico será
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
                                            message={cancelForm.errors.reason}
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
                    </div>
                )}
                {order.events && order.events.length > 0 && (
                    <section
                        className="grid gap-3"
                        aria-labelledby="order-events-title"
                        data-testid="historico-pedido"
                    >
                        <h2
                            id="order-events-title"
                            className="text-xl font-semibold"
                        >
                            Histórico do pedido
                        </h2>
                        <div className="grid gap-2">
                            {order.events.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border p-3 text-sm"
                                >
                                    <span>
                                        <strong>{event.event_label}</strong>
                                        {event.actor && ` · ${event.actor}`}
                                        {event.reason && ` — ${event.reason}`}
                                    </span>
                                    <time className="text-xs text-muted-foreground">
                                        {new Date(
                                            event.created_at,
                                        ).toLocaleString('pt-BR')}
                                    </time>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                <Dialog
                    open={divergenceItem !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDivergenceItem(null);
                        }
                    }}
                >
                    <DialogContent>
                        <form onSubmit={submitDivergence}>
                            <DialogHeader>
                                <DialogTitle>
                                    {divergenceAction === 'report'
                                        ? 'Registrar divergência'
                                        : 'Resolver divergência'}
                                </DialogTitle>
                                <DialogDescription>
                                    {divergenceAction === 'report'
                                        ? `Descreva o problema encontrado no ${divergenceItem?.volume_code ?? 'saco'}.`
                                        : 'Registre o que foi feito para resolver o apontamento.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-2 py-5">
                                <Label htmlFor="divergence-reason">
                                    {divergenceAction === 'report'
                                        ? 'Divergência'
                                        : 'Resolução'}
                                </Label>
                                <Textarea
                                    id="divergence-reason"
                                    value={progressForm.data.reason}
                                    onChange={(event) =>
                                        progressForm.setData(
                                            'reason',
                                            event.target.value,
                                        )
                                    }
                                    autoFocus
                                />
                                <InputError message={progressErrors.reason} />
                                <InputError
                                    message={progressErrors.order_item}
                                />
                                <InputError message={progressErrors.order} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Voltar
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={progressForm.processing}
                                >
                                    {divergenceAction === 'report'
                                        ? 'Registrar divergência'
                                        : 'Salvar resolução'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
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
