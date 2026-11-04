import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowRightIcon,
    DotsThreeIcon,
    PlusCircleIcon,
} from '@phosphor-icons/react';
import { Fragment, useState, type FormEvent } from 'react';
import {
    advance,
    destroy,
    index,
    receive,
    store,
    undo,
} from '@/actions/App/Http/Controllers/ProductionBatchController';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import {
    AdvanceWorkshopDrawer,
    ManageWorkshopsDrawer,
    type Workshop,
} from '@/components/production/workshop-drawer';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

type Stage = {
    value: string;
    label: string;
    batches: number;
    pieces: number;
    awaiting_batches: number;
    awaiting_pieces: number;
};
type Event = {
    id: number;
    from: string | null;
    to: string;
    actor: string;
    notes: string | null;
    workshop: string | null;
    kind: string | null;
    occurred_at: string;
};
type Batch = {
    id: number;
    code: string;
    product_id: number;
    product_name: string;
    quantity: number;
    stage: string;
    version: number;
    stage_entered_at: string;
    workshop: string | null;
    parent_code: string | null;
    parent_events: Event[];
    awaiting_receipt: boolean;
    notes: string | null;
    can_delete: boolean;
    can_undo: boolean;
    events: Event[];
};
type Product = { id: number; name: string; code: string; model: string | null };
type Props = {
    stages: Stage[];
    batches: Batch[];
    products: Product[];
    filterProducts: { id: number; name: string }[];
    filters: { product: number | null; stage: string | null };
    canCreate: boolean;
    maxQuantity: number;
    isAdmin: boolean;
    workshops: Workshop[];
};
const sequence = [
    'cutting',
    'sewing',
    'washing',
    'dyeing',
    'finishing',
    'bagging',
    'completed',
];
const labels: Record<string, string> = {
    cutting: 'Corte',
    sewing: 'Costura',
    washing: 'Lavagem',
    dyeing: 'Tinturaria',
    finishing: 'Acabamento',
    bagging: 'Ensacamento',
    completed: 'Concluído',
};

function BatchDrawer({
    products,
    maxQuantity,
    onClose,
}: {
    products: Product[];
    maxQuantity: number;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const form = useForm({ product_id: '', quantity: '', notes: '' });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(store.url(), { preserveScroll: true, onSuccess: onClose });
    }
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
                    <DrawerTitle>Novo lote</DrawerTitle>
                    <DrawerDescription>
                        O lote começa na etapa de Corte.
                    </DrawerDescription>
                </DrawerHeader>
                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid gap-4 overflow-y-auto px-6 pb-6">
                        <div className="grid gap-2">
                            <Label htmlFor="batch-product">Produto</Label>
                            <SearchableSelect
                                id="batch-product"
                                label="Produto"
                                value={form.data.product_id}
                                options={products.map((p) => ({
                                    value: String(p.id),
                                    label: `${p.name} — ${p.code}${p.model ? ` — ${p.model}` : ''}`,
                                }))}
                                onValueChange={(value) =>
                                    form.setData('product_id', value)
                                }
                            />
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
                                    form.setData('quantity', event.target.value)
                                }
                            />
                            <InputError message={form.errors.quantity} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="batch-notes">Observações</Label>
                            <Input
                                id="batch-notes"
                                maxLength={2000}
                                value={form.data.notes}
                                onChange={(event) =>
                                    form.setData('notes', event.target.value)
                                }
                            />
                            <InputError message={form.errors.notes} />
                        </div>
                    </div>
                    <DrawerFooter>
                        <Button
                            type="submit"
                            className="h-11"
                            disabled={form.processing}
                        >
                            {form.processing ? 'Criando lote...' : 'Criar lote'}
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
    );
}

