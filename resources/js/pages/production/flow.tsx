import '@xyflow/react/dist/base.css';
import { Head, usePage, usePoll } from '@inertiajs/react';
import {
    CaretLeftIcon,
    CaretRightIcon,
    CornersOutIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    WarningIcon,
    SlidersHorizontalIcon,
} from '@phosphor-icons/react';
import {
    Background,
    BackgroundVariant,
    MiniMap,
    Panel,
    ReactFlow,
    ReactFlowProvider,
    useNodesInitialized,
    useReactFlow,
    useUpdateNodeInternals,
    type NodeChange,
    type Viewport,
} from '@xyflow/react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { index } from '@/actions/App/Http/Controllers/ProductionBatchController';
import {
    FlowEdge,
    type FlowEdgeType,
} from '@/components/production/flow/flow-edge';
import {
    STAGE_WIDTH,
    StageNode,
    type FlowOrientation,
    type StageNodeType,
} from '@/components/production/flow/stage-node';
import {
    refreshInterval,
    sequence,
    type Batch,
    type ProductionPageProps,
} from '@/components/production/types';
import { useProductionActions } from '@/components/production/use-production-actions';
import { SearchField } from '@/components/search-filter-bar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';

type Props = ProductionPageProps & { completedDays: number };

const nodeTypes = { stage: StageNode };
const edgeTypes = { flow: FlowEdge };
/** Espaço entre as etapas: maior na horizontal para caber o rótulo da linha. */
const GAP = { horizontal: 160, vertical: 140 };
/** Espaço livre no topo do canvas, abaixo da barra de busca. */
const TOP_OFFSET = { horizontal: 120, vertical: 150 };
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 1.6;
/**
 * Sensibilidade da roda do mouse: um clique da roda (deltaY ≈ 100) muda o
 * zoom em cerca de 6%, bem menos que o padrão do React Flow.
 */
const WHEEL_ZOOM_SPEED = 0.0008;

function subscribeReducedMotion(callback: () => void) {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', callback);
    return () => query.removeEventListener('change', callback);
}

function useReducedMotion(): boolean {
    return useSyncExternalStore(
        subscribeReducedMotion,
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        () => false,
    );
}

