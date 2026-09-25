import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Grid2X2,
    Grid3X3,
    ImageOff,
    LayoutGrid,
    ListFilter,
    LoaderCircle,
    MessageCircle,
    Search,
    Shirt,
    ShoppingBag,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import CatalogOrderController from '@/actions/App/Http/Controllers/CatalogOrderController';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { PaperBag } from '@/components/icons/paper-bag';
import ImageCarousel from '@/components/image-carousel';
import InputError from '@/components/input-error';
import ProductImageGallery from '@/components/products/product-image-gallery';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import type {
    CatalogBagStatus,
    CatalogPagination,
    CatalogPreviewProduct,
} from '@/lib/catalog-preview';
import { cn } from '@/lib/utils';
import { catalog as catalogRoute } from '@/routes';

const CATALOG_BAG_STORAGE_KEY = 'catalog-bag';
const CATALOG_GRID_STORAGE_KEY = 'catalog-grid-columns';

type CatalogBagSnapshot = {
    id: number;
    productName?: string;
    productCode?: string;
    volumeName?: string;
    pieces?: number;
};

function catalogOfferTypeLabel(type: string): string {
    return type === 'Reposição' ? 'Grade Reposição' : type;
}

function isValidStoredVolumeId(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isStoredBagSnapshot(value: unknown): value is CatalogBagSnapshot {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        isValidStoredVolumeId(value.id)
    );
}

function readStoredBag(): CatalogBagSnapshot[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const storedValue = window.localStorage.getItem(
            CATALOG_BAG_STORAGE_KEY,
        );

        if (!storedValue) {
            return [];
        }

        const parsedValue: unknown = JSON.parse(storedValue);

        if (!Array.isArray(parsedValue)) {
            return [];
        }

        const snapshots = parsedValue.flatMap((value) => {
            if (isValidStoredVolumeId(value)) {
                return [{ id: value }];
            }

            return isStoredBagSnapshot(value) ? [value] : [];
        });

        return [...new Map(snapshots.map((item) => [item.id, item])).values()];
    } catch {
        return [];
    }
}

function persistBag(snapshots: CatalogBagSnapshot[]): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            CATALOG_BAG_STORAGE_KEY,
            JSON.stringify(snapshots),
        );
    } catch {
        return;
    }
}

function CatalogFilter({
    id,
    label,
    value,
    options,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid min-w-0 gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    id={id}
                    className="h-11 w-full bg-card data-[size=default]:h-11"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as opções</SelectItem>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function ProductPhoto({
    product,
    onOpenSelection,
    onOpenImage,
}: {
    product: CatalogPreviewProduct;
    onOpenSelection: () => void;
    onOpenImage: () => void;
}) {
    const images =
        product.images.length > 0
            ? product.images
            : product.image === null
              ? []
              : [product.image];

    return (
        <div
            className={cn(
                'relative flex items-center justify-center overflow-hidden rounded-t-[1.5rem] bg-muted/60 [&_img]:transition-transform [&_img]:duration-500 [&_img]:ease-out group-hover:[&_img]:scale-[1.035] motion-reduce:[&_img]:transition-none',
                images.length > 0 ? 'aspect-[4/5]' : 'min-h-32 sm:min-h-36',
            )}
        >
            {images.length > 0 ? (
                <ImageCarousel
                    images={images}
                    alt={product.name}
                    previousTestId={`catalog-product-image-previous-${product.id}`}
                    nextTestId={`catalog-product-image-next-${product.id}`}
                    imageTestId={`catalog-product-image-${product.id}`}
                    onImageClick={onOpenImage}
                    imageClickAriaLabel={(index) =>
                        index === 0
                            ? `Ampliar imagem de ${product.name}`
                            : `Ampliar imagem ${index + 1} de ${product.name}`
                    }
                />
            ) : (
                <button
                    type="button"
                    className="flex min-h-32 w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:min-h-36"
                    onClick={onOpenSelection}
                    aria-label={`Imagem indisponível. Ver sacos de ${product.name}`}
                >
                    <ImageOff
                        className="size-7 text-muted-foreground/70"
                        aria-hidden="true"
                    />
                    <span>Produto sem foto</span>
                </button>
            )}
            <span className="absolute right-3 bottom-3 rounded-full border border-white/50 bg-card/90 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                {product.category}
            </span>
        </div>
    );
}

function CatalogProductSkeleton() {
    return (
        <div
            data-testid="catalog-product-skeleton"
            aria-hidden="true"
            className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm"
        >
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="grid gap-4 p-4 sm:p-5">
                <div className="grid gap-2">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-6 w-4/5" />
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-4 w-3/4" />
                    ))}
                </div>
                <div className="grid gap-2">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex gap-1.5">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                                key={index}
                                className="size-8 rounded-lg"
                            />
                        ))}
                    </div>
                </div>
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
}

function sizeComposition(
    sizes: CatalogPreviewProduct['volumes'][number]['sizes'],
) {
    if (!sizes.some(({ quantity }) => quantity !== null)) {
        return null;
    }

    return sizes
        .map(({ size, quantity }) =>
            quantity === null
                ? `${size}: quantidade não informada`
                : `${size}: ${quantity} ${quantity === 1 ? 'pç' : 'pçs'}`,
        )
        .join(' · ');
}

