import { Head, router, useForm, usePage, usePoll } from '@inertiajs/react';
import {
    ArrowRightIcon,
    CaretRightIcon,
    CheckIcon,
    ClockIcon,
    DotsThreeIcon,
    FactoryIcon,
    PlusCircleIcon,
    TShirtIcon,
    WarningIcon,
    XIcon,
} from '@phosphor-icons/react';
import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
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
    SizeGridEditor,
    type BatchSize,
    type SizeInput,
} from '@/components/production/size-grid-editor';
import { SizeGridDrawer } from '@/components/production/size-grid-drawer';
import { keepFocusedInputVisible } from '@/components/production/scroll-focused-input';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import {
    AdvanceWorkshopDrawer,
    ManageWorkshopsDrawer,
    type Workshop,
} from '@/components/production/workshop-drawer';
import InputError from '@/components/input-error';
import { SearchField } from '@/components/search-filter-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Drawer,
    DrawerClose,
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
import { cn } from '@/lib/utils';

type Stage = {
    value: string;
    label: string;
    batches: number;
    pieces: number;
    awaiting_batches: number;
    awaiting_pieces: number;
    stalled_batches: number;
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
    sizes_before: BatchSize[] | null;
    sizes_after: BatchSize[] | null;
};
type Batch = {
    id: number;
    code: string;
    product_id: number;
    product_name: string;
    quantity: number;
    sizes: BatchSize[];
    stage: string;
    version: number;
    stage_entered_at: string;
    stalled: boolean;
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
    filters: {
        product: number | null;
        stage: string | null;
        search?: string;
    };
    canCreate: boolean;
    maxQuantity: number;
    stalledAfterDays: number;
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
/** Intervalo da atualização automática do quadro, em milissegundos. */
const refreshInterval = 30000;
const labels: Record<string, string> = {
    cutting: 'Corte',
    sewing: 'Costura',
    washing: 'Lavagem',
    dyeing: 'Tinturaria',
    finishing: 'Acabamento',
    bagging: 'Ensacamento',
    completed: 'No estoque',
};

function pluralize(count: number, singular: string, plural: string) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function daysInStage(batch: Batch) {
    return Math.max(
        0,
        Math.floor(
            (Date.now() - new Date(batch.stage_entered_at).getTime()) /
                86400000,
        ),
    );
}

function StageHeader({
    stage,
    stalledAfterDays,
}: {
    stage: Stage;
    stalledAfterDays: number;
}) {
    return (
        <div className="grid min-w-0 gap-1">
            <span className="inline-flex items-center gap-1.5 text-base font-semibold">
                <CaretRightIcon
                    weight="bold"
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                />
                {stage.label}
            </span>
            <p className="text-sm font-normal text-muted-foreground">
                <strong className="text-2xl font-semibold text-foreground tabular-nums">
                    {stage.pieces}
                </strong>{' '}
                {stage.pieces === 1 ? 'peça' : 'peças'} ·{' '}
                {pluralize(stage.batches, 'lote', 'lotes')}
            </p>
            {stage.stalled_batches > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-highlight">
                    <WarningIcon className="size-4 shrink-0" />
                    {stage.stalled_batches === 1
                        ? '1 lote parado'
                        : `${stage.stalled_batches} lotes parados`}{' '}
                    há mais de {stalledAfterDays} dias
                </p>
            )}
        </div>
    );
}

function BatchGroup({
    title,
    batches,
    children,
}: {
    title: string;
    batches: Batch[];
    children: ReactNode;
}) {
    const pieces = batches.reduce((total, batch) => total + batch.quantity, 0);
    return (
        <details
            open
            data-testid="production-batch-group"
            className="group/batches"
        >
            <summary className="mt-1 flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5 tracking-wide uppercase">
                    <CaretRightIcon
                        weight="bold"
                        aria-hidden="true"
                        className="size-3.5 shrink-0 transition-transform group-open/batches:rotate-90"
                    />
                    {title}
                </span>
                <span className="tabular-nums">
                    {pluralize(batches.length, 'lote', 'lotes')} ·{' '}
                    {pluralize(pieces, 'peça', 'peças')}
                </span>
            </summary>
            <div className="mt-2 grid gap-3">{children}</div>
        </details>
    );
}

