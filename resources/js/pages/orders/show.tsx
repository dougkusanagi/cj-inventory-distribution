import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    Check,
    CheckCircle2,
    ClipboardCheck,
    Ellipsis,
    History,
    Pencil,
    RotateCcw,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
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
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CompactTabs } from '@/components/ui/compact-tabs';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { edit, index } from '@/routes/orders';
import type { Order, OrderItem } from '@/types';

type OrderTab = 'details' | 'history';

const orderTabs = [
    { id: 'details', label: 'Pedido', icon: ClipboardCheck },
    { id: 'history', label: 'Histórico', icon: History },
] as const;

export default function ShowOrder({ order }: { order: Order }) {
    const cancelForm = useForm({ reason: '' });
    const completeForm = useForm({});
    const progressForm = useForm({ reason: '' });
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [divergenceItem, setDivergenceItem] = useState<OrderItem | null>(
        null,
    );
    const [divergenceAction, setDivergenceAction] = useState<
        'report' | 'resolve'
    >('report');
    const [activeTab, setActiveTab] = useState<OrderTab>('details');

    useEffect(() => {
        if (order.status !== 'pending') {
            setActiveTab('details');
        }
    }, [order.status]);

    const submitCancellation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        cancelForm.post(cancel.url(order.id));
    };
    const confirmCompletion = () => {
        completeForm.post(complete.url(order.id));
        setCompleteDialogOpen(false);
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
    const completionHint =
        progress.separated < items.length
            ? `Separe ${items.length - progress.separated} saco${items.length - progress.separated === 1 ? '' : 's'} pendente${items.length - progress.separated === 1 ? '' : 's'}.`
            : progress.checked < items.length
              ? `Confira ${items.length - progress.checked} saco${items.length - progress.checked === 1 ? '' : 's'} após a separação.`
              : progress.divergences > 0
                ? `Resolva ${progress.divergences} divergência${progress.divergences === 1 ? '' : 's'} antes de finalizar.`
                : null;
    const statusVariant =
        order.status === 'pending'
            ? 'secondary'
            : order.status === 'canceled'
              ? 'destructive'
              : 'outline';

    return (
        <>
            <Head title={order.code} />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="font-mono text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Detalhes do pedido
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-semibold tracking-tight">
                                {order.store_name}
                            </h1>
                            <Badge variant={statusVariant}>
                                {order.status_label}
                            </Badge>
                        </div>
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
                <section
                    aria-labelledby="order-information-title"
                    className="grid gap-4 border-y border-border/80 py-5"
                >
                    <div className="grid gap-1">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Identificação e contato
                        </p>
                        <h2
                            id="order-information-title"
                            className="text-lg font-semibold"
                        >
                            Informações do pedido
                        </h2>
                    </div>
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Número do pedido
                            </dt>
                            <dd className="font-mono text-sm">{order.code}</dd>
                        </div>
                        <div className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Status
                            </dt>
                            <dd>
                                <Badge variant={statusVariant}>
                                    {order.status_label}
                                </Badge>
                            </dd>
                        </div>
                        <div className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Loja
                            </dt>
                            <dd className="text-sm">{order.store_name}</dd>
                        </div>
                        <div className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Solicitado por
                            </dt>
                            <dd className="text-sm">{order.requester_name}</dd>
                        </div>
                        <div className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Data do pedido
                            </dt>
                            <dd className="text-sm tabular-nums">
                                {new Date(order.submitted_at).toLocaleString(
                                    'pt-BR',
                                )}
                            </dd>
                        </div>
                        <div className="grid gap-1">
                            <dt className="text-xs font-medium text-muted-foreground">
                                WhatsApp
                            </dt>
                            <dd className="text-sm">
                                {order.whatsapp || 'Não informado'}
                            </dd>
                        </div>
                        <div className="grid gap-1 lg:col-span-2">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Conteúdo do pedido
                            </dt>
                            <dd className="text-sm">
                                {order.items_count}{' '}
                                {order.items_count === 1 ? 'saco' : 'sacos'} ·{' '}
                                {order.total_quantity}{' '}
                                {order.total_quantity === 1 ? 'peça' : 'peças'}
                            </dd>
                        </div>
                        <div className="grid gap-1 sm:col-span-2 lg:col-span-4">
                            <dt className="text-xs font-medium text-muted-foreground">
                                Observações
                            </dt>
                            <dd className="text-sm whitespace-pre-wrap">
                                {order.notes || 'Nenhuma observação.'}
                            </dd>
                        </div>
                        {order.cancellation_reason && (
                            <div className="grid gap-1 sm:col-span-2 lg:col-span-4">
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Motivo do cancelamento
                                </dt>
                                <dd className="text-sm">
                                    {order.cancellation_reason}
                                </dd>
                            </div>
                        )}
                    </dl>
                </section>
                <CompactTabs
                    tabs={orderTabs}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    idPrefix="order-tab"
                    panelIdPrefix="order-panel"
                />
                <section
                    id="order-panel-details"
                    role="tabpanel"
                    aria-labelledby="order-tab-details"
                    hidden={activeTab !== 'details'}
                    className={
                        activeTab === 'details' ? 'grid gap-6' : 'hidden'
                    }
                >
                    <section
                        className="grid gap-3"
                        aria-labelledby="order-items-title"
                        data-testid="conferencia-pedido"
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="grid gap-2">
                                <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                    Operação do estoque
                                </p>
                                <h2
                                    id="order-items-title"
                                    className="text-xl font-semibold"
                                >
                                    Separação e conferência
                                </h2>
                                <p className="max-w-2xl text-sm text-muted-foreground">
                                    Separe cada saco, confira o conteúdo e
                                    registre qualquer divergência antes de
                                    finalizar.
                                </p>
                            </div>
                            <div className="flex items-baseline gap-2 self-start rounded-xl border border-border bg-card px-3 py-2 text-sm sm:self-auto">
                                <strong className="font-mono text-lg">
                                    {progress.checked}/{order.items_count}
                                </strong>
                                <span className="text-muted-foreground">
                                    conferidos
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {order.items_count} sacos · {order.total_quantity}{' '}
                            peças no pedido
                        </p>
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
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.product_name}
                                                        loading="lazy"
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
                                                        Sem foto
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
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
                                    <StockSizeBreakdown sizes={item.sizes} />
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
                                                disabled={
                                                    progressForm.processing
                                                }
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
                            className="sticky bottom-3 z-20 grid gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between"
                            data-testid="acoes-finalizacao"
                        >
                            <div className="grid gap-2 sm:mr-auto">
                                {!readyForCompletion && (
                                    <div className="grid gap-1 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                                        <p>
                                            Separe e confira todos os sacos e
                                            resolva as divergências antes de
                                            finalizar.
                                        </p>
                                        {completionHint && (
                                            <p className="font-medium text-foreground">
                                                Próxima ação: {completionHint}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <InputError message={completeErrors.order} />
                            </div>
                            <Dialog
                                open={completeDialogOpen}
                                onOpenChange={setCompleteDialogOpen}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        data-testid="finalizar-pedido"
                                        className="h-11 w-full sm:w-fit"
                                        disabled={
                                            !readyForCompletion ||
                                            completeForm.processing
                                        }
                                    >
                                        <CheckCircle2 />
                                        Finalizar pedido
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Finalizar pedido?
                                        </DialogTitle>
                                        <DialogDescription>
                                            Os sacos deste pedido serão marcados
                                            como consumidos e sairão do estoque.
                                            Essa ação libera o pedido para
                                            expedição.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">
                                                Voltar
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            onClick={confirmCompletion}
                                            disabled={completeForm.processing}
                                        >
                                            <CheckCircle2 />
                                            Confirmar finalização
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
                        </div>
                    )}
                </section>
                <section
                    id="order-panel-history"
                    role="tabpanel"
                    aria-labelledby="order-tab-history"
                    hidden={activeTab !== 'history'}
                    className={
                        activeTab === 'history' ? 'grid gap-6' : 'hidden'
                    }
                >
                    <section
                        className="grid gap-3"
                        aria-labelledby="order-events-title"
                        data-testid="historico-pedido"
                    >
                        <div className="grid gap-2">
                            <h2
                                id="order-events-title"
                                className="text-xl font-semibold"
                            >
                                Histórico do pedido
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Acompanhe as alterações e decisões registradas
                                neste pedido.
                            </p>
                        </div>
                        {order.events && order.events.length > 0 ? (
                            <div className="grid gap-2">
                                {order.events.map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border p-3 text-sm"
                                    >
                                        <span>
                                            <strong>{event.event_label}</strong>
                                            {event.actor && ` · ${event.actor}`}
                                            {event.reason &&
                                                ` — ${event.reason}`}
                                        </span>
                                        <time className="text-xs text-muted-foreground">
                                            {new Date(
                                                event.created_at,
                                            ).toLocaleString('pt-BR')}
                                        </time>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                                Nenhum evento registrado ainda.
                            </div>
                        )}
                    </section>
                </section>
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