function ProductVolumeOptions({
    product,
    selectedVolumeIds,
    onAddVolume,
    onRemoveVolume,
    className,
}: {
    product: CatalogPreviewProduct;
    selectedVolumeIds: number[];
    onAddVolume: (
        product: CatalogPreviewProduct,
        volume: CatalogPreviewProduct['volumes'][number],
    ) => void;
    onRemoveVolume: (id: number) => void;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'min-h-0 overflow-y-auto overscroll-contain',
                className,
            )}
        >
            <div className="grid gap-3">
                {product.volumes.map((volume) => {
                    const selected = selectedVolumeIds.includes(volume.id);

                    return (
                        <section
                            key={volume.id}
                            className={cn(
                                'grid gap-3 rounded-xl border p-4',
                                selected
                                    ? 'border-highlight bg-primary/5'
                                    : 'border-border',
                            )}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-semibold">{volume.name}</h3>
                                <strong className="tabular-nums">
                                    {volume.pieces} peças
                                </strong>
                            </div>
                            <StockSizeBreakdown sizes={volume.sizes} />
                            <Button
                                variant={selected ? 'secondary' : 'default'}
                                className="h-11 w-full"
                                onClick={() =>
                                    selected
                                        ? onRemoveVolume(volume.id)
                                        : onAddVolume(product, volume)
                                }
                                aria-label={
                                    selected
                                        ? `Remover ${volume.name} da sacola`
                                        : `Adicionar ${volume.name}`
                                }
                            >
                                {selected ? <Trash2 /> : <PaperBag />}
                                {selected ? 'Remover saco' : 'Adicionar saco'}
                            </Button>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

function ProductSelectionActions({
    bagLength,
    onReviewBag,
    onContinue,
}: {
    bagLength: number;
    onReviewBag: () => void;
    onContinue: () => void;
}) {
    return (
        <>
            <Button
                className="h-12"
                onClick={onReviewBag}
                disabled={bagLength === 0}
            >
                Revisar sacola ({bagLength})
            </Button>
            <Button variant="ghost" className="h-11" onClick={onContinue}>
                Continuar escolhendo
            </Button>
        </>
    );
}

type CatalogBagItem = {
    product: CatalogPreviewProduct;
    volume: CatalogPreviewProduct['volumes'][number];
};

function BagItems({
    bag,
    unavailableVolumeIds,
    bagSnapshots,
    onRemoveVolume,
    className,
}: {
    bag: CatalogBagItem[];
    unavailableVolumeIds: number[];
    bagSnapshots: Record<number, CatalogBagSnapshot>;
    onRemoveVolume: (id: number) => void;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'min-h-0 overflow-y-auto overscroll-contain',
                className,
            )}
        >
            {bag.length === 0 && unavailableVolumeIds.length === 0 ? (
                <div className="grid justify-items-center gap-3 py-10 text-center">
                    <ShoppingBag className="size-10 text-muted-foreground" />
                    <p>Sua sacola está vazia.</p>
                </div>
            ) : (
                <>
                    {unavailableVolumeIds.map((volumeId) => {
                        const snapshot = bagSnapshots[volumeId];

                        return (
                            <article
                                key={`unavailable-${volumeId}`}
                                className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                                role="alert"
                            >
                                <div className="grid min-w-0 gap-1">
                                    <h3 className="font-semibold text-destructive">
                                        {snapshot?.productName ??
                                            `Saco selecionado #${volumeId}`}
                                    </h3>
                                    {(snapshot?.productCode ||
                                        snapshot?.volumeName) && (
                                        <p className="text-sm font-medium">
                                            {[
                                                snapshot.productCode,
                                                snapshot.volumeName,
                                                snapshot.pieces === undefined
                                                    ? null
                                                    : `${snapshot.pieces} peças`,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        Este saco deixou de estar disponível.
                                        Remova-o para continuar.
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-11 shrink-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => onRemoveVolume(volumeId)}
                                    aria-label={`Remover saco indisponível ${volumeId} da sacola`}
                                >
                                    <Trash2 />
                                </Button>
                            </article>
                        );
                    })}
                    {bag.map(({ product, volume }) => (
                        <article
                            key={volume.id}
                            className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-border p-4"
                        >
                            <div className="grid min-w-0 gap-1">
                                <h3 className="font-semibold">
                                    {product.name}
                                </h3>
                                <p className="text-sm">
                                    {volume.name} · {volume.pieces} peças
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {sizeComposition(volume.sizes) ??
                                        volume.sizes
                                            .map(({ size }) => size)
                                            .join(' · ')}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 shrink-0"
                                onClick={() => onRemoveVolume(volume.id)}
                                aria-label={`Remover ${volume.name} de ${product.name}`}
                            >
                                <Trash2 />
                            </Button>
                        </article>
                    ))}
                </>
            )}
        </div>
    );
}

function CatalogCheckout({
    bag,
    unavailableVolumeIds,
    canPlaceOrder,
    onOrderConfirmed,
}: {
    bag: CatalogBagItem[];
    unavailableVolumeIds: number[];
    canPlaceOrder: boolean;
    onOrderConfirmed: () => void;
}) {
    const [checkoutResult, setCheckoutResult] = useState<{
        orderCode: string;
        whatsappUrl: string;
    } | null>(null);
    const [whatsappOpened, setWhatsappOpened] = useState(false);
    const [idempotencyKey] = useState(() => {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }

        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    });
    const form = useForm({
        store_name: '',
        requester_name: '',
        whatsapp: '',
        notes: '',
        order: '',
        volume_ids: [] as number[],
        idempotency_key: idempotencyKey,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            volume_ids: bag.map(({ volume }) => volume.id),
        }));
        form.post(CatalogOrderController.url(), {
            onFlash: (flash) => {
                const checkout = flash.checkout as
                    | { orderCode: string; whatsappUrl: string }
                    | undefined;

                if (checkout) {
                    setCheckoutResult(checkout);
                    setWhatsappOpened(false);
                }
            },
        });
    }

    if (checkoutResult) {
        return (
            <div className="grid gap-4 border-t border-border p-4 text-center sm:p-6">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-highlight">
                    <MessageCircle className="size-6" />
                </div>
                <div className="grid gap-2">
                    <h3 className="text-lg font-semibold">
                        Pedido {checkoutResult.orderCode} registrado
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                        Abra o WhatsApp para enviar os detalhes do pedido à
                        equipe.
                    </p>
                </div>
                <Button
                    asChild
                    variant={whatsappOpened ? 'outline' : 'default'}
                    className="h-12 w-full"
                >
                    <a
                        href={checkoutResult.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="finalizar-whatsapp"
                        onClick={() => setWhatsappOpened(true)}
                    >
                        <MessageCircle />
                        Abrir WhatsApp
                    </a>
                </Button>
                <p
                    role="status"
                    aria-live="polite"
                    className="text-center text-xs leading-5 text-muted-foreground"
                >
                    {whatsappOpened
                        ? 'Conversa aberta. Toque em enviar no WhatsApp para concluir o envio.'
                        : 'Abra o WhatsApp para enviar o pedido à equipe.'}
                </p>
                <Button
                    type="button"
                    className="h-12 w-full"
                    disabled={!whatsappOpened}
                    data-testid="confirmar-pedido"
                    onClick={onOrderConfirmed}
                >
                    Concluir pedido
                </Button>
                {!whatsappOpened && (
                    <p className="text-center text-xs leading-5 text-muted-foreground">
                        Depois de abrir o WhatsApp, volte aqui para concluir o
                        pedido.
                    </p>
                )}
            </div>
        );
    }

    return (
        <form
            onSubmit={submit}
            className="grid gap-4 border-t border-border p-4 sm:p-6"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="catalog-store-name">Loja</Label>
                    <Input
                        id="catalog-store-name"
                        value={form.data.store_name}
                        onChange={(event) =>
                            form.setData('store_name', event.target.value)
                        }
                        placeholder="Nome da sua loja"
                        autoComplete="organization"
                        required
                    />
                    <InputError message={form.errors.store_name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="catalog-requester-name">Responsável</Label>
                    <Input
                        id="catalog-requester-name"
                        value={form.data.requester_name}
                        onChange={(event) =>
                            form.setData('requester_name', event.target.value)
                        }
                        placeholder="Seu nome"
                        autoComplete="name"
                        required
                    />
                    <InputError message={form.errors.requester_name} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="catalog-whatsapp">
                        Seu WhatsApp (opcional)
                    </Label>
                    <Input
                        id="catalog-whatsapp"
                        type="tel"
                        inputMode="tel"
                        value={form.data.whatsapp}
                        onChange={(event) =>
                            form.setData('whatsapp', event.target.value)
                        }
                        placeholder="Ex.: 55 11 99999-9999"
                        autoComplete="tel"
                    />
                    <InputError message={form.errors.whatsapp} />
                </div>
            </div>

            <InputError message={form.errors.volume_ids} />
            <InputError message={form.errors.order} />
            <InputError message={form.errors.idempotency_key} />

            {unavailableVolumeIds.length > 0 && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
                    Remova os sacos indisponíveis da sacola antes de registrar o
                    pedido.
                </p>
            )}

            {!canPlaceOrder && (
                <p className="rounded-xl bg-muted p-3 text-sm leading-6 text-muted-foreground">
                    O pedido não pode ser enviado agora. O WhatsApp de
                    atendimento ainda não foi configurado.
                </p>
            )}

            <Button
                type="submit"
                className="h-12 w-full"
                disabled={
                    form.processing ||
                    bag.length === 0 ||
                    unavailableVolumeIds.length > 0 ||
                    !canPlaceOrder
                }
            >
                <MessageCircle />
                {form.processing ? 'Registrando pedido...' : 'Registrar pedido'}
            </Button>
            <p className="text-center text-xs leading-5 text-muted-foreground">
                Depois de registrar o pedido, abra o WhatsApp e toque em enviar
                para concluir o envio.
            </p>
        </form>
    );
}

export default function Catalog({
    products,
    filters,
    categories,
    lines,
    bag: bagStatus,
    canPlaceOrder,
}: {
    products: CatalogPagination;
    filters: {
        search: string;
        category: number | null;
        line: string;
    };
    categories: Array<{ id: number; name: string }>;
    lines: Array<{ value: string; label: string }>;
    bag: CatalogBagStatus;
    canPlaceOrder: boolean;
}) {
    const isMobile = useIsMobile();
    const [query, setQuery] = useState(filters.search);
    const [category, setCategory] = useState(
        filters.category?.toString() ?? 'all',
    );
    const [line, setLine] = useState(filters.line || 'all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [gridColumns, setGridColumns] = useState<3 | 4>(3);
    const [selectedProduct, setSelectedProduct] =
        useState<CatalogPreviewProduct | null>(null);
    const [selectedImageProduct, setSelectedImageProduct] =
        useState<CatalogPreviewProduct | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedVolumeIds, setSelectedVolumeIds] = useState<number[]>([]);
    const [bagSnapshots, setBagSnapshots] = useState<
        Record<number, CatalogBagSnapshot>
    >({});
    const [unavailableVolumeIds, setUnavailableVolumeIds] = useState<number[]>(
        bagStatus.unavailable_volume_ids,
    );
    const [loadedProducts, setLoadedProducts] = useState(products.data);
    const [knownProducts, setKnownProducts] = useState(products.data);
    const [isBagHydrated, setIsBagHydrated] = useState(false);
    const [bagOpen, setBagOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [filtering, setFiltering] = useState(false);
    const filterKey = JSON.stringify({
        search: filters.search,
        category: filters.category,
        line: filters.line,
    });
    const previousFilterKey = useRef(filterKey);
    const loadedPage = useRef(products.meta.current_page);
    const hydratedBag = useRef(false);
    const filterEffectMounted = useRef(false);
    const selectedVolumeIdsRef = useRef<number[]>([]);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(CATALOG_GRID_STORAGE_KEY) === '4') {
                setGridColumns(4);
            }
        } catch {
            return;
        }
    }, []);

    function changeGridColumns(columns: 3 | 4) {
        setGridColumns(columns);

        try {
            window.localStorage.setItem(
                CATALOG_GRID_STORAGE_KEY,
                String(columns),
            );
        } catch {
            return;
        }
    }

    useEffect(() => {
        if (hydratedBag.current) {
            return;
        }

        hydratedBag.current = true;
        const storedBag = readStoredBag();
        const storedVolumeIds = storedBag.map(({ id }) => id);

        setSelectedVolumeIds(storedVolumeIds);
        setBagSnapshots(
            Object.fromEntries(
                storedBag.map((snapshot) => [snapshot.id, snapshot]),
            ),
        );
        selectedVolumeIdsRef.current = storedVolumeIds;
        setIsBagHydrated(true);

        if (storedVolumeIds.length > 0) {
            router.reload({
                data: { bag: storedVolumeIds },
                only: ['bag'],
            });
        }
    }, []);

    useEffect(() => {
        setUnavailableVolumeIds(bagStatus.unavailable_volume_ids);
    }, [bagStatus]);

    useEffect(() => {
        const currentPage = products.meta.current_page;
        const isNewFilter = previousFilterKey.current !== filterKey;

        setKnownProducts((currentProducts) => {
            const productMap = new Map(
                currentProducts.map((product) => [product.id, product]),
            );

            products.data.forEach((product) =>
                productMap.set(product.id, product),
            );
            bagStatus.products.forEach((product) => {
                const currentProduct = productMap.get(product.id);

                productMap.set(
                    product.id,
                    currentProduct
                        ? {
                              ...currentProduct,
                              volumes: [
                                  ...currentProduct.volumes.filter(
                                      (volume) =>
                                          !product.volumes.some(
                                              (bagVolume) =>
                                                  bagVolume.id === volume.id,
                                          ),
                                  ),
                                  ...product.volumes,
                              ],
                          }
                        : product,
                );
            });

            return [...productMap.values()];
        });

        if (isNewFilter || currentPage === 1) {
            setLoadedProducts(products.data);
        } else if (currentPage > loadedPage.current) {
            setLoadedProducts((currentProducts) => {
                const productMap = new Map(
                    currentProducts.map((product) => [product.id, product]),
                );

                products.data.forEach((product) =>
                    productMap.set(product.id, product),
                );

                return [...productMap.values()];
            });
        }

        previousFilterKey.current = filterKey;
        loadedPage.current = currentPage;
    }, [bagStatus.products, filterKey, products]);

    useEffect(() => {
        if (!filterEffectMounted.current) {
            filterEffectMounted.current = true;

            return;
        }

        const timeout = window.setTimeout(() => {
            setFiltering(true);
            router.get(
                catalogRoute.url({
                    query: {
                        search: query || undefined,
                        category:
                            category === 'all' ? undefined : Number(category),
                        line: line === 'all' ? undefined : line,
                        bag: selectedVolumeIdsRef.current,
                    },
                }),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                    onFinish: () => setFiltering(false),
                },
            );
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [category, line, query]);

    useEffect(() => {
        selectedVolumeIdsRef.current = selectedVolumeIds;

        if (!isBagHydrated) {
            return;
        }

        persistBag(
            selectedVolumeIds.map(
                (id): CatalogBagSnapshot => bagSnapshots[id] ?? { id },
            ),
        );
    }, [bagSnapshots, isBagHydrated, selectedVolumeIds]);

    const unavailableIds = new Set(unavailableVolumeIds);
    const bag: CatalogBagItem[] = knownProducts.flatMap((product) =>
        product.volumes
            .filter(
                (volume) =>
                    selectedVolumeIds.includes(volume.id) &&
                    !unavailableIds.has(volume.id),
            )
            .map((volume) => ({ product, volume })),
    );
    const totalPieces = bag.reduce((sum, item) => sum + item.volume.pieces, 0);
    const bagDescription = selectedVolumeIds.length
        ? `${selectedVolumeIds.length} ${selectedVolumeIds.length === 1 ? 'saco' : 'sacos'} · ${totalPieces} ${unavailableVolumeIds.length > 0 ? 'peças disponíveis' : 'peças no total'}`
        : 'Escolha os sacos para reabastecer sua loja.';
    const filterCount = [category, line].filter(
        (value) => value !== 'all',
    ).length;
    const hasFilters = query !== '' || filterCount > 0;

    function openProductImage(product: CatalogPreviewProduct) {
        setSelectedImageIndex(0);
        setSelectedImageProduct(product);
    }

    function clearFilters() {
        setQuery('');
        setCategory('all');
        setLine('all');
    }

    function addVolume(
        product: CatalogPreviewProduct,
        volume: CatalogPreviewProduct['volumes'][number],
    ) {
        const id = volume.id;

        setBagSnapshots((current) => ({
            ...current,
            [id]: {
                id,
                productName: product.name,
                productCode: product.code,
                volumeName: volume.name,
                pieces: volume.pieces,
            },
        }));
        setSelectedVolumeIds((current) =>
            current.includes(id) ? current : [...current, id],
        );
        setFeedback('Saco adicionado à sacola.');
    }

    function removeVolume(id: number) {
        setSelectedVolumeIds((current) =>
            current.filter((item) => item !== id),
        );
        setUnavailableVolumeIds((current) =>
            current.filter((item) => item !== id),
        );
        setBagSnapshots((current) => {
            const next = { ...current };
            delete next[id];

            return next;
        });
        setFeedback('Saco removido da sacola.');
    }

    function confirmOrder() {
        setSelectedVolumeIds([]);
        setBagSnapshots({});
        setUnavailableVolumeIds([]);
        setBagOpen(false);
        setFeedback('Pedido concluído. A conversa do WhatsApp foi aberta.');
    }

    function loadMore() {
        if (!products.meta.next_page_url || loadingMore) {
            return;
        }

        setLoadingMore(true);
        router.get(
            products.meta.next_page_url,
            { bag: selectedVolumeIdsRef.current },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['products'],
                onSuccess: (page) => {
                    const nextProducts = page.props
                        .products as CatalogPagination;

                    setLoadedProducts((currentProducts) => {
                        const productMap = new Map(
                            currentProducts.map((product) => [
                                product.id,
                                product,
                            ]),
                        );

                        nextProducts.data.forEach((product) =>
                            productMap.set(product.id, product),
                        );

                        return [...productMap.values()];
                    });
                    loadedPage.current = nextProducts.meta.current_page;
                },
                onFinish: () => setLoadingMore(false),
            },
        );
    }

    return (
        <>
            <Head title="Catálogo para lojistas" />
            <div className="ds-ambient min-h-svh bg-background text-foreground selection:bg-primary/30">
                <a
                    href="#produtos"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
                >
                    Ir para os produtos
                </a>
                <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 shadow-sm shadow-foreground/5 backdrop-blur-xl">
                    <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                        <a
                            href="#produtos"
                            aria-label="Crônicas Jeans — catálogo"
                            className="min-w-0"
                        >
                            <img
                                src="/images/brand/logo-cronicas-color.png"
                                alt="Crônicas Jeans"
                                className="h-10 w-auto object-contain sm:h-12 dark:hidden"
                            />
                            <img
                                src="/images/brand/logo-cronicas-white.png"
                                alt="Crônicas Jeans"
                                className="hidden h-10 w-auto object-contain sm:h-12 dark:block"
                            />
                        </a>
                        <div className="flex shrink-0 items-center gap-2">
                            <AppearanceToggleTab
                                collapsed
                                dropdownSide="bottom"
                            />
                            <Button
                                variant="secondary"
                                className="h-11 gap-2"
                                onClick={() => setBagOpen(true)}
                                aria-label={`Ver sacola, ${selectedVolumeIds.length} sacos`}
                            >
                                <ShoppingBag aria-hidden="true" />
                                <span>Sacola</span>
                                <span
                                    className="flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground transition-transform duration-200 motion-reduce:transition-none"
                                    key={selectedVolumeIds.length}
                                >
                                    {selectedVolumeIds.length}
                                </span>
                            </Button>
                        </div>
                    </div>
                </header>

                <main
                    id="produtos"
                    className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-5 pb-12 sm:px-6 sm:pt-8 lg:px-8"
                >
                    <div className="ds-reveal relative flex flex-col gap-3 overflow-hidden rounded-[2rem] border border-border/70 bg-card px-5 py-8 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-10">
                        <div className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full border-[32px] border-primary/15" />
                        <div className="pointer-events-none absolute right-24 -bottom-24 size-48 rounded-full bg-brand-expressive/10 blur-3xl" />
                        <div className="grid gap-2">
                            <p className="ds-eyebrow relative text-highlight">
                                Crônicas Jeans · para lojistas
                            </p>
                            <h1 className="ds-display relative max-w-2xl text-4xl sm:text-5xl">
                                Reabasteça sua loja
                            </h1>
                            <p className="relative max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                                Encontre a peça e escolha os sacos com os
                                tamanhos que sua loja precisa.
                            </p>
                        </div>
                    </div>

                    <section
                        aria-label="Buscar e filtrar produtos"
                        className="ds-reveal mt-6 mb-3 rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-sm [--reveal-delay:60ms] sm:p-5"
                    >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                            <div className="flex items-end gap-3 sm:contents">
                                <div className="grid min-w-0 flex-1 gap-2">
                                    <Label htmlFor="catalog-search">
                                        Buscar produtos
                                    </Label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
                                        <Input
                                            id="catalog-search"
                                            type="search"
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Nome, modelo ou código"
                                            className="h-11 bg-card pl-10 text-base"
                                        />
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="relative size-11 shrink-0 sm:hidden"
                                    aria-expanded={filtersOpen}
                                    aria-controls="catalog-filters"
                                    aria-label={`${filtersOpen ? 'Fechar' : 'Abrir'} opções de busca${filterCount > 0 ? `, ${filterCount} selecionadas` : ''}`}
                                    title="Mais opções de busca"
                                    data-testid="catalog-filters-trigger"
                                    onClick={() =>
                                        setFiltersOpen((current) => !current)
                                    }
                                >
                                    <ListFilter aria-hidden="true" />
                                    {filterCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-5 font-bold text-primary-foreground">
                                            {filterCount}
                                        </span>
                                    )}
                                </Button>
                            </div>
                            <div
                                id="catalog-filters"
                                className={cn(
                                    'contents',
                                    !filtersOpen && 'hidden sm:contents',
                                )}
                            >
                                <CatalogFilter
                                    id="catalog-category"
                                    label="Categoria"
                                    value={category}
                                    options={categories.map((option) => ({
                                        value: option.id.toString(),
                                        label: option.name,
                                    }))}
                                    onChange={setCategory}
                                />
                                <CatalogFilter
                                    id="catalog-line"
                                    label="Linha"
                                    value={line}
                                    options={lines.map((option) => ({
                                        value: option.value,
                                        label: option.label,
                                    }))}
                                    onChange={setLine}
                                />
                            </div>
                            <div
                                className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-sm text-muted-foreground sm:col-span-3"
                                aria-busy={filtering}
                            >
                                <p
                                    role="status"
                                    className="flex items-center gap-2"
                                >
                                    {filtering && (
                                        <LoaderCircle
                                            className="size-4 animate-spin"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <strong className="text-foreground">
                                        {products.meta.total}
                                    </strong>{' '}
                                    {products.meta.total === 1
                                        ? 'encontrado'
                                        : 'encontrados'}
                                </p>
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                    >
                                        <X /> Limpar filtros
                                    </Button>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="mb-4 hidden justify-end xl:flex">
                        <div
                            role="group"
                            aria-label="Colunas do catálogo"
                            className="flex items-center gap-1 rounded-xl border border-border bg-card p-1"
                        >
                            <button
                                type="button"
                                aria-label="Visualizar 3 produtos por linha"
                                aria-pressed={gridColumns === 3}
                                onClick={() => changeGridColumns(3)}
                                className={cn(
                                    'ds-press flex size-9 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                    gridColumns === 3 &&
                                        'bg-secondary text-foreground shadow-sm',
                                )}
                            >
                                <Grid2X2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </button>
                            <button
                                type="button"
                                aria-label="Visualizar 4 produtos por linha"
                                aria-pressed={gridColumns === 4}
                                onClick={() => changeGridColumns(4)}
                                className={cn(
                                    'ds-press flex size-9 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                    gridColumns === 4 &&
                                        'bg-secondary text-foreground shadow-sm',
                                )}
                            >
                                <Grid3X3
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    </div>
                    {filtering ? (
                        <div
                            className={cn(
                                'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3',
                                gridColumns === 4 && 'xl:grid-cols-4 xl:gap-4',
                            )}
                            aria-busy="true"
                            aria-label="Carregando produtos"
                        >
                            {Array.from({
                                length: gridColumns === 4 ? 4 : 3,
                            }).map((_, index) => (
                                <CatalogProductSkeleton key={index} />
                            ))}
                        </div>
                    ) : loadedProducts.length === 0 ? (
                        <div className="ds-reveal grid justify-items-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-card px-4 py-16 text-center">
                            <Search className="size-8 text-muted-foreground" />
                            <h2 className="text-xl font-semibold">
                                Nenhum produto encontrado
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Tente outro nome ou remova os filtros.
                            </p>
                            <Button
                                className="mt-2 h-11"
                                onClick={clearFilters}
                            >
                                Ver todos os produtos
                            </Button>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3',
                                gridColumns === 4 && 'xl:grid-cols-4 xl:gap-4',
                            )}
                        >
                            {loadedProducts.map((product, index) => {
                                const selectedCount = product.volumes.filter(
                                    (volume) =>
                                        selectedVolumeIds.includes(volume.id),
                                ).length;
                                const sizes = [
                                    ...new Set(
                                        product.volumes.flatMap((volume) =>
                                            volume.sizes.map(
                                                ({ size }) => size,
                                            ),
                                        ),
                                    ),
                                ];

                                return (
                                    <article
                                        key={product.id}
                                        data-testid="catalog-product"
                                        className={cn(
                                            'group ds-reveal ds-lift flex min-w-0 flex-col rounded-[1.5rem] border bg-card shadow-sm',
                                            selectedCount > 0
                                                ? 'border-highlight'
                                                : 'border-border hover:border-input',
                                        )}
                                        style={
                                            {
                                                '--reveal-delay': `${Math.min(index, 5) * 55}ms`,
                                            } as CSSProperties
                                        }
                                    >
                                        <ProductPhoto
                                            product={product}
                                            onOpenSelection={() =>
                                                setSelectedProduct(product)
                                            }
                                            onOpenImage={() =>
                                                openProductImage(product)
                                            }
                                        />
                                        <div
                                            className={cn(
                                                'flex flex-1 flex-col gap-0 p-4 sm:p-5',
                                                gridColumns === 4 && 'xl:p-4',
                                            )}
                                        >
                                            <div>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {product.code}
                                                    {product.model &&
                                                        ` · Mod. ${product.model}`}
                                                </p>
                                                <h2
                                                    className={cn(
                                                        'ds-display mt-1 text-xl leading-snug',
                                                        gridColumns === 4 &&
                                                            'xl:text-lg',
                                                    )}
                                                >
                                                    {product.name}
                                                </h2>
                                            </div>
                                            <TooltipProvider>
                                                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                                                    <div className="contents">
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <span
                                                                    tabIndex={0}
                                                                    className="inline-flex min-w-0 items-center gap-1.5 font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                >
                                                                    <LayoutGrid
                                                                        className="size-4"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {catalogOfferTypeLabel(
                                                                        product.type,
                                                                    )}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Disponibilidade
                                                                do estoque
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        {product.line && (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <span
                                                                        tabIndex={
                                                                            0
                                                                        }
                                                                        className="row-start-2 inline-flex min-w-0 items-center gap-1.5 font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                    >
                                                                        <Tag
                                                                            className="size-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                        Linha{' '}
                                                                        {
                                                                            product.line
                                                                        }
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Linha
                                                                    comercial
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <div className="contents">
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <span
                                                                    tabIndex={0}
                                                                    className="col-start-2 row-start-1 inline-flex min-w-0 items-center gap-1.5 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                >
                                                                    <PaperBag
                                                                        className="size-4 scale-[1.35]"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {
                                                                        product
                                                                            .volumes
                                                                            .length
                                                                    }{' '}
                                                                    {product
                                                                        .volumes
                                                                        .length ===
                                                                    1
                                                                        ? 'saco'
                                                                        : 'sacos'}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Quantidade de
                                                                sacos
                                                                disponíveis
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <span
                                                                    tabIndex={0}
                                                                    className="col-start-2 row-start-2 inline-flex min-w-0 items-center gap-1.5 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                >
                                                                    <Shirt
                                                                        className="size-4"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {product.volumes.reduce(
                                                                        (
                                                                            sum,
                                                                            volume,
                                                                        ) =>
                                                                            sum +
                                                                            volume.pieces,
                                                                        0,
                                                                    )}{' '}
                                                                    peças
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Total de peças
                                                                nos sacos
                                                                disponíveis
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </TooltipProvider>
                                            <div className="mt-4 grid gap-2">
                                                {sizes.length > 0 ? (
                                                    <>
                                                        <p className="text-sm text-muted-foreground">
                                                            Tamanhos
                                                        </p>
                                                        <div
                                                            className={cn(
                                                                'flex flex-nowrap gap-1.5 overflow-x-auto pb-1',
                                                                gridColumns ===
                                                                    4 &&
                                                                    'xl:gap-1',
                                                            )}
                                                            aria-label="Tamanhos presentes"
                                                        >
                                                            {sizes.map(
                                                                (size) => (
                                                                    <span
                                                                        key={
                                                                            size
                                                                        }
                                                                        className={cn(
                                                                            'inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted px-1.5 py-0 text-xs font-semibold whitespace-nowrap tabular-nums',
                                                                            gridColumns ===
                                                                                4 &&
                                                                                'xl:h-7 xl:min-w-7 xl:rounded-md xl:px-1',
                                                                        )}
                                                                    >
                                                                        {size}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span
                                                        aria-label="Tamanhos não informados"
                                                        className="inline-flex w-fit items-center rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                                                    >
                                                        Tamanhos não informados
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-auto pt-4">
                                                <Button
                                                    className={cn(
                                                        'h-12 w-full',
                                                        gridColumns === 4 &&
                                                            'xl:h-11',
                                                    )}
                                                    onClick={() =>
                                                        setSelectedProduct(
                                                            product,
                                                        )
                                                    }
                                                    aria-label={`Adicionar ${product.name} ao pedido`}
                                                >
                                                    {selectedCount > 0 ? (
                                                        <Check />
                                                    ) : (
                                                        <PaperBag />
                                                    )}
                                                    {selectedCount > 0 ? (
                                                        <>
                                                            <span
                                                                className={cn(
                                                                    gridColumns ===
                                                                        4 &&
                                                                        'xl:hidden',
                                                                )}
                                                            >
                                                                Ver sacos ·{' '}
                                                                {selectedCount}{' '}
                                                                na sacola
                                                            </span>
                                                            {gridColumns ===
                                                                4 && (
                                                                <span className="hidden xl:inline">
                                                                    Ver sacos ·{' '}
                                                                    {
                                                                        selectedCount
                                                                    }
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        'Adicionar ao pedido'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    {products.meta.current_page < products.meta.last_page && (
                        <div className="mt-8 flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore
                                    ? 'Carregando...'
                                    : 'Carregar mais produtos'}
                            </Button>
                        </div>
                    )}
                    <footer className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
                        <p>Crônicas Jeans · Distribuição de estoque</p>
                    </footer>
                </main>
                <p role="status" aria-live="polite" className="sr-only">
                    {feedback}
                </p>

                <ProductImageGallery
                    product={
                        selectedImageProduct
                            ? {
                                  id: selectedImageProduct.id,
                                  name: selectedImageProduct.name,
                                  images: (selectedImageProduct.images.length >
                                  0
                                      ? selectedImageProduct.images
                                      : selectedImageProduct.image
                                        ? [selectedImageProduct.image]
                                        : []
                                  ).map((url, index) => ({
                                      id: index + 1,
                                      url,
                                      thumb_url: url,
                                  })),
                              }
                            : null
                    }
                    open={selectedImageProduct !== null}
                    selectedIndex={selectedImageIndex}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedImageProduct(null);
                        }
                    }}
                    onSelectedIndexChange={setSelectedImageIndex}
                />

                {isMobile ? (
                    <Drawer
                        open={selectedProduct !== null}
                        onOpenChange={(open) => {
                            if (!open) {
                                setSelectedProduct(null);
                            }
                        }}
                    >
                        <DrawerContent className="mx-auto max-w-2xl">
                            <DrawerHeader className="relative shrink-0 pr-16 text-left">
                                <DrawerTitle>
                                    {selectedProduct?.name ?? 'Escolher sacos'}
                                </DrawerTitle>
                                <DrawerDescription>
                                    Escolha os sacos completos. Os tamanhos
                                    mostram o conteúdo de cada saco.
                                </DrawerDescription>
                                <DrawerClose asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-4 right-4 size-11"
                                        aria-label="Fechar seleção de sacos"
                                    >
                                        <X />
                                    </Button>
                                </DrawerClose>
                            </DrawerHeader>
                            {selectedProduct && (
                                <ProductVolumeOptions
                                    product={selectedProduct}
                                    selectedVolumeIds={selectedVolumeIds}
                                    onAddVolume={addVolume}
                                    onRemoveVolume={removeVolume}
                                    className="px-4 pb-5 sm:px-6"
                                />
                            )}
                            <DrawerFooter className="shrink-0 border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
                                <ProductSelectionActions
                                    bagLength={selectedVolumeIds.length}
                                    onReviewBag={() => {
                                        setSelectedProduct(null);
                                        setBagOpen(true);
                                    }}
                                    onContinue={() => setSelectedProduct(null)}
                                />
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                ) : (
                    <Sheet
                        open={selectedProduct !== null}
                        onOpenChange={(open) => {
                            if (!open) {
                                setSelectedProduct(null);
                            }
                        }}
                    >
                        <SheetContent
                            side="right"
                            className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg"
                        >
                            <SheetHeader className="relative shrink-0 border-b border-border px-6 py-5 pr-16 text-left">
                                <SheetTitle className="text-xl">
                                    {selectedProduct?.name ?? 'Escolher sacos'}
                                </SheetTitle>
                                <SheetDescription>
                                    Escolha os sacos completos. Os tamanhos
                                    mostram o conteúdo de cada saco.
                                </SheetDescription>
                            </SheetHeader>
                            {selectedProduct && (
                                <ProductVolumeOptions
                                    product={selectedProduct}
                                    selectedVolumeIds={selectedVolumeIds}
                                    onAddVolume={addVolume}
                                    onRemoveVolume={removeVolume}
                                    className="flex-1 px-6 py-5"
                                />
                            )}
                            <SheetFooter className="shrink-0 flex-col border-t border-border p-6 sm:flex-col sm:justify-start">
                                <ProductSelectionActions
                                    bagLength={selectedVolumeIds.length}
                                    onReviewBag={() => {
                                        setSelectedProduct(null);
                                        setBagOpen(true);
                                    }}
                                    onContinue={() => setSelectedProduct(null)}
                                />
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                )}

                {isMobile ? (
                    <Drawer open={bagOpen} onOpenChange={setBagOpen}>
                        <DrawerContent className="mx-auto max-w-2xl">
                            <DrawerHeader className="relative shrink-0 pr-16 text-left">
                                <DrawerTitle>Sua sacola</DrawerTitle>
                                <DrawerDescription>
                                    {bagDescription}
                                </DrawerDescription>
                                <DrawerClose asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-4 right-4 size-11"
                                        aria-label="Fechar sacola"
                                    >
                                        <X />
                                    </Button>
                                </DrawerClose>
                            </DrawerHeader>
                            <BagItems
                                bag={bag}
                                unavailableVolumeIds={unavailableVolumeIds}
                                bagSnapshots={bagSnapshots}
                                onRemoveVolume={removeVolume}
                                className="px-4 pb-5 sm:px-6"
                            />
                            <CatalogCheckout
                                bag={bag}
                                unavailableVolumeIds={unavailableVolumeIds}
                                canPlaceOrder={canPlaceOrder}
                                onOrderConfirmed={confirmOrder}
                            />
                        </DrawerContent>
                    </Drawer>
                ) : (
                    <Sheet open={bagOpen} onOpenChange={setBagOpen}>
                        <SheetContent
                            side="right"
                            className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg"
                        >
                            <SheetHeader className="relative shrink-0 border-b border-border px-6 py-5 pr-16 text-left">
                                <SheetTitle className="text-xl">
                                    Sua sacola
                                </SheetTitle>
                                <SheetDescription>
                                    {bagDescription}
                                </SheetDescription>
                            </SheetHeader>
                            <BagItems
                                bag={bag}
                                unavailableVolumeIds={unavailableVolumeIds}
                                bagSnapshots={bagSnapshots}
                                onRemoveVolume={removeVolume}
                                className="flex-1 px-6 py-5"
                            />
                            <CatalogCheckout
                                bag={bag}
                                unavailableVolumeIds={unavailableVolumeIds}
                                canPlaceOrder={canPlaceOrder}
                                onOrderConfirmed={confirmOrder}
                            />
                        </SheetContent>
                    </Sheet>
                )}
            </div>
        </>
    );
}
