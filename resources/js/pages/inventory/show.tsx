import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    RecountFields,
    recountTotal,
} from '@/components/products/recount-fields';
import type { RecountItem } from '@/components/products/recount-fields';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
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
    onClose,
}: {
    inventory: Inventory;
    item: CountItem;
    onClose: () => void;
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
                    { preserveScroll: true, onSuccess: onClose },
                );
            }}
        >
            <RecountFields
                prefix={`count-${item.id}`}
                items={form.data.items}
                total={form.data.total_quantity}
                onItems={(items) => form.setData('items', items)}
                onTotal={(value) => form.setData('total_quantity', value)}
            />
            <p className="font-medium">
                Diferença:{' '}
                {recountTotal(form.data.items, form.data.total_quantity) -
                    item.snapshot.total_quantity}{' '}
                peças
            </p>
            <div role="alert">
                {Object.entries(form.errors).map(([field, message]) => (
                    <InputError key={field} message={message} />
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
                <Button disabled={form.processing} type="submit">
                    Salvar contagem
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                    Fechar
                </Button>
            </div>
        </form>
    );
}

export default function InventoryShow({ inventory }: { inventory: Inventory }) {
    const [editing, setEditing] = useState<number | null>(null);
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
            <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6">
                <header className="grid gap-2">
                    <Link
                        href={index()}
                        className="text-sm underline underline-offset-4"
                    >
                        Voltar aos balanços
                    </Link>
                    <h1 className="text-2xl font-semibold">
                        Balanço #{inventory.id}
                    </h1>
                    <p>{inventory.reason}</p>
                    <p className="text-sm text-muted-foreground">
                        {draft
                            ? 'Em contagem — saldo ainda não alterado'
                            : inventory.status === 'confirmed'
                              ? 'Confirmado — ajustes registrados'
                              : 'Cancelado — saldo preservado'}
                    </p>
                </header>
                <div className="flex flex-wrap justify-between gap-3 rounded-xl bg-muted p-4">
                    <span>
                        {counted.length} de {inventory.items.length} sacos
                        contados
                    </span>
                    <strong>
                        Diferença total: {difference > 0 ? '+' : ''}
                        {difference} peças
                    </strong>
                </div>
                <div role="alert">
                    {Object.entries(form.errors).map(([field, message]) => (
                        <InputError key={field} message={message} />
                    ))}
                </div>
                {inventory.items.map((item) => (
                    <section
                        key={item.id}
                        className="grid gap-4 rounded-xl border p-4 sm:p-5"
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
                            <span className="text-sm">
                                {item.counted_total === null
                                    ? 'Aguardando contagem'
                                    : 'Contagem salva'}
                            </span>
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
                                    variant="outline"
                                    onClick={() => setEditing(item.id)}
                                >
                                    Contar {item.snapshot.code}
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
                                onClose={() => setEditing(null)}
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
                    <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                        <Button
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => submit('cancel')}
                        >
                            Cancelar balanço
                        </Button>
                        <Button
                            disabled={
                                form.processing ||
                                counted.length !== inventory.items.length ||
                                editing !== null
                            }
                            onClick={() => submit('confirm')}
                        >
                            {form.processing
                                ? 'Confirmando...'
                                : 'Confirmar balanço'}
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

InventoryShow.layout = {
    breadcrumbs: [{ title: 'Balanço de estoque', href: index() }],
};