function normalize(text: string) {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

function readViewport(key: string): Viewport | null {
    try {
        const value = JSON.parse(window.localStorage.getItem(key) ?? 'null');
        return value && [value.x, value.y, value.zoom].every(Number.isFinite)
            ? value
            : null;
    } catch {
        return null;
    }
}

function saveViewport(key: string, viewport: Viewport) {
    try {
        window.localStorage.setItem(key, JSON.stringify(viewport));
    } catch {
        // Sem armazenamento local, o canvas abre ajustado à tela.
    }
}

export default function ProductionFlow(props: Props) {
    return (
        <>
            <Head title="Fluxo da produção" />
            <h1 className="sr-only">Fluxo da produção</h1>
            <div
                data-testid="production-flow"
                className="relative h-[calc(100dvh-4.5rem-1px)] w-full overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,color-mix(in_oklab,var(--action)_9%,var(--background)),var(--background)_70%)]"
            >
                <ReactFlowProvider>
                    <FlowCanvas {...props} />
                </ReactFlowProvider>
            </div>
        </>
    );
}

function FlowCanvas({
    stages,
    batches,
    products,
    maxQuantity,
    stalledAfterDays,
    completedDays,
    canCreate,
    isAdmin,
    workshops,
}: Props) {
    const mobile = useIsMobile();
    const reducedMotion = useReducedMotion();
    const orientation: FlowOrientation = mobile ? 'vertical' : 'horizontal';
    const viewportKey = `producao-fluxo-viewport:${orientation}`;
    const reactFlow = useReactFlow();
    const nodesInitialized = useNodesInitialized();
    const updateNodeInternals = useUpdateNodeInternals();
    const { errors, auth } = usePage().props;
    const actions = useProductionActions({
        batches,
        products,
        maxQuantity,
        workshops,
        canCreate,
        isAdmin,
    });

    const [visibility, setVisibility] = useState({
        filters: true,
        stages: true,
        minimap: true,
        zoom: true,
    });
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const allVisible = Object.values(visibility).every(Boolean);
    const visibilityLabels = {
        filters: 'Busca e filtro',
        stages: 'Barra de etapas',
        minimap: 'Minimapa',
        zoom: 'Controles de zoom',
    };
    const [moving, setMoving] = useState(false);
    const [dims, setDims] = useState<
        Record<string, { width: number; height: number }>
    >({});
    const [query, setQuery] = useState('');
    const [attention, setAttention] = useState(false);
    const [cursor, setCursor] = useState(0);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [visibleStage, setVisibleStage] = useState<string | null>(null);
    // Orientação em que a posição inicial já foi aplicada.
    const initializedFor = useRef<FlowOrientation | null>(null);

    const poll = usePoll(
        refreshInterval,
        { only: ['stages', 'batches'] },
        { autoStart: false },
    );
    const pausePolling = actions.panelOpen || moving;
    useEffect(() => {
        if (pausePolling) poll.stop();
        else poll.start();
        return () => poll.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pausePolling]);

    // Lotes destacados pela busca e pelo modo Atenção, na ordem do fluxo.
    const results = useMemo(() => {
        const term = normalize(query.trim());
        if (!term && !attention) return null;
        return batches
            .filter(
                (batch) =>
                    (!term ||
                        normalize(
                            `${batch.code} ${batch.product_name} ${batch.workshop ?? ''}`,
                        ).includes(term)) &&
                    (!attention ||
                        batch.stalled ||
                        (batch.awaiting_receipt &&
                            batch.stage !== 'completed')),
            )
            .sort(
                (a, b) =>
                    sequence.indexOf(a.stage) - sequence.indexOf(b.stage) ||
                    Number(b.awaiting_receipt) - Number(a.awaiting_receipt),
            );
    }, [batches, query, attention]);
    const highlighted = useMemo(
        () => (results ? new Set(results.map((batch) => batch.id)) : null),
        [results],
    );

    const positions = useMemo(() => {
        let offset = 0;
        return stages.map((stage) => {
            const height = dims[`stage-${stage.value}`]?.height ?? 360;
            const position =
                orientation === 'horizontal'
                    ? { x: offset, y: 0 }
                    : { x: 0, y: offset };
            offset +=
                (orientation === 'horizontal' ? STAGE_WIDTH : height) +
                GAP[orientation];
            return position;
        });
    }, [stages, dims, orientation]);

    const nodes: StageNodeType[] = stages.map((stage, position) => ({
        id: `stage-${stage.value}`,
        type: 'stage',
        position: positions[position],
        measured: dims[`stage-${stage.value}`],
        draggable: false,
        selectable: false,
        // Nós sem arrastar nem selecionar não recebem cliques por padrão.
        style: { pointerEvents: 'all' },
        data: {
            stage,
            batches: batches.filter((batch) => batch.stage === stage.value),
            orientation,
            hasPrevious: position > 0,
            hasNext: position < stages.length - 1,
            stalledAfterDays,
            completedDays,
            highlighted,
            currentId,
            cardActions: actions.cardActions,
            onOpen: actions.openDetails,
        },
    }));

    const edges: FlowEdgeType[] = stages.slice(1).map((stage, position) => ({
        id: `flow-${stages[position].value}-${stage.value}`,
        type: 'flow',
        source: `stage-${stages[position].value}`,
        target: `stage-${stage.value}`,
        selectable: false,
        focusable: false,
        data: {
            // Lotes em "No estoque" não passam por recebimento.
            batches: stage.value === 'completed' ? 0 : stage.awaiting_batches,
            pieces: stage.value === 'completed' ? 0 : stage.awaiting_pieces,
            animate: !reducedMotion,
        },
    }));

    function onNodesChange(changes: NodeChange<StageNodeType>[]) {
        setDims((previous) => {
            let next = previous;
            for (const change of changes) {
                if (change.type !== 'dimensions' || !change.dimensions)
                    continue;
                const current = previous[change.id];
                if (
                    current?.width === change.dimensions.width &&
                    current?.height === change.dimensions.height
                )
                    continue;
                next = { ...next, [change.id]: change.dimensions };
            }
            return next;
        });
    }

    function containerSize() {
        const element = document.querySelector(
            '[data-testid="production-flow"]',
        );
        return {
            width: element?.clientWidth ?? window.innerWidth,
            height: element?.clientHeight ?? window.innerHeight,
        };
    }

    const duration = reducedMotion ? 0 : 450;

    // Zoom gradual pela roda do mouse, ancorado no ponteiro. O gesto de
    // pinça do trackpad (wheel com ctrlKey) continua com o React Flow.
    useEffect(() => {
        const element = document.querySelector<HTMLElement>(
            '[data-testid="production-flow"] .react-flow',
        );
        if (!element) return;
        function onWheel(event: WheelEvent) {
            if (event.ctrlKey) return;
            if ((event.target as Element).closest('.nowheel')) return;
            event.preventDefault();
            const delta =
                event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
            const { x, y, zoom } = reactFlow.getViewport();
            const next = Math.min(
                MAX_ZOOM,
                Math.max(
                    MIN_ZOOM,
                    zoom *
                        2 **
                            (-Math.max(-300, Math.min(300, delta)) *
                                WHEEL_ZOOM_SPEED),
                ),
            );
            if (next === zoom) return;
            const rect = element!.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            void reactFlow.setViewport({
                x: pointerX - ((pointerX - x) / zoom) * next,
                y: pointerY - ((pointerY - y) / zoom) * next,
                zoom: next,
            });
        }
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
    }, [reactFlow]);

    /** Zoom em que a etapa ocupa a largura da tela no celular. */
    function readableZoom() {
        const { width } = containerSize();
        return mobile
            ? Math.min(1.1, Math.max(0.5, (width - 24) / STAGE_WIDTH))
            : 1;
    }

    function focusStage(value: string, animate = true) {
        const index = stages.findIndex((stage) => stage.value === value);
        if (index < 0) return;
        const { width } = containerSize();
        const zoom = readableZoom();
        const position = positions[index];
        void reactFlow.setViewport(
            {
                x: width / 2 - (position.x + STAGE_WIDTH / 2) * zoom,
                y: TOP_OFFSET[orientation] - position.y * zoom,
                zoom,
            },
            { duration: animate ? duration : 0 },
        );
        setVisibleStage(value);
    }

    function focusBatch(batch: Batch) {
        const element = document.querySelector(
            `[data-flow-batch="${batch.id}"]`,
        );
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const center = reactFlow.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
        void reactFlow.setCenter(center.x, center.y, {
            zoom: Math.max(reactFlow.getZoom(), readableZoom()),
            duration,
        });
        setCurrentId(batch.id);
        setVisibleStage(batch.stage);
    }

    function step(direction: 1 | -1) {
        if (!results?.length) return;
        const next = (cursor + direction + results.length) % results.length;
        setCursor(next);
        focusBatch(results[next]);
    }

    // Ao buscar ou ligar o modo Atenção, leva o canvas ao primeiro lote.
    useEffect(() => {
        setCursor(0);
        setCurrentId(null);
        if (!results?.length) return;
        const timeout = window.setTimeout(() => focusBatch(results[0]), 350);
        return () => window.clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, attention]);

    /** Mostra o máximo de etapas sem compactar os lotes, a partir do Corte. */
    function overview(animate = true) {
        const { width } = containerSize();
        const total =
            stages.length * STAGE_WIDTH + (stages.length - 1) * GAP.horizontal;
        const zoom = Math.min(1, Math.max(0.65, (width - 48) / total));
        void reactFlow.setViewport(
            {
                x: Math.max(24, (width - total * zoom) / 2),
                y: TOP_OFFSET.horizontal,
                zoom,
            },
            { duration: animate ? duration : 0 },
        );
    }

    // Posição inicial: link direto para um lote, última posição usada ou a
    // primeira etapa com lotes. Ao girar a tela ou mudar de largura, o
    // layout muda de orientação e a posição é aplicada de novo.
    useEffect(() => {
        if (!nodesInitialized || initializedFor.current === orientation) return;
        const firstTime = initializedFor.current === null;
        initializedFor.current = orientation;
        // Os pontos de ligação mudam de lado com a orientação.
        updateNodeInternals(stages.map((stage) => `stage-${stage.value}`));
        const code = new URLSearchParams(window.location.search).get('lote');
        const linked = batches.find(
            (batch) => batch.code.toLowerCase() === code?.toLowerCase(),
        );
        if (linked && firstTime) {
            focusBatch(linked);
            actions.openDetails(linked);
            return;
        }
        const saved = firstTime
            ? readViewport(`${viewportKey}:${auth.user.id}`)
            : null;
        if (saved) {
            void reactFlow.setViewport(saved);
            return;
        }
        if (mobile) {
            focusStage(
                stages.find((stage) => stage.batches > 0)?.value ??
                    stages[0]?.value,
                false,
            );
        } else {
            overview(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesInitialized, orientation]);

    function onMoveEnd(viewport: Viewport) {
        setMoving(false);
        saveViewport(`${viewportKey}:${auth.user.id}`, viewport);
        const { width, height } = containerSize();
        const center = {
            x: (width / 2 - viewport.x) / viewport.zoom,
            y: (height / 2 - viewport.y) / viewport.zoom,
        };
        const index = positions.findLastIndex((position) =>
            orientation === 'horizontal'
                ? position.x <= center.x
                : position.y <= center.y,
        );
        setVisibleStage(stages[Math.max(0, index)]?.value ?? null);
    }

    return (
        <>
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,color-mix(in_oklab,var(--background)_70%,transparent))]"
                aria-hidden="true"
            />
            <DropdownMenu
                open={menu !== null}
                onOpenChange={(open) => {
                    if (!open) setMenu(null);
                    else if (!menu)
                        setMenu({ x: window.innerWidth - 48, y: 90 });
                }}
            >
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="secondary"
                        size="icon"
                        aria-label="Elementos do canvas"
                        className="fixed z-30"
                        style={{
                            left: menu?.x,
                            top: menu?.y ?? 150,
                            right: menu ? undefined : 12,
                        }}
                    >
                        <SlidersHorizontalIcon />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuCheckboxItem
                        checked={allVisible}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(checked) =>
                            setVisibility({
                                filters: checked,
                                stages: checked,
                                minimap: checked,
                                zoom: checked,
                            })
                        }
                    >
                        Exibir todos
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {(
                        Object.keys(
                            visibilityLabels,
                        ) as (keyof typeof visibility)[]
                    ).map((key) => (
                        <DropdownMenuCheckboxItem
                            key={key}
                            checked={visibility[key]}
                            onSelect={(event) => event.preventDefault()}
                            onCheckedChange={(checked) =>
                                setVisibility((previous) => ({
                                    ...previous,
                                    [key]: checked,
                                }))
                            }
                        >
                            {visibilityLabels[key]}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <ReactFlow
                onPaneContextMenu={(event) => {
                    event.preventDefault();
                    setMenu({ x: event.clientX, y: event.clientY });
                }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onMoveStart={() => setMoving(true)}
                onMoveEnd={(_, viewport) => onMoveEnd(viewport)}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                nodesFocusable={false}
                edgesFocusable={false}
                zoomOnDoubleClick={false}
                zoomOnScroll={false}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                proOptions={{ hideAttribution: true }}
                aria-label="Fluxo da produção: arraste para mover e use a roda do mouse ou os botões para ampliar"
            >
                <Background
                    id="flow-dots"
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1.2}
                    color="color-mix(in oklab, var(--foreground) 16%, transparent)"
                />
                <Background
                    id="flow-grid"
                    variant={BackgroundVariant.Lines}
                    gap={192}
                    lineWidth={1}
                    color="color-mix(in oklab, var(--foreground) 5%, transparent)"
                />

                {visibility.filters && (
                    <Panel
                        position="top-left"
                        className="!m-3 flex w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 sm:!m-4 sm:w-auto"
                    >
                        <div className="min-w-0 flex-1 rounded-2xl bg-card/85 shadow-sm backdrop-blur-md sm:w-72 sm:flex-none">
                            <SearchField
                                id="flow-search"
                                label="Buscar lote"
                                placeholder="Código, produto ou oficina"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                onClear={() => setQuery('')}
                            />
                        </div>
                        <div className="flex h-14 items-center gap-2 rounded-2xl border border-border/80 bg-card/85 px-3 shadow-sm backdrop-blur-md">
                            <Switch
                                id="flow-attention"
                                checked={attention}
                                onCheckedChange={setAttention}
                            />
                            <Label htmlFor="flow-attention" className="text-sm">
                                Atenção
                            </Label>
                        </div>
                        {results && (
                            <div
                                role="status"
                                className="flex h-14 items-center gap-1 rounded-2xl border border-border/80 bg-card/85 px-2 text-sm shadow-sm backdrop-blur-md"
                            >
                                {results.length > 0 ? (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Lote anterior"
                                            onClick={() => step(-1)}
                                        >
                                            <CaretLeftIcon weight="bold" />
                                        </Button>
                                        <span className="tabular-nums">
                                            {currentId ? cursor + 1 : '–'} de{' '}
                                            {results.length}
                                        </span>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label="Próximo lote"
                                            onClick={() => step(1)}
                                        >
                                            <CaretRightIcon weight="bold" />
                                        </Button>
                                    </>
                                ) : (
                                    <span className="px-2 text-muted-foreground">
                                        {attention && !query.trim()
                                            ? 'Nenhum lote parado ou a receber.'
                                            : 'Nenhum lote encontrado.'}
                                    </span>
                                )}
                            </div>
                        )}
                    </Panel>
                )}

                {(errors.version || errors.batch) && (
                    <Panel position="top-center" className="!mt-24 sm:!mt-4">
                        <p
                            role="alert"
                            className="rounded-xl border border-destructive/40 bg-card px-4 py-2 text-sm text-destructive shadow-sm"
                        >
                            {errors.version ?? errors.batch}
                        </p>
                    </Panel>
                )}

                {visibility.stages && (
                    <Panel
                        position="bottom-center"
                        className="!m-0 w-full px-3 pb-3 sm:w-auto sm:max-w-[calc(100%-22rem)] sm:pb-4"
                    >
                        <nav
                            aria-label="Ir para a etapa"
                            className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto rounded-2xl border border-border/80 bg-card/85 p-1.5 shadow-lg backdrop-blur-md"
                        >
                            {stages.map((stage) => (
                                <Button
                                    key={stage.value}
                                    type="button"
                                    variant={
                                        visibleStage === stage.value
                                            ? 'secondary'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    aria-current={
                                        visibleStage === stage.value
                                            ? 'true'
                                            : undefined
                                    }
                                    className="h-11 shrink-0 rounded-xl sm:h-9"
                                    onClick={() => focusStage(stage.value)}
                                >
                                    {stage.label}
                                    <span className="text-muted-foreground tabular-nums">
                                        {stage.pieces.toLocaleString('pt-BR')}
                                    </span>
                                    {stage.stalled_batches > 0 && (
                                        <WarningIcon
                                            className="text-highlight"
                                            aria-label={`${stage.stalled_batches} parados`}
                                        />
                                    )}
                                </Button>
                            ))}
                        </nav>
                    </Panel>
                )}

                {!mobile && (
                    <>
                        {visibility.minimap && (
                            <MiniMap
                                position="bottom-right"
                                pannable
                                zoomable
                                ariaLabel="Mapa do fluxo"
                                style={{ width: 168, height: 104 }}
                                className="!mr-4 !mb-20 overflow-hidden rounded-xl border border-border/80 !bg-card/85 shadow-lg"
                                nodeColor="color-mix(in oklab, var(--foreground) 35%, transparent)"
                                nodeBorderRadius={18}
                                maskColor="color-mix(in oklab, var(--foreground) 6%, transparent)"
                            />
                        )}
                        {visibility.zoom && (
                            <Panel
                                position="bottom-right"
                                className="!m-4 flex gap-1 rounded-2xl border border-border/80 bg-card/85 p-1.5 shadow-lg backdrop-blur-md"
                            >
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Afastar"
                                    onClick={() =>
                                        void reactFlow.zoomOut({ duration })
                                    }
                                >
                                    <MagnifyingGlassMinusIcon />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Aproximar"
                                    onClick={() =>
                                        void reactFlow.zoomIn({ duration })
                                    }
                                >
                                    <MagnifyingGlassPlusIcon />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Ajustar à tela"
                                    onClick={() =>
                                        void reactFlow.fitView({
                                            maxZoom: 1,
                                            padding: 0.12,
                                            duration,
                                        })
                                    }
                                >
                                    <CornersOutIcon />
                                </Button>
                            </Panel>
                        )}
                    </>
                )}
            </ReactFlow>
            {actions.overlays}
        </>
    );
}

ProductionFlow.layout = {
    breadcrumbs: [{ title: 'Fluxo da produção', href: index() }],
};
