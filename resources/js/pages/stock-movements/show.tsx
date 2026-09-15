import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowDownToLine, ArrowUpFromLine, RotateCcw } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { store as reverseMovement } from '@/actions/App/Http/Controllers/StockMovementReversalController';
import InputError from '@/components/input-error';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { index, show } from '@/routes/stock-movements';
import { show as showOrder } from '@/routes/orders';
import { edit as editProduct } from '@/routes/products';
import type { StockMovement } from '@/types';

function dateLabel(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
}

function offerTypeLabel(value: string | null): string | null {
    return (
        {
            replenishment: 'Reposição',
            new_grade: 'Grade nova',
            broken_grade: 'Grade furada',
        }[value ?? ''] ?? null
    );
}

function stateLabel(
    state: StockMovement['items'][number]['previous_state'],
): string {
    if (state === null) {
        return 'Não se aplica';
    }

    if (state.consumed_at !== null) {
        return 'Consumido';
    }

    if (state.current_order_id !== null) {
        return `Reservado no pedido #${state.current_order_id}`;
    }

    return `Disponível · ${state.total_quantity} peças`;
}

export default function StockMovementShow({
    movement,
}: {
    movement: StockMovement;
}) {
    const [showReverse, setShowReverse] = useState(false);
    const form = useForm({ reason: '' });
    const Icon = movement.type === 'in' ? ArrowDownToLine : ArrowUpFromLine;
    const canReverse =
        movement.source === 'manual' && movement.reversal_id === null;

    const submitReverse = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (
            !window.confirm(
                'Registrar o estorno desta movimentação? O lançamento original será preservado.',
            )
        ) {
            return;
        }

        form.post(reverseMovement.url(movement.id), { preserveScroll: true });
    };

    return (
        <>
            <Head title={`Movimentação #${movement.id}`} />
            <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <Icon className="size-5" />
                        </span>
                        <div className="grid gap-1.5">
                            <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                Histórico de estoque
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                {movement.type_label} #{movement.id}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {movement.source_label} ·{' '}
                                {dateLabel(movement.occurred_at)} ·{' '}
                                {movement.actor ?? 'Sistema'}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="grid min-w-0 gap-5">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <div className="flex flex-wrap items-center gap-2">
                                    <CardTitle>Sacos movimentados</CardTitle>
                                    <Badge
                                        variant={
                                            movement.type === 'in'
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {movement.total_quantity} peças
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Os dados abaixo são snapshots gravados no
                                    momento da confirmação.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {movement.items.map((item) => (
                                    <article
                                        key={item.id}
                                        className="grid gap-3 rounded-2xl border p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                {item.product_available &&
                                                item.product_id ? (
                                                    <Link
                                                        className="font-semibold text-primary hover:underline"
                                                        href={editProduct(
                                                            item.product_id,
                                                        )}
                                                    >
                                                        {item.product_name ??
                                                            'Produto'}
                                                    </Link>
                                                ) : (
                                                    <h2 className="font-semibold">
                                                        {item.product_name ??
                                                            'Produto removido'}
                                                    </h2>
                                                )}
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {item.volume_code} ·{' '}
                                                    {item.product_code ??
                                                        'sem código'}{' '}
                                                    · {item.total_quantity}{' '}
                                                    peças
                                                </p>
                                            </div>
                                            {offerTypeLabel(
                                                item.offer_type,
                                            ) && (
                                                <Badge variant="outline">
                                                    {offerTypeLabel(
                                                        item.offer_type,
                                                    )}
                                                </Badge>
                                            )}
                                        </div>
                                        <StockSizeBreakdown
                                            sizes={item.sizes}
                                        />
                                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                                            <div className="rounded-xl bg-muted/50 p-3">
                                                <p className="mb-1 font-semibold uppercase">
                                                    Estado anterior
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {stateLabel(
                                                        item.previous_state,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-muted/50 p-3">
                                                <p className="mb-1 font-semibold uppercase">
                                                    Estado posterior
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {stateLabel(
                                                        item.resulting_state,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <aside className="grid content-start gap-5">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Resumo</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        Motivo
                                    </span>
                                    <strong className="text-right">
                                        {movement.reason ?? '—'}
                                    </strong>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        Sacos
                                    </span>
                                    <strong>{movement.items_count}</strong>
                                </div>
                                {movement.order && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Pedido
                                        </span>
                                        {movement.order.available ? (
                                            <Link
                                                className="font-semibold text-primary hover:underline"
                                                href={showOrder(
                                                    movement.order.id,
                                                )}
                                            >
                                                {movement.order.code}
                                            </Link>
                                        ) : (
                                            <strong>
                                                {movement.order.code}
                                            </strong>
                                        )}
                                    </div>
                                )}
                                {movement.reversal_of_id && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Estorno de
                                        </span>
                                        <Link
                                            className="font-semibold text-primary hover:underline"
                                            href={show(movement.reversal_of_id)}
                                        >
                                            #{movement.reversal_of_id}
                                        </Link>
                                    </div>
                                )}
                                {movement.reversal_id && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-muted-foreground">
                                            Estornado por
                                        </span>
                                        <Link
                                            className="font-semibold text-primary hover:underline"
                                            href={show(movement.reversal_id)}
                                        >
                                            #{movement.reversal_id}
                                        </Link>
                                    </div>
                                )}
                                {movement.notes && (
                                    <div className="border-t pt-3">
                                        <p className="mb-1 text-muted-foreground">
                                            Observações
                                        </p>
                                        <p>{movement.notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {canReverse && !showReverse && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowReverse(true)}
                            >
                                <RotateCcw />
                                Preparar estorno
                            </Button>
                        )}
                        {canReverse && showReverse && (
                            <Card className="rounded-2xl border-orange-500/30">
                                <CardHeader>
                                    <CardTitle>Estornar movimentação</CardTitle>
                                    <CardDescription>
                                        O estorno cria um novo lançamento e só é
                                        aceito se não houver operação posterior
                                        incompatível.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={submitReverse}
                                        className="grid gap-3"
                                    >
                                        <div className="grid gap-2">
                                            <Label htmlFor="reverse-reason">
                                                Motivo{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Textarea
                                                id="reverse-reason"
                                                value={form.data.reason}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'reason',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={form.errors.reason}
                                            />
                                        </div>
                                        <Alert variant="destructive">
                                            <RotateCcw />
                                            <AlertTitle>Atenção</AlertTitle>
                                            <AlertDescription>
                                                O lançamento original não será
                                                apagado.
                                            </AlertDescription>
                                        </Alert>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setShowReverse(false)
                                                }
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={form.processing}
                                            >
                                                Confirmar estorno
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

StockMovementShow.layout = {
    breadcrumbs: [
        { title: 'Movimentações', href: index() },
        { title: 'Detalhes', href: index() },
    ],
};
