import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, CircleDot } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    RecountFields,
    recountTotal,
} from '@/components/products/recount-fields';
import type { RecountItem } from '@/components/products/recount-fields';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    index,
    update,
    confirm,
    cancel,
    refreshItem,
} from '@/routes/inventory';
import { show as movementShow } from '@/routes/stock-movements';

type StoredItem = {
    id: number | null;
    size: string;
    is_active: boolean;
    quantity: number | null;
};
type CountItem = {
    id: number;
    snapshot: {
        code: string;
        product: string;
        total_quantity: number;
        items: StoredItem[];
    };
    counted_items: StoredItem[] | null;
    counted_total: number | null;
    stock_movement_id: number | null;
};
type Inventory = {
    id: number;
    status: string;
    reason: string;
    version: number;
    items: CountItem[];
};

function CountEditor({
    inventory,
    item,
    onSaved,
    onCancel,
}: {
    inventory: Inventory;
    item: CountItem;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const form = useForm({
        version: inventory.version,
        items: (item.counted_items ?? item.snapshot.items).map(
            (size): RecountItem => ({
                ...size,
                quantity: size.quantity === null ? '' : String(size.quantity),
            }),
        ),
        total_quantity: String(
            item.counted_total ?? item.snapshot.total_quantity,
        ),
    });
    return (
        <form
            className="grid gap-4 border-t pt-4"
            onSubmit={(e) => {
                e.preventDefault();
                form.put(
                    update.url({ inventory: inventory.id, item: item.id }),
                    { preserveScroll: true, onSuccess: onSaved },
                );
            }}
        >
            <div className="grid gap-1">
                <h3 className="font-semibold">Conte o que está no saco</h3>
                <p className="text-sm text-muted-foreground">
                    Ajuste somente os tamanhos e quantidades que você encontrou.
                </p>
            </div>
            <RecountFields
                prefix={`count-${item.id}`}
                items={form.data.items}
                total={form.data.total_quantity}
                onItems={(items) => form.setData('items', items)}
                onTotal={(value) => form.setData('total_quantity', value)}
            />
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
                <span>Diferença encontrada</span>
                <strong className="tabular-nums">
                    {recountTotal(form.data.items, form.data.total_quantity) -
                        item.snapshot.total_quantity >
                    0
                        ? '+'
                        : ''}
                    {recountTotal(form.data.items, form.data.total_quantity) -
                        item.snapshot.total_quantity}{' '}
                    peças
                </strong>
            </div>
            <div role="alert">
                {Object.entries(form.errors).map(([field, message]) => (
                    <InputError key={field} message={message} />
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
                <Button disabled={form.processing} type="submit">
                    {form.processing ? 'Salvando...' : 'Salvar e continuar'}
                    {!form.processing && <ArrowRight />}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Voltar
                </Button>
            </div>
        </form>
    );
}

export default function InventoryShow({ inventory }: { inventory: Inventory }) {
    const firstPendingItem = inventory.items.find(
        (item) => item.counted_total === null,
    );
    const [editing, setEditing] = useState<number | null>(
        inventory.status === 'draft' ? (firstPendingItem?.id ?? null) : null,
    );
    const form = useForm({ version: inventory.version });
    const draft = inventory.status === 'draft';
    const counted = inventory.items.filter(
        (item) => item.counted_total !== null,
    );
    const difference = counted.reduce(
        (total, item) =>
            total + (item.counted_total ?? 0) - item.snapshot.total_quantity,
        0,
    );
    const progress = inventory.items.length
        ? Math.round((counted.length / inventory.items.length) * 100)
        : 0;
    const allCounted = counted.length === inventory.items.length;
    const submit = (operation: 'confirm' | 'cancel') => {
        if (
            !window.confirm(
                operation === 'confirm'
                    ? 'Confirmar o balanço e aplicar todas as diferenças ao estoque?'
                    : 'Cancelar este balanço? Nenhum saldo será alterado.',
            )
        )
            return;
        form.transform(() => ({ version: inventory.version }));
        form.post(
            operation === 'confirm'
                ? confirm.url(inventory.id)
                : cancel.url(inventory.id),
        );
    };
    return (
        <>
            <Head title={`Balanço #${inventory.id}`} />
            <div className="mx-auto grid max-w-4xl gap-5 px-4 py-6 sm:px-6">
                <header className="grid gap-2">
                    <Link
                        href={index()}
                        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Balanços
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {inventory.reason}
                        </h1>
                        <Badge variant={draft ? 'default' : 'outline'}>
                            {draft
                                ? 'Em andamento'
                                : inventory.status === 'confirmed'
                                  ? 'Confirmado'
                                  : 'Cancelado'}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Balanço #{inventory.id} · O saldo permanece igual até a
                        confirmação final.
                    </p>
                </header>
                <div className="grid gap-3 rounded-xl bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <strong>
                            {allCounted
                                ? 'Contagem concluída'
                                : `${counted.length} de ${inventory.items.length} sacos contados`}
                        </strong>
                        <span className="text-muted-foreground tabular-nums">
                            Diferença total: {difference > 0 ? '+' : ''}
                            {difference} peças
                        </span>
                    </div>
                    <div
                        className="h-2 overflow-hidden rounded-full bg-background"
                        role="progressbar"
                        aria-label="Progresso da contagem"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div role="alert">
                    {Object.entries(form.errors).map(([field, message]) => (
                        <InputError key={field} message={message} />
                    ))}
                </div>
                {inventory.items.map((item) => (
                    <section
                        key={item.id}
                        className={`grid gap-4 rounded-xl border p-4 sm:p-5 ${editing === item.id ? 'border-primary/50 bg-primary/5' : ''}`}
                        aria-label={item.snapshot.code}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">
                                    {item.snapshot.product}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {item.snapshot.code}
                                </p>
                            </div>
                            <Badge
                                variant={
                                    item.counted_total === null
                                        ? 'secondary'
                                        : 'outline'
                                }
                            >
                                {item.counted_total === null ? (
                                    <CircleDot />
                                ) : (
                                    <Check />
                                )}
                                {item.counted_total === null
                                    ? 'Aguardando'
                                    : 'Contado'}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <span>
                                Registrado: {item.snapshot.total_quantity}
                            </span>
                            <span>Contado: {item.counted_total ?? '—'}</span>
                            <span>
                                Diferença:{' '}
                                {item.counted_total === null
                                    ? '—'
                                    : item.counted_total -
                                      item.snapshot.total_quantity}
                            </span>
                        </div>
                        <StockSizeBreakdown
                            sizes={(
                                item.counted_items ?? item.snapshot.items
                            ).filter((size) => size.is_active)}
                        />
                        {draft && (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={
                                        item.counted_total === null
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setEditing(item.id)}
                                >
                                    {item.counted_total === null
                                        ? 'Contar agora'
                                        : 'Revisar contagem'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                'Atualizar a referência e descartar a contagem salva deste saco?',
                                            )
                                        )
                                            router.post(
                                                refreshItem.url({
                                                    inventory: inventory.id,
                                                    item: item.id,
                                                }),
                                                { version: inventory.version },
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () =>
                                                        setEditing(null),
                                                    onError: (errors) =>
                                                        form.setError(errors),
                                                },
                                            );
                                    }}
                                >
                                    Atualizar referência
                                </Button>
                            </div>
                        )}
                        {editing === item.id && draft && (
                            <CountEditor
                                key={`${item.id}-${inventory.version}`}
                                inventory={inventory}
                                item={item}
                                onCancel={() => setEditing(null)}
                                onSaved={() => {
                                    const next = inventory.items.find(
                                        (candidate) =>
                                            candidate.id !== item.id &&
                                            candidate.counted_total === null,
                                    );
                                    setEditing(next?.id ?? null);
                                }}
                            />
                        )}
                        {item.stock_movement_id && (
                            <Link
                                className="text-sm underline underline-offset-4"
                                href={movementShow(item.stock_movement_id)}
                            >
                                Ver ajuste #{item.stock_movement_id}
                            </Link>
                        )}
                    </section>
                ))}
                {draft && (
                    <div className="sticky bottom-3 z-20 grid gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {allCounted
                                ? 'Revise a diferença total e confirme para atualizar o estoque.'
                                : `Faltam ${inventory.items.length - counted.length} sacos para contar.`}
                        </p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                variant="ghost"
                                disabled={form.processing}
                                onClick={() => submit('cancel')}
                            >
                                Cancelar balanço
                            </Button>
                            <Button
                                disabled={
                                    form.processing ||
                                    !allCounted ||
                                    editing !== null
                                }
                                onClick={() => submit('confirm')}
                            >
                                {form.processing
                                    ? 'Confirmando...'
                                    : 'Confirmar balanço'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

InventoryShow.layout = {
    breadcrumbs: [{ title: 'Balanço de estoque', href: index() }],
};
