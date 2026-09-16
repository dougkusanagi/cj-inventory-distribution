import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpFromLine,
    RotateCcw,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { store as reverseMovement } from '@/actions/App/Http/Controllers/StockMovementReversalController';
import {
    StockMovementReasonField,
    stockReversalReasons,
} from '@/components/stock-movement-reason-field';
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

function quantityLabel(quantity: number | null): string {
    if (quantity === null) {
        return '—';
    }

    return `${quantity} ${quantity === 1 ? 'peça' : 'peças'}`;
}

function totalBefore(item: StockMovement['items'][number]): number | null {
    if (item.previous_state === null) {
        return 0;
    }

    return item.previous_state.total_quantity ?? null;
}

function totalAfter(item: StockMovement['items'][number]): number | null {
    if (item.resulting_state === null) {
        return item.total_quantity;
    }

    return item.resulting_state.total_quantity ?? null;
}

function quantityTone(before: number | null, after: number | null): string {
    if (before === null || after === null || before === after) {
        return 'text-foreground';
    }

    return after > before
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-destructive';
}

function snapshotQuantity(
    sizes: Map<string, number | null>,
    size: string,
): number | null {
    return sizes.has(size) ? (sizes.get(size) ?? null) : 0;
}

function sizeTransitions(item: StockMovement['items'][number]): Array<{
    size: string;
    before: number | null;
    after: number | null;
}> {
    const previousSizes = item.previous_state?.sizes ?? [];
    const resultingSizes = item.resulting_state?.sizes ?? item.sizes;
    const sizes = new Set([
        ...previousSizes.map((size) => size.size),
        ...resultingSizes.map((size) => size.size),
        ...item.sizes.map((size) => size.size),
    ]);

    const previousBySize = new Map(
        previousSizes.map((size) => [size.size, size.quantity]),
    );
    const resultingBySize = new Map(
        resultingSizes.map((size) => [size.size, size.quantity]),
    );

    return [...sizes].map((size) => ({
        size,
        before: snapshotQuantity(previousBySize, size),
        after: snapshotQuantity(resultingBySize, size),
    }));
}

export default function StockMovementShow({
    movement,
}: {
    movement: StockMovement;
}) {
    const [showReverse, setShowReverse] = useState(false);
    const form = useForm({ reason: '' });
    const Icon =
        movement.type === 'in'
            ? ArrowDownToLine
            : movement.type === 'out'
              ? ArrowUpFromLine
              : ArrowLeftRight;
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
                                                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                    <span>
                                                        Saco:{' '}
                                                        <span className="font-mono">
                                                            {item.volume_code}
                                                        </span>
                                                    </span>
                                                    <span>
                                                        Código do produto:{' '}
                                                        <span className="font-mono">
                                                            {item.product_code ??
                                                                'não informado'}
                                                        </span>
                                                    </span>
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
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-muted/50 p-3 tabular-nums">
                                            <div className="grid gap-0.5">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Total antes
                                                </span>
                                                <strong>
                                                    {quantityLabel(
                                                        totalBefore(item),
                                                    )}
                                                </strong>
                                            </div>
                                            <ArrowRight
                                                className="size-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <div className="grid justify-items-end gap-0.5 text-right">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Total depois
                                                </span>
                                                <strong
                                                    className={quantityTone(
                                                        totalBefore(item),
                                                        totalAfter(item),
                                                    )}
                                                >
                                                    {quantityLabel(
                                                        totalAfter(item),
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Conteúdo por tamanho
                                            </p>
                                            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                {sizeTransitions(item).map(
                                                    (size) => (
                                                        <div
                                                            key={size.size}
                                                            className="grid gap-1 rounded-xl bg-muted/50 p-3 tabular-nums"
                                                        >
                                                            <dt className="text-base leading-5 font-semibold text-foreground">
                                                                {size.size}
                                                            </dt>
                                                            <dd className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 text-xs">
                                                                <span className="text-muted-foreground">
                                                                    {quantityLabel(
                                                                        size.before,
                                                                    )}
                                                                </span>
                                                                <ArrowRight
                                                                    className="size-3 text-muted-foreground"
                                                                    aria-hidden="true"
                                                                />
                                                                <span
                                                                    className={`text-right font-semibold ${quantityTone(size.before, size.after)}`}
                                                                >
                                                                    {quantityLabel(
                                                                        size.after,
                                                                    )}
                                                                </span>
                                                            </dd>
                                                        </div>
                                                    ),
                                                )}
                                            </dl>
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
                                        <StockMovementReasonField
                                            id="reverse-reason"
                                            value={form.data.reason}
                                            options={stockReversalReasons}
                                            onChange={(reason) =>
                                                form.setData('reason', reason)
                                            }
                                            error={form.errors.reason}
                                        />
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