function DetailsDrawer({
    batch,
    onClose,
}: {
    batch: Batch;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
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
                    <DrawerTitle>
                        {batch.code} — {batch.product_name}
                    </DrawerTitle>
                    <DrawerDescription>
                        {batch.quantity}{' '}
                        {batch.quantity === 1 ? 'peça' : 'peças'} ·{' '}
                        {labels[batch.stage]}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="grid gap-4 overflow-y-auto px-6 pb-6">
                    {batch.notes && (
                        <p className="text-sm break-words">{batch.notes}</p>
                    )}
                    {batch.parent_code && (
                        <>
                            <h3 className="font-semibold">
                                Lote de origem: {batch.parent_code}
                            </h3>
                            <EventHistory events={batch.parent_events} />
                        </>
                    )}
                    <h3 className="font-semibold">Histórico deste lote</h3>
                    <EventHistory events={batch.events} />
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function EventHistory({ events }: { events: Event[] }) {
    return (
        <>
            {events.map((event) => (
                <div key={event.id} className="border-b pb-3 text-sm">
                    <p className="font-medium">
                        {event.kind === 'split'
                            ? 'Lote dividido entre oficinas'
                            : event.kind === 'split_child'
                              ? `Enviado para ${event.to}`
                              : event.from === event.to
                                ? `Recebido em ${event.to}`
                                : event.from
                                  ? `${event.from} → ${event.to}`
                                  : `Criado em ${event.to}`}
                    </p>
                    <p className="text-muted-foreground">
                        {event.actor} ·{' '}
                        {new Date(event.occurred_at).toLocaleString('pt-BR')}
                    </p>
                    {event.workshop && <p>Oficina: {event.workshop}</p>}
                    {event.notes && (
                        <p className="break-words">{event.notes}</p>
                    )}
                </div>
            ))}
        </>
    );
}

function UndoDrawer({ batch, onClose }: { batch: Batch; onClose: () => void }) {
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

export default function ProductionIndex({
    stages,
    batches,
    products,
    filterProducts,
    filters,
    canCreate,
    maxQuantity,
    isAdmin,
    workshops,
}: Props) {
    const [creating, setCreating] = useState(false);
    const [details, setDetails] = useState<Batch | null>(null);
    const [undoBatch, setUndoBatch] = useState<Batch | null>(null);
    const [confirm, setConfirm] = useState<{
        batch: Batch;
        kind: 'finish' | 'delete';
    } | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [advanceBatch, setAdvanceBatch] = useState<Batch | null>(null);
    const [managingWorkshops, setManagingWorkshops] = useState(false);
    const { errors } = usePage().props;
    function send(batch: Batch) {
        const target = sequence[sequence.indexOf(batch.stage) + 1];
        setBusy(batch.id);
        router.post(
            advance.url(batch.id),
            { stage: batch.stage, target, version: batch.version },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(null);
                    setConfirm(null);
                },
            },
        );
    }
    function receiveBatch(batch: Batch) {
        setBusy(batch.id);
        router.post(
            receive.url(batch.id),
            { version: batch.version },
            {
                preserveScroll: true,
                onFinish: () => setBusy(null),
            },
        );
    }
    function requestAdvance(batch: Batch) {
        const target = sequence[sequence.indexOf(batch.stage) + 1];
        if (['sewing', 'washing', 'dyeing'].includes(target))
            setAdvanceBatch(batch);
        else send(batch);
    }
    return (
        <>
            <Head title="Produção" />
            <div className="grid gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Produção</h1>
                        <p className="text-muted-foreground">
                            Acompanhe os lotes em cada etapa da fábrica.
                        </p>
                    </div>
                    {canCreate && (
                        <Button
                            className="h-11"
                            onClick={() => setCreating(true)}
                        >
                            <PlusCircleIcon />
                            Novo lote
                        </Button>
                    )}
                    {isAdmin && (
                        <Button
                            variant="outline"
                            className="h-11"
                            onClick={() => setManagingWorkshops(true)}
                        >
                            Oficinas
                        </Button>
                    )}
                </div>
                {(errors.version || errors.batch) && (
                    <p role="alert" className="text-destructive">
                        {errors.version ?? errors.batch}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {stages.map((stage) => (
                        <Card key={stage.value} className="gap-1 p-4">
                            <p className="font-medium">
                                {stage.value === 'bagging'
                                    ? 'Aguardando ensacamento'
                                    : stage.label}
                            </p>
                            <p className="text-2xl font-semibold">
                                {stage.pieces}{' '}
                                {stage.pieces === 1 ? 'peça' : 'peças'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {stage.batches}{' '}
                                {stage.batches === 1 ? 'lote' : 'lotes'}
                            </p>
                            {stage.value !== 'completed' && (
                                <p className="text-sm text-muted-foreground">
                                    A receber: {stage.awaiting_batches} lotes ·{' '}
                                    {stage.awaiting_pieces} peças
                                    <br />
                                    No setor:{' '}
                                    {stage.batches -
                                        stage.awaiting_batches}{' '}
                                    lotes ·{' '}
                                    {stage.pieces - stage.awaiting_pieces} peças
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="min-w-48">
                        <Label htmlFor="stage-filter">Etapa</Label>
                        <Select
                            value={filters.stage ?? 'all'}
                            onValueChange={(value) =>
                                router.get(
                                    index.url(),
                                    {
                                        ...filters,
                                        stage: value === 'all' ? '' : value,
                                    },
                                    { preserveState: true },
                                )
                            }
                        >
                            <SelectTrigger id="stage-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Todas as etapas
                                </SelectItem>
                                {stages.map((stage) => (
                                    <SelectItem
                                        key={stage.value}
                                        value={stage.value}
                                    >
                                        {stage.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-48">
                        <Label htmlFor="product-filter">Produto</Label>
                        <SearchableSelect
                            id="product-filter"
                            label="Produto"
                            value={
                                filters.product
                                    ? String(filters.product)
                                    : 'all'
                            }
                            options={[
                                { value: 'all', label: 'Todos os produtos' },
                                ...filterProducts.map((product) => ({
                                    value: String(product.id),
                                    label: product.name,
                                })),
                            ]}
                            onValueChange={(value) =>
                                router.get(
                                    index.url(),
                                    {
                                        ...filters,
                                        product: value === 'all' ? '' : value,
                                    },
                                    { preserveState: true },
                                )
                            }
                        />
                    </div>
                </div>
                {batches.length === 0 && (filters.product || filters.stage) && (
                    <div
                        className="flex flex-wrap items-center gap-3"
                        role="status"
                    >
                        <p>Nenhum lote encontrado com estes filtros.</p>
                        <Button
                            variant="outline"
                            onClick={() => router.get(index.url())}
                        >
                            Limpar filtros
                        </Button>
                    </div>
                )}
                <div className="grid items-start gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                    {stages
                        .filter(
                            (stage) =>
                                !filters.stage || filters.stage === stage.value,
                        )
                        .map((stage) => (
                            <section key={stage.value} className="min-w-0">
                                <details open>
                                    <summary className="cursor-pointer font-semibold">
                                        {stage.label}
                                    </summary>
                                    <div className="mt-3 grid gap-3">
                                        {batches
                                            .filter(
                                                (batch) =>
                                                    batch.stage === stage.value,
                                            )
                                            .sort(
                                                (a, b) =>
                                                    Number(b.awaiting_receipt) -
                                                    Number(a.awaiting_receipt),
                                            )
                                            .map(
                                                (
                                                    batch,
                                                    index,
                                                    stageBatches,
                                                ) => {
                                                    const next =
                                                        sequence[
                                                            sequence.indexOf(
                                                                batch.stage,
                                                            ) + 1
                                                        ];
                                                    const days = Math.max(
                                                        0,
                                                        Math.floor(
                                                            (Date.now() -
                                                                new Date(
                                                                    batch.stage_entered_at,
                                                                ).getTime()) /
                                                                86400000,
                                                        ),
                                                    );
                                                    return (
                                                        <Fragment
                                                            key={batch.id}
                                                        >
                                                            {stage.value !==
                                                                'completed' &&
                                                                (index === 0 ||
                                                                    stageBatches[
                                                                        index -
                                                                            1
                                                                    ]
                                                                        .awaiting_receipt !==
                                                                        batch.awaiting_receipt) && (
                                                                    <h3 className="text-sm font-medium">
                                                                        {batch.awaiting_receipt
                                                                            ? 'A receber'
                                                                            : 'No setor'}
                                                                    </h3>
                                                                )}
                                                            <Card
                                                                data-testid="production-batch"
                                                                className="min-w-0 gap-3 p-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDetails(
                                                                                batch,
                                                                            )
                                                                        }
                                                                        className="min-w-0 text-left font-semibold break-words underline-offset-4 hover:underline"
                                                                    >
                                                                        {
                                                                            batch.code
                                                                        }{' '}
                                                                        ·{' '}
                                                                        {
                                                                            batch.product_name
                                                                        }
                                                                    </button>
                                                                    {next && (
                                                                        <Button
                                                                            className="hidden h-11 shrink-0 md:inline-flex"
                                                                            disabled={
                                                                                busy !==
                                                                                null
                                                                            }
                                                                            onClick={() =>
                                                                                batch.awaiting_receipt
                                                                                    ? receiveBatch(
                                                                                          batch,
                                                                                      )
                                                                                    : next ===
                                                                                        'completed'
                                                                                      ? setConfirm(
                                                                                            {
                                                                                                batch,
                                                                                                kind: 'finish',
                                                                                            },
                                                                                        )
                                                                                      : requestAdvance(
                                                                                            batch,
                                                                                        )
                                                                            }
                                                                        >
                                                                            <ArrowRightIcon weight="bold" />
                                                                            {busy ===
                                                                            batch.id
                                                                                ? 'Aguarde...'
                                                                                : batch.awaiting_receipt
                                                                                  ? 'Recebi'
                                                                                  : `Avançar para ${labels[next]}`}
                                                                        </Button>
                                                                    )}
                                                                    {isAdmin &&
                                                                        (batch.can_undo ||
                                                                            batch.can_delete) && (
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger
                                                                                    asChild
                                                                                >
                                                                                    <Button
                                                                                        size="icon"
                                                                                        variant="ghost"
                                                                                        aria-label={`Mais ações de ${batch.code}`}
                                                                                    >
                                                                                        <DotsThreeIcon weight="bold" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    {batch.can_undo && (
                                                                                        <DropdownMenuItem
                                                                                            onSelect={() =>
                                                                                                setUndoBatch(
                                                                                                    batch,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            Desfazer
                                                                                            último
                                                                                            avanço
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                    {batch.can_delete && (
                                                                                        <DropdownMenuItem
                                                                                            onSelect={() =>
                                                                                                setConfirm(
                                                                                                    {
                                                                                                        batch,
                                                                                                        kind: 'delete',
                                                                                                    },
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            Excluir
                                                                                            lote
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        )}
                                                                </div>
                                                                {next && (
                                                                    <Button
                                                                        className="h-11 w-full md:hidden"
                                                                        disabled={
                                                                            busy !==
                                                                            null
                                                                        }
                                                                        onClick={() =>
                                                                            batch.awaiting_receipt
                                                                                ? receiveBatch(
                                                                                      batch,
                                                                                  )
                                                                                : next ===
                                                                                    'completed'
                                                                                  ? setConfirm(
                                                                                        {
                                                                                            batch,
                                                                                            kind: 'finish',
                                                                                        },
                                                                                    )
                                                                                  : requestAdvance(
                                                                                        batch,
                                                                                    )
                                                                        }
                                                                    >
                                                                        <ArrowRightIcon weight="bold" />
                                                                        {busy ===
                                                                        batch.id
                                                                            ? 'Aguarde...'
                                                                            : batch.awaiting_receipt
                                                                              ? 'Recebi'
                                                                              : `Avançar para ${labels[next]}`}
                                                                    </Button>
                                                                )}
                                                                <p className="text-sm text-muted-foreground">
                                                                    {batch.awaiting_receipt &&
                                                                        'A receber · '}
                                                                    {batch.workshop &&
                                                                        `Oficina: ${batch.workshop} · `}
                                                                    {
                                                                        batch.quantity
                                                                    }{' '}
                                                                    {batch.quantity ===
                                                                    1
                                                                        ? 'peça'
                                                                        : 'peças'}{' '}
                                                                    ·{' '}
                                                                    {days === 1
                                                                        ? '1 dia'
                                                                        : `${days} dias`}{' '}
                                                                    nesta etapa
                                                                </p>
                                                            </Card>
                                                        </Fragment>
                                                    );
                                                },
                                            )}
                                        {!batches.some(
                                            (batch) =>
                                                batch.stage === stage.value,
                                        ) && (
                                            <p className="text-sm text-muted-foreground">
                                                Nenhum lote nesta etapa.
                                            </p>
                                        )}
                                    </div>
                                </details>
                            </section>
                        ))}
                </div>
            </div>
            {creating && (
                <BatchDrawer
                    products={products}
                    maxQuantity={maxQuantity}
                    onClose={() => setCreating(false)}
                />
            )}
            {details && (
                <DetailsDrawer
                    batch={details}
                    onClose={() => setDetails(null)}
                />
            )}
            {undoBatch && (
                <UndoDrawer
                    batch={undoBatch}
                    onClose={() => setUndoBatch(null)}
                />
            )}
            {advanceBatch && (
                <AdvanceWorkshopDrawer
                    batch={advanceBatch}
                    target={sequence[sequence.indexOf(advanceBatch.stage) + 1]}
                    label={
                        labels[
                            sequence[sequence.indexOf(advanceBatch.stage) + 1]
                        ]
                    }
                    workshops={workshops}
                    onClose={() => setAdvanceBatch(null)}
                />
            )}
            {managingWorkshops && (
                <ManageWorkshopsDrawer
                    workshops={workshops}
                    onClose={() => {
                        setManagingWorkshops(false);
                        router.reload({ only: ['workshops'] });
                    }}
                />
            )}
            <ConfirmationDialog
                open={confirm !== null}
                onOpenChange={(open) => {
                    if (!open && busy === null) setConfirm(null);
                }}
                title={
                    confirm?.kind === 'finish'
                        ? `Concluir ${confirm.batch.code}?`
                        : `Excluir ${confirm?.batch.code}?`
                }
                description={
                    confirm?.kind === 'finish'
                        ? 'A conclusão não cadastra sacos de estoque. O ensacamento continua sendo registrado manualmente.'
                        : 'Somente lotes que nunca avançaram podem ser excluídos.'
                }
                confirmLabel={
                    confirm?.kind === 'finish'
                        ? 'Concluir lote'
                        : 'Excluir lote'
                }
                destructive={confirm?.kind === 'delete'}
                disabled={busy !== null}
                onConfirm={() => {
                    if (!confirm) return;
                    if (confirm.kind === 'finish') send(confirm.batch);
                    else {
                        setBusy(confirm.batch.id);
                        router.delete(destroy.url(confirm.batch.id), {
                            data: { version: confirm.batch.version },
                            preserveScroll: true,
                            onFinish: () => {
                                setBusy(null);
                                setConfirm(null);
                            },
                        });
                    }
                }}
            />
        </>
    );
}

ProductionIndex.layout = {
    breadcrumbs: [{ title: 'Produção', href: index() }],
};
