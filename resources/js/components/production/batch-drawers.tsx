import { useForm, usePage } from '@inertiajs/react';
import { ImagesIcon, XIcon } from '@phosphor-icons/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
    store,
    undo,
} from '@/actions/App/Http/Controllers/ProductionBatchController';
import InputError from '@/components/input-error';
import { keepFocusedInputVisible } from '@/components/production/scroll-focused-input';
import {
    SizeGridEditor,
    type SizeInput,
} from '@/components/production/size-grid-editor';
import {
    daysInStage,
    labels,
    pluralize,
    type Batch,
    type Event,
    type Product,
} from '@/components/production/types';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductPicker } from '@/components/production/product-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function DetailsDrawer({
    batch,
    onClose,
    footer,
}: {
    batch: Batch;
    onClose: () => void;
    /** Ações exibidas no rodapé, como a ação principal do lote. */
    footer?: ReactNode;
}) {
    const mobile = useIsMobile();
    const days = daysInStage(batch);
    return (
        <Drawer
            open
            direction={mobile ? 'bottom' : 'right'}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DrawerContent side={mobile ? 'bottom' : 'right'}>
                <DrawerHeader>
                    <p className="font-mono text-xs text-muted-foreground">
                        {batch.code}
                    </p>
                    <DrawerTitle className="break-words">
                        {batch.product_name}
                    </DrawerTitle>
                    <DrawerDescription>
                        {labels[batch.stage]}
                        {batch.stage !== 'completed' &&
                            (batch.awaiting_receipt
                                ? ' · a receber'
                                : ' · no setor')}
                    </DrawerDescription>
                </DrawerHeader>
                <DrawerClose asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 text-muted-foreground"
                        aria-label="Fechar detalhes do lote"
                    >
                        <XIcon weight="bold" />
                    </Button>
                </DrawerClose>
                <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-6 pb-6 text-sm">
                    <section aria-label="Resumo do lote" className="grid gap-2">
                        <p className="font-medium">Resumo do lote</p>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                            <div className="grid gap-0.5">
                                <dt>Peças</dt>
                                <dd className="font-semibold text-foreground tabular-nums">
                                    {pluralize(batch.quantity, 'peça', 'peças')}
                                </dd>
                            </div>
                            <div className="grid gap-0.5">
                                <dt>Nesta etapa</dt>
                                <dd
                                    className={cn(
                                        'font-semibold tabular-nums',
                                        batch.stalled
                                            ? 'text-highlight'
                                            : 'text-foreground',
                                    )}
                                >
                                    {pluralize(days, 'dia', 'dias')}
                                    {batch.stalled && ' · parado'}
                                </dd>
                            </div>
                            {batch.workshop && (
                                <div className="col-span-2 grid gap-0.5">
                                    <dt>Oficina</dt>
                                    <dd className="font-semibold break-words text-foreground">
                                        {batch.workshop}
                                    </dd>
                                </div>
                            )}
                            {batch.parent_code && (
                                <div className="col-span-2 grid gap-0.5">
                                    <dt>Lote de origem</dt>
                                    <dd className="font-mono font-semibold text-foreground">
                                        {batch.parent_code}
                                    </dd>
                                </div>
                            )}
                        </dl>
                        {batch.sizes.length > 0 && (
                            <StockSizeBreakdown sizes={batch.sizes} compact />
                        )}
                        {batch.notes && (
                            <p className="rounded-lg bg-muted px-3 py-2 text-xs break-words text-muted-foreground">
                                {batch.notes}
                            </p>
                        )}
                    </section>
                    <section className="grid gap-2">
                        <h3 className="font-medium">Histórico deste lote</h3>
                        <EventHistory events={batch.events} />
                    </section>
                    {batch.parent_code && (
                        <section className="grid gap-2">
                            <h3 className="font-medium">
                                Histórico do lote de origem ({batch.parent_code}
                                )
                            </h3>
                            <EventHistory events={batch.parent_events} />
                        </section>
                    )}
                </div>
                {footer && (
                    <DrawerFooter className="shrink-0 border-t bg-background pt-4">
                        {footer}
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}

function EventHistory({ events }: { events: Event[] }) {
    return (
        <ol className="grid gap-2">
            {events.map((event) => (
                <li
                    key={event.id}
                    className="grid gap-1 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground"
                >
                    <p className="text-sm font-semibold text-foreground">
                        {event.kind === 'sizes_updated'
                            ? 'Grade atualizada'
                            : event.kind === 'split'
                              ? 'Lote dividido entre oficinas'
                              : event.kind === 'split_child'
                                ? `Enviado para ${event.to}`
                                : event.from === event.to
                                  ? `Recebido em ${event.to}`
                                  : event.from
                                    ? `${event.from} → ${event.to}`
                                    : `Criado em ${event.to}`}
                    </p>
                    <p>
                        {event.actor} ·{' '}
                        {new Date(event.occurred_at).toLocaleString('pt-BR')}
                    </p>
                    {event.kind === 'sizes_updated' && (
                        <div className="grid gap-2 py-1">
                            <div className="grid gap-1">
                                <p>Antes</p>
                                <StockSizeBreakdown
                                    sizes={event.sizes_before ?? []}
                                    compact
                                />
                            </div>
                            <div className="grid gap-1">
                                <p>Depois</p>
                                <StockSizeBreakdown
                                    sizes={event.sizes_after ?? []}
                                    compact
                                />
                            </div>
                        </div>
                    )}
                    {event.workshop && <p>Oficina: {event.workshop}</p>}
                    {event.notes && (
                        <p className="break-words text-foreground">
                            {event.notes}
                        </p>
                    )}
                </li>
            ))}
        </ol>
    );
}

export function BatchDrawer({
    products,
    maxQuantity,
    onClose,
}: {
    products: Product[];
    maxQuantity: number;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const [choosingProduct, setChoosingProduct] = useState(false);
    const { errors } = usePage().props;
    const form = useForm({
        product_id: '',
        quantity: '',
        notes: '',
        sizes: [] as SizeInput[],
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(store.url(), { preserveScroll: true, onSuccess: onClose });
    }
    return (
        <>
            <Drawer
                open={!choosingProduct}
                direction={mobile ? 'bottom' : 'right'}
                onOpenChange={(open) => {
                    if (!open && !form.processing) onClose();
                }}
            >
                <DrawerContent side={mobile ? 'bottom' : 'right'}>
                    <DrawerHeader>
                        <DrawerTitle>Novo lote</DrawerTitle>
                        <DrawerDescription>
                            O lote começa na etapa de Planejamento.
                        </DrawerDescription>
                    </DrawerHeader>
                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div
                            className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-6 pb-6"
                            onFocusCapture={keepFocusedInputVisible}
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="batch-product">Produto</Label>
                                <Button
                                    id="batch-product"
                                    aria-haspopup="dialog"
                                    aria-invalid={Boolean(
                                        form.errors.product_id,
                                    )}
                                    type="button"
                                    variant="outline"
                                    className="h-auto min-h-11 justify-start text-left whitespace-normal"
                                    disabled={form.processing}
                                    onClick={() => setChoosingProduct(true)}
                                >
                                    <ImagesIcon />
                                    <span className="min-w-0 [overflow-wrap:anywhere]">
                                        {products.find(
                                            (product) =>
                                                String(product.id) ===
                                                form.data.product_id,
                                        )?.name ?? 'Escolher produto'}
                                    </span>
                                </Button>
                                <InputError message={form.errors.product_id} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="batch-quantity">
                                    Quantidade de peças
                                </Label>
                                <Input
                                    id="batch-quantity"
                                    type="number"
                                    min="1"
                                    max={maxQuantity}
                                    required
                                    value={form.data.quantity}
                                    onChange={(event) =>
                                        form.setData(
                                            'quantity',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.quantity} />
                            </div>
                            <SizeGridEditor
                                value={form.data.sizes}
                                onChange={(sizes) =>
                                    form.setData('sizes', sizes)
                                }
                                errors={errors}
                                disabled={form.processing}
                                maxQuantity={maxQuantity}
                            />
                            <div className="grid gap-2">
                                <Label htmlFor="batch-notes">Observações</Label>
                                <Input
                                    id="batch-notes"
                                    maxLength={2000}
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.notes} />
                            </div>
                        </div>
                        <DrawerFooter className="shrink-0 border-t bg-background pt-4">
                            <Button
                                type="submit"
                                className="h-11"
                                disabled={form.processing}
                            >
                                {form.processing
                                    ? 'Criando lote...'
                                    : 'Criar lote'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={onClose}
                                disabled={form.processing}
                            >
                                Cancelar
                            </Button>
                        </DrawerFooter>
                    </form>
                </DrawerContent>
            </Drawer>
            <ProductPicker
                open={choosingProduct}
                products={products}
                selectedId={form.data.product_id}
                onClose={() => setChoosingProduct(false)}
                onSelect={(product) => {
                    form.setData('product_id', String(product.id));
                    setChoosingProduct(false);
                }}
            />
        </>
    );
}

export function UndoDrawer({
    batch,
    onClose,
}: {
    batch: Batch;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const form = useForm({ reason: '', version: batch.version });
    const { errors } = usePage().props;
    return (
        <Drawer
            open
            direction={mobile ? 'bottom' : 'right'}
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <DrawerContent side={mobile ? 'bottom' : 'right'}>
                <DrawerHeader>
                    <DrawerTitle>Desfazer avanço de {batch.code}</DrawerTitle>
                    <DrawerDescription>
                        Informe o motivo da correção. O histórico será
                        preservado.
                    </DrawerDescription>
                </DrawerHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(undo.url(batch.id), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <div className="grid gap-2 px-6 pb-6">
                        <Label htmlFor="undo-reason">Motivo</Label>
                        <Input
                            id="undo-reason"
                            required
                            maxLength={2000}
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                        />
                        <InputError
                            message={form.errors.reason ?? errors.batch}
                        />
                    </div>
                    <DrawerFooter>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="h-11"
                        >
                            {form.processing
                                ? 'Salvando...'
                                : 'Desfazer avanço'}
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