function BatchCard({
    batch,
    isAdmin,
    busy,
    onOpen,
    onPrimary,
    onEditSizes,
    onUndo,
    onDelete,
}: {
    batch: Batch;
    isAdmin: boolean;
    busy: number | null;
    onOpen: () => void;
    onPrimary: () => void;
    onEditSizes: () => void;
    onUndo: () => void;
    onDelete: () => void;
}) {
    const next = sequence[sequence.indexOf(batch.stage) + 1];
    const days = daysInStage(batch);
    const canEditSizes = !batch.awaiting_receipt && batch.stage !== 'completed';
    const primary = next && (
        <Button
            variant={batch.awaiting_receipt ? 'default' : 'outline'}
            disabled={busy !== null}
            onClick={onPrimary}
        >
            {batch.awaiting_receipt ? (
                <CheckIcon weight="bold" />
            ) : (
                <ArrowRightIcon weight="bold" />
            )}
            {busy === batch.id
                ? 'Aguarde...'
                : batch.awaiting_receipt
                  ? 'Recebi'
                  : next === 'completed'
                    ? 'Enviar para o estoque'
                    : `Avançar para ${labels[next]}`}
        </Button>
    );

    return (
        <Card
            data-testid="production-batch"
            className={cn(
                '@container min-w-0 gap-3 p-4',
                batch.awaiting_receipt && 'border-dashed',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <button
                    type="button"
                    onClick={onOpen}
                    title={batch.product_name}
                    className="group/title min-w-0 flex-1 rounded-sm text-left"
                >
                    <span className="block font-mono text-[11px] text-muted-foreground">
                        {batch.code}
                    </span>
                    <span className="mt-0.5 line-clamp-2 font-semibold break-words underline-offset-4 group-hover/title:underline">
                        {batch.product_name}
                    </span>
                </button>
                {primary && (
                    <div className="hidden shrink-0 @md:block [&>button]:h-11">
                        {primary}
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="-mt-1 -mr-2 shrink-0"
                            aria-label={`Mais ações de ${batch.code}`}
                        >
                            <DotsThreeIcon weight="bold" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onOpen}>
                            Ver detalhes e histórico
                        </DropdownMenuItem>
                        {canEditSizes && (
                            <DropdownMenuItem onSelect={onEditSizes}>
                                Editar grade
                            </DropdownMenuItem>
                        )}
                        {isAdmin && batch.can_undo && (
                            <DropdownMenuItem onSelect={onUndo}>
                                Desfazer último avanço
                            </DropdownMenuItem>
                        )}
                        {isAdmin && batch.can_delete && (
                            <DropdownMenuItem onSelect={onDelete}>
                                Excluir lote
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {primary && (
                <div className="grid @md:hidden [&>button]:h-11">{primary}</div>
            )}
            {batch.workshop && (
                <p
                    className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
                    title={`Oficina: ${batch.workshop}`}
                >
                    <FactoryIcon
                        className="size-4 shrink-0"
                        aria-label="Oficina"
                    />
                    <span className="truncate">{batch.workshop}</span>
                </p>
            )}
            <dl
                className={cn(
                    'grid grid-cols-2 gap-3 rounded-lg px-3 py-2 text-xs',
                    batch.stalled
                        ? 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                <div className="grid gap-0.5">
                    <dt>Peças</dt>
                    <dd className="flex items-center gap-1.5">
                        <TShirtIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            <strong className="text-lg leading-none font-semibold text-foreground tabular-nums">
                                {batch.quantity}
                            </strong>{' '}
                            {batch.quantity === 1 ? 'peça' : 'peças'}
                        </span>
                    </dd>
                </div>
                <div className="grid gap-0.5">
                    <dt
                        className={cn(
                            batch.stalled && 'font-medium text-highlight',
                        )}
                    >
                        {batch.stalled ? 'Parado há' : 'Nesta etapa'}
                    </dt>
                    <dd className="flex items-center gap-1.5">
                        {batch.stalled ? (
                            <WarningIcon
                                className="size-4 shrink-0 text-highlight"
                                aria-hidden="true"
                            />
                        ) : (
                            <ClockIcon
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                        )}
                        <span>
                            <strong className="text-lg leading-none font-semibold text-foreground tabular-nums">
                                {days}
                            </strong>{' '}
                            {days === 1 ? 'dia' : 'dias'}
                        </span>
                    </dd>
                </div>
            </dl>
            {batch.sizes.length > 0 && (
                <StockSizeBreakdown sizes={batch.sizes} compact />
            )}
        </Card>
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
                    <div
                        className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-6 pb-6"
                        onFocusCapture={keepFocusedInputVisible}
                    >
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
                        <SizeGridEditor
                            value={form.data.sizes}
                            onChange={(sizes) => form.setData('sizes', sizes)}
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
                                    form.setData('notes', event.target.value)
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
    stalledAfterDays,
    isAdmin,
    workshops,
}: Props) {
    const [creating, setCreating] = useState(false);
    const [details, setDetails] = useState<Batch | null>(null);
    const [undoBatch, setUndoBatch] = useState<Batch | null>(null);
    const [editingSizes, setEditingSizes] = useState<Batch | null>(null);
    const [confirm, setConfirm] = useState<{
        batch: Batch;
        kind: 'finish' | 'delete';
    } | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [advanceBatch, setAdvanceBatch] = useState<Batch | null>(null);
    const [managingWorkshops, setManagingWorkshops] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const boardRef = useRef<HTMLDivElement>(null);
    // Com busca ou produto escolhido, mostra só os setores com resultado.
    const narrowed = Boolean(filters.search || filters.product);
    const visibleStages = stages.filter(
        (stage) =>
            (!filters.stage || filters.stage === stage.value) &&
            (!narrowed || batches.some((batch) => batch.stage === stage.value)),
    );
    const hasFilters = Boolean(
        filters.product || filters.stage || filters.search,
    );
    const panelOpen = Boolean(
        creating ||
        details ||
        undoBatch ||
        editingSizes ||
        confirm ||
        advanceBatch ||
        managingWorkshops ||
        busy !== null,
    );
    const poll = usePoll(
        refreshInterval,
        { only: ['stages', 'batches', 'filterProducts'] },
        { autoStart: false },
    );
    useEffect(() => {
        if (panelOpen) {
            poll.stop();
        } else {
            poll.start();
        }
        return () => poll.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [panelOpen]);
    function applyFilters(changes: Partial<Props['filters']>) {
        router.get(
            index.url(),
            { ...filters, search, ...changes },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }
    const skipSearchRequest = useRef(true);
    useEffect(() => {
        if (skipSearchRequest.current) {
            skipSearchRequest.current = false;
            return;
        }
        const timeout = window.setTimeout(() => applyFilters({ search }), 300);
        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);
    function goToStage(stage: string) {
        const section = document.getElementById(`setor-${stage}`);
        const board = boardRef.current;
        if (!section || !board) return;
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        const behavior = reduceMotion ? 'auto' : 'smooth';
        if (board.scrollWidth > board.clientWidth) {
            board.scrollTo({
                left: section.offsetLeft - board.offsetLeft,
                behavior,
            });
        } else {
            section.scrollIntoView({ behavior, block: 'start' });
        }
        section.querySelector('summary')?.focus({ preventScroll: true });
    }
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
    function primaryAction(batch: Batch) {
        const next = sequence[sequence.indexOf(batch.stage) + 1];
        if (batch.awaiting_receipt) receiveBatch(batch);
        else if (next === 'completed') setConfirm({ batch, kind: 'finish' });
        else requestAdvance(batch);
    }
    return (
        <>
            <Head title="Produção" />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:flex md:h-[calc(100dvh-4.5rem-1px)] md:flex-col md:p-6">
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                    <div className="mr-auto min-w-0">
                        <h1 className="text-2xl font-semibold">Produção</h1>
                        <p className="text-muted-foreground">
                            Acompanhe os lotes em cada etapa da fábrica.
                        </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-3 max-xl:order-2 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
                        <div className="col-span-2 min-w-0 sm:w-64">
                            <SearchField
                                id="batch-search"
                                label="Buscar lote"
                                placeholder="Código do lote ou produto"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onClear={() => setSearch('')}
                            />
                        </div>
                        {stages.length > 1 && (
                            <Select
                                value={filters.stage ?? 'all'}
                                onValueChange={(value) =>
                                    applyFilters({
                                        stage: value === 'all' ? null : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    id="stage-filter"
                                    label="Etapa"
                                    aria-label="Etapa"
                                    className="w-full min-w-0 data-[size=default]:h-14 sm:w-44"
                                >
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
                        )}
                        <div
                            className={cn(
                                'min-w-0 sm:w-52',
                                stages.length <= 1 && 'col-span-2',
                            )}
                        >
                            <SearchableSelect
                                id="product-filter"
                                label="Produto"
                                showLabel
                                className="h-14"
                                value={
                                    filters.product
                                        ? String(filters.product)
                                        : 'all'
                                }
                                options={[
                                    {
                                        value: 'all',
                                        label: 'Todos os produtos',
                                    },
                                    ...filterProducts.map((product) => ({
                                        value: String(product.id),
                                        label: product.name,
                                    })),
                                ]}
                                onValueChange={(value) =>
                                    applyFilters({
                                        product:
                                            value === 'all'
                                                ? null
                                                : Number(value),
                                    })
                                }
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-xl:order-1">
                        {isAdmin && (
                            <Button
                                variant="outline"
                                className="h-11"
                                onClick={() => setManagingWorkshops(true)}
                            >
                                <FactoryIcon />
                                Oficinas
                            </Button>
                        )}
                        {canCreate && (
                            <Button
                                className="h-11"
                                onClick={() => setCreating(true)}
                            >
                                <PlusCircleIcon />
                                Novo lote
                            </Button>
                        )}
                    </div>
                </div>
                {(errors.version || errors.batch) && (
                    <p role="alert" className="text-destructive">
                        {errors.version ?? errors.batch}
                    </p>
                )}
                {batches.length === 0 && hasFilters && (
                    <div
                        className="flex flex-wrap items-center gap-3"
                        role="status"
                    >
                        <p>
                            {filters.search
                                ? `Nenhum lote encontrado para "${filters.search}".`
                                : 'Nenhum lote encontrado com estes filtros.'}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                skipSearchRequest.current = search !== '';
                                setSearch('');
                                router.get(index.url());
                            }}
                        >
                            Limpar busca e filtros
                        </Button>
                    </div>
                )}
                {visibleStages.length > 1 && (
                    <nav
                        aria-label="Ir para o setor"
                        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
                    >
                        {visibleStages.map((stage) => (
                            <Button
                                key={stage.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 rounded-full"
                                onClick={() => goToStage(stage.value)}
                            >
                                {stage.label}
                                <span className="text-muted-foreground tabular-nums">
                                    {stage.pieces}
                                </span>
                                {stage.stalled_batches > 0 && (
                                    <WarningIcon
                                        className="text-highlight"
                                        aria-label={`${pluralize(stage.stalled_batches, 'lote parado', 'lotes parados')}`}
                                    />
                                )}
                            </Button>
                        ))}
                    </nav>
                )}
                <div
                    ref={boardRef}
                    data-testid="production-board"
                    className="production-board-scrollbar flex flex-col gap-6 md:min-h-80 md:flex-1 md:flex-row md:items-start md:gap-4 md:overflow-x-auto md:pb-2"
                >
                    {visibleStages.map((stage) => {
                        const stageBatches = batches.filter(
                            (batch) => batch.stage === stage.value,
                        );
                        const groups =
                            stage.value === 'completed'
                                ? [{ title: null, items: stageBatches }]
                                : [
                                      {
                                          title: 'A receber',
                                          items: stageBatches.filter(
                                              (batch) => batch.awaiting_receipt,
                                          ),
                                      },
                                      {
                                          title: 'No setor',
                                          items: stageBatches.filter(
                                              (batch) =>
                                                  !batch.awaiting_receipt,
                                          ),
                                      },
                                  ];
                        return (
                            <section
                                key={stage.value}
                                id={`setor-${stage.value}`}
                                data-testid="production-stage"
                                className="min-w-0 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [scrollbar-gutter:stable] md:max-h-full md:min-w-80 md:flex-1 md:overflow-y-auto md:overscroll-contain md:rounded-2xl md:border md:border-border/70 md:bg-[color-mix(in_oklab,var(--muted)_40%,var(--background))] md:px-3 md:pb-3"
                            >
                                <details open className="group">
                                    <summary className="cursor-pointer list-none rounded-lg md:sticky md:top-0 md:z-10 md:bg-[color-mix(in_oklab,var(--muted)_40%,var(--background))] md:pt-3 md:pb-2 [&::-webkit-details-marker]:hidden">
                                        <StageHeader
                                            stage={stage}
                                            stalledAfterDays={stalledAfterDays}
                                        />
                                    </summary>
                                    <div className="mt-3 grid gap-3">
                                        {groups
                                            .filter(
                                                (group) =>
                                                    group.items.length > 0,
                                            )
                                            .map((group) =>
                                                group.title ? (
                                                    <BatchGroup
                                                        key={group.title}
                                                        title={group.title}
                                                        batches={group.items}
                                                    >
                                                        {group.items.map(
                                                            (batch) => (
                                                                <BatchCard
                                                                    key={
                                                                        batch.id
                                                                    }
                                                                    batch={
                                                                        batch
                                                                    }
                                                                    isAdmin={
                                                                        isAdmin
                                                                    }
                                                                    busy={busy}
                                                                    onOpen={() =>
                                                                        setDetails(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onPrimary={() =>
                                                                        primaryAction(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onEditSizes={() =>
                                                                        setEditingSizes(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onUndo={() =>
                                                                        setUndoBatch(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onDelete={() =>
                                                                        setConfirm(
                                                                            {
                                                                                batch,
                                                                                kind: 'delete',
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </BatchGroup>
                                                ) : (
                                                    <Fragment key="all">
                                                        {group.items.map(
                                                            (batch) => (
                                                                <BatchCard
                                                                    key={
                                                                        batch.id
                                                                    }
                                                                    batch={
                                                                        batch
                                                                    }
                                                                    isAdmin={
                                                                        isAdmin
                                                                    }
                                                                    busy={busy}
                                                                    onOpen={() =>
                                                                        setDetails(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onPrimary={() =>
                                                                        primaryAction(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onEditSizes={() =>
                                                                        setEditingSizes(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onUndo={() =>
                                                                        setUndoBatch(
                                                                            batch,
                                                                        )
                                                                    }
                                                                    onDelete={() =>
                                                                        setConfirm(
                                                                            {
                                                                                batch,
                                                                                kind: 'delete',
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </Fragment>
                                                ),
                                            )}
                                        {stageBatches.length === 0 && (
                                            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                                                Nenhum lote nesta etapa.
                                            </p>
                                        )}
                                    </div>
                                </details>
                            </section>
                        );
                    })}
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
            {editingSizes && (
                <SizeGridDrawer
                    batch={editingSizes}
                    maxQuantity={maxQuantity}
                    onClose={() => setEditingSizes(null)}
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
                        ? `Enviar ${confirm.batch.code} para o estoque?`
                        : `Excluir ${confirm?.batch.code}?`
                }
                description={
                    confirm?.kind === 'finish'
                        ? 'O lote vai para "No estoque" e sai do Ensacamento. Os sacos não são criados automaticamente: continue cadastrando cada saco no estoque.'
                        : 'Somente lotes que nunca avançaram podem ser excluídos.'
                }
                confirmLabel={
                    confirm?.kind === 'finish'
                        ? 'Enviar para o estoque'
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
