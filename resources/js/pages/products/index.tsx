import { Pagination } from '@/components/pagination';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { ProductImageButton } from '@/components/products/product-image';
import {
    ProductClassification,
    productLineLabels,
} from '@/components/products/product-classification';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowsClockwiseIcon,
    CaretRightIcon,
    CheckCircleIcon,
    DotsThreeIcon,
    FolderSimpleIcon,
    HashIcon,
    ImageBrokenIcon,
    ImageIcon,
    ImagesIcon,
    InfoIcon,
    ListBulletsIcon,
    PackageIcon,
    PencilSimpleIcon,
    PlusCircleIcon,
    ProhibitInsetIcon,
    RowsIcon,
    SparkleIcon,
    SquaresFourIcon,
    TShirtIcon,
    TableIcon,
    TagIcon,
    TrashIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { WashTypeCreateDialog } from '@/components/wash-types/wash-type-create-dialog';
import { destroy } from '@/actions/App/Http/Controllers/ProductController';
import { Badge } from '@/components/ui/badge';
import {
    categoryFilterField,
    washTypeFilterField,
    lineFilterField,
} from '@/components/products/product-filter-fields';
import { StockQuantityDetails } from '@/components/products/stock-quantity-details';
import {
    SearchFilterBar,
    type FilterField,
} from '@/components/search-filter-bar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from '@/components/ui/popover';
import TextLink from '@/components/text-link';
import ProductImageGallery from '@/components/products/product-image-gallery';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    index as productsIndex,
    edit as productEdit,
    create as productCreate,
} from '@/routes/products';
import type {
    Category,
    Paginated,
    Product,
    StockOfferType,
    WashType,
} from '@/types';

export type ProductsIndexProps = {
    products: Paginated<Product>;
    filters: {
        search: string;
        category: number | null;
        wash_type: number | null;
        line: string;
        stock_offer_type: string;
        image: string;
        status: 'active' | 'inactive' | 'all';
    };
    categories: Category[];
    washTypes: WashType[];
};

type ProductCardVariant = 'default' | 'refined' | 'v3';

type ProductsIndexComponentProps = ProductsIndexProps & {
    cardVariant?: ProductCardVariant;
    indexUrl?: string;
};

type ProductView = 'table' | 'cards' | 'compact';

const productViewStorageKey = 'products-index-view';

function isProductView(value: unknown): value is ProductView {
    return value === 'table' || value === 'cards' || value === 'compact';
}

type ProductFilterValues = {
    search: string;
    category: string;
    wash_type: string;
    line: string;
    stock_offer_type: string;
    image: string;
    status: string;
};

function productSizes(product: Product): string[] {
    return Array.from(
        new Set(
            product.stock_volumes.flatMap((volume) =>
                volume.items.map((item) => item.size),
            ),
        ),
    );
}

function productSizeBreakdown(
    product: Product,
): Array<{ size: string; quantity: number | null }> {
    const sizes = new Map<string, number | null>();

    product.stock_volumes
        .filter((volume) => volume.status === 'Disponível')
        .forEach((volume) => {
            volume.items
                .filter((item) => item.is_active)
                .forEach((item) => {
                    const currentQuantity = sizes.get(item.size);

                    sizes.set(
                        item.size,
                        currentQuantity === undefined
                            ? item.quantity
                            : currentQuantity === null || item.quantity === null
                              ? null
                              : currentQuantity + item.quantity,
                    );
                });
        });

    return Array.from(sizes, ([size, quantity]) => ({ size, quantity }));
}

const stockOfferTypeCardLabels: Record<StockOfferType, string> = {
    replenishment: 'Reposição',
    new_grade: 'Grade Nova',
    broken_grade: 'Grade Furada',
};

function productClassificationLabels(product: Product): string {
    return [
        product.category?.name,
        product.wash_type?.name,
        product.line ? productLineLabels[product.line] : null,
    ]
        .filter((label): label is string => label !== null)
        .join(' · ');
}

function RefinedProductCard({
    product,
    onDelete,
    onOpenGallery,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
}) {
    const availableQuantity = product.available_quantity ?? 0;
    const physicalQuantity = product.physical_quantity ?? 0;
    const reservedQuantity = product.reserved_quantity ?? 0;
    const consumedQuantity = product.consumed_quantity ?? 0;
    const availableVolumeCount = product.available_stock_volume_count ?? 0;
    const hasStock =
        product.total_quantity !== null && product.total_quantity !== undefined;
    const isAvailable =
        Boolean(product.is_active) &&
        Boolean(product.available_for_distribution);
    const statusLabel = !product.is_active
        ? 'Inativo'
        : product.available_for_distribution
          ? 'Disponível'
          : product.stock_offer_type === 'new_grade'
            ? 'Uso interno'
            : 'Indisponível';
    const classification = productClassificationLabels(product);
    const sizes = productSizeBreakdown(product);
    const showSizesLabel = sizes.some(({ quantity }) => quantity !== null);

    return (
        <article
            data-testid="product-card-refined"
            className="group flex min-w-0 gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-ring hover:border-foreground/20 hover:shadow-md sm:gap-4 sm:p-4"
        >
            <div className="aspect-[4/5] w-20 shrink-0 self-start overflow-hidden rounded-xl border border-border bg-featured-card sm:w-24 lg:w-28">
                <ProductImageButton
                    product={product}
                    onOpenGallery={onOpenGallery}
                    showImageCount={false}
                    className="transition-transform duration-300 group-hover:scale-105"
                    iconClassName="size-6"
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="min-w-0">
                    <TextLink
                        href={productEdit(product.id)}
                        className="line-clamp-2 rounded-sm text-base leading-6 font-semibold tracking-tight text-card-foreground no-underline hover:underline sm:text-lg"
                    >
                        {product.name}
                    </TextLink>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {product.code}
                        {product.model && ` · Mod. ${product.model}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                        variant="outline"
                        className={cn(
                            'rounded-full',
                            isAvailable
                                ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-400'
                                : 'border-border bg-muted text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 shrink-0 rounded-full',
                                isAvailable
                                    ? 'bg-emerald-600 dark:bg-emerald-400'
                                    : 'bg-muted-foreground',
                            )}
                            aria-hidden="true"
                        />
                        {statusLabel}
                    </Badge>
                    {product.stock_offer_type && (
                        <Badge variant="secondary" className="rounded-full">
                            {stockOfferTypeCardLabels[product.stock_offer_type]}
                        </Badge>
                    )}
                    {classification && (
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {classification}
                        </span>
                    )}
                </div>

                <div className="grid gap-1.5">
                    {showSizesLabel && (
                        <p className="text-xs text-muted-foreground">
                            Tamanhos
                        </p>
                    )}
                    <StockSizeBreakdown sizes={sizes} compact />
                </div>

                {product.notes && (
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {product.notes}
                    </p>
                )}

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
                    <div className="min-w-0">
                        {hasStock ? (
                            <>
                                <p className="text-sm font-semibold text-card-foreground tabular-nums">
                                    {availableQuantity} peças disponíveis
                                </p>
                                <StockQuantityDetails
                                    className="mt-1 text-muted-foreground"
                                    physicalQuantity={physicalQuantity}
                                    availableSackCount={availableVolumeCount}
                                    reservedQuantity={reservedQuantity}
                                    consumedQuantity={consumedQuantity}
                                />
                            </>
                        ) : (
                            <p className="text-sm font-semibold text-muted-foreground">
                                Sem oferta de estoque
                            </p>
                        )}
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${product.name}`}
                        >
                            <Link href={productEdit(product.id)}>
                                <PencilSimpleIcon />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(product)}
                            aria-label={`Excluir ${product.name}`}
                        >
                            <TrashIcon />
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={productEdit(product.id)}>
                                <PencilSimpleIcon />
                                Editar
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
}

function ProductCardV3({
    product,
    onDelete,
    onOpenGallery,
    compact = false,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
    /** Densidade para duas colunas no celular; mantém o mesmo conteúdo e ações. */
    compact?: boolean;
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const availableQuantity = product.available_quantity ?? 0;
    const physicalQuantity = product.physical_quantity ?? 0;
    const reservedQuantity = product.reserved_quantity ?? 0;
    const consumedQuantity = product.consumed_quantity ?? 0;
    const availableVolumeCount = product.available_stock_volume_count ?? 0;
    const hasStock =
        product.total_quantity !== null && product.total_quantity !== undefined;
    const isAvailable =
        Boolean(product.is_active) &&
        Boolean(product.available_for_distribution);
    const isInternalUse =
        Boolean(product.is_active) && product.stock_offer_type === 'new_grade';
    const volumes = product.stock_volumes;

    return (
        <article
            data-testid={compact ? 'product-card-compact' : 'product-card-v3'}
            aria-label={product.name}
            className={cn(
                'group flex min-w-0 flex-col overflow-hidden border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-foreground/20 hover:shadow-md',
                compact ? 'rounded-2xl' : 'rounded-[1.5rem]',
            )}
        >
            <div
                className={cn(
                    'relative overflow-hidden bg-muted/60',
                    compact ? 'aspect-square' : 'aspect-[6/5]',
                    !product.is_active && '[&_img]:grayscale',
                )}
            >
                <ProductImageButton
                    product={product}
                    onOpenGallery={onOpenGallery}
                    carousel
                    dense={compact}
                    iconClassName="size-8"
                />
                {product.notes && (
                    <Popover modal={false}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'absolute z-10 flex items-center justify-center rounded-full border border-white/50 bg-card/90 text-foreground shadow-sm backdrop-blur transition hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                    compact
                                        ? 'top-2 right-2 size-8'
                                        : 'top-3 right-3 size-9',
                                )}
                                aria-label={`Ver observação de ${product.name}`}
                            >
                                <InfoIcon
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            side="bottom"
                            sideOffset={8}
                            className="w-64"
                        >
                            <PopoverHeader>
                                <PopoverTitle>
                                    Observação do produto
                                </PopoverTitle>
                                <PopoverDescription className="whitespace-pre-wrap">
                                    {product.notes}
                                </PopoverDescription>
                            </PopoverHeader>
                        </PopoverContent>
                    </Popover>
                )}
                {!compact && product.category && (
                    <span
                        className={cn(
                            'pointer-events-none absolute truncate rounded-full border border-white/50 bg-card/90 font-semibold shadow-sm backdrop-blur',
                            'bottom-3 left-3 max-w-[calc(100%-1.5rem)] px-3 py-1 text-xs',
                        )}
                    >
                        {product.category.name}
                    </span>
                )}
            </div>

            <div
                className={cn(
                    'flex flex-1 flex-col',
                    compact ? 'gap-2.5 p-3 sm:p-4' : 'gap-3 p-4 sm:p-5',
                )}
            >
                <div className="min-w-0">
                    <p className="truncate font-mono text-xs leading-4 text-muted-foreground">
                        {product.code}
                        {!compact &&
                            product.model &&
                            ` · Mod. ${product.model}`}
                    </p>
                    <TextLink
                        href={productEdit(product.id)}
                        className={cn(
                            'line-clamp-2 rounded-sm font-semibold tracking-tight text-card-foreground no-underline hover:underline',
                            compact
                                ? 'text-[0.9375rem] leading-5 sm:text-lg sm:leading-6'
                                : 'text-lg leading-6',
                        )}
                    >
                        {product.name}
                    </TextLink>
                </div>

                {(product.stock_offer_type ||
                    product.line ||
                    (compact && (product.model || product.category))) && (
                    <div
                        className={cn(
                            'border-t border-border text-xs text-muted-foreground',
                            compact
                                ? 'grid gap-y-1 pt-2.5 text-[11px] sm:text-xs'
                                : 'grid grid-cols-2 gap-x-3 gap-y-2 pt-3',
                        )}
                    >
                        {compact && product.model && (
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium">
                                <HashIcon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    Mod. {product.model}
                                </span>
                            </span>
                        )}
                        {product.stock_offer_type && (
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium">
                                <SquaresFourIcon
                                    className={cn(
                                        'shrink-0',
                                        compact ? 'size-4' : 'size-5',
                                    )}
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {
                                        stockOfferTypeCardLabels[
                                            product.stock_offer_type
                                        ]
                                    }
                                </span>
                            </span>
                        )}
                        {product.line && (
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium">
                                <TagIcon
                                    className={cn(
                                        'shrink-0',
                                        compact ? 'size-4' : 'size-5',
                                    )}
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    Linha {productLineLabels[product.line]}
                                </span>
                            </span>
                        )}
                        {compact && product.category && (
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium">
                                <FolderSimpleIcon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {product.category.name}
                                </span>
                            </span>
                        )}
                    </div>
                )}

                <p
                    className={cn(
                        'mt-auto rounded-lg text-xs leading-5',
                        compact
                            ? 'px-2.5 py-1.5 leading-[1.15rem]'
                            : 'px-3 py-2',
                        isAvailable
                            ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                            : isInternalUse
                              ? 'bg-amber-500/10 text-amber-950 dark:text-amber-100'
                              : 'bg-muted text-muted-foreground',
                    )}
                >
                    {isAvailable ? (
                        <>
                            <span className="block text-[10px] leading-4 font-normal opacity-70">
                                Disponível
                            </span>
                            <strong>{availableQuantity} peças</strong>
                            {' · '}
                            <strong>
                                {availableVolumeCount}{' '}
                                {availableVolumeCount === 1 ? 'saco' : 'sacos'}
                            </strong>
                        </>
                    ) : isInternalUse ? (
                        <>
                            <span className="block text-[10px] leading-4 font-normal opacity-70">
                                Grade Nova
                            </span>
                            <strong>Oculto para lojistas</strong>
                        </>
                    ) : hasStock ? (
                        (product.distribution_status ?? 'Sem sacos disponíveis')
                    ) : (
                        'Sem oferta de estoque'
                    )}
                </p>

                <Drawer
                    direction="right"
                    open={detailsOpen}
                    onOpenChange={setDetailsOpen}
                >
                    <div
                        className={cn(
                            'flex items-center justify-between gap-2 border-t border-border',
                            compact
                                ? '-mx-3 -mb-3 px-3 py-2 sm:-mx-4 sm:-mb-4 sm:px-4 sm:py-2.5'
                                : '-mx-4 -mb-4 px-4 py-2.5 sm:-mx-5 sm:-mb-5 sm:px-5',
                        )}
                    >
                        <DrawerTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'px-1 text-muted-foreground',
                                    compact && 'max-sm:size-9 max-sm:shrink-0',
                                )}
                                aria-label={`Ver mais informações de ${product.name}`}
                            >
                                <span
                                    className={cn(compact && 'max-sm:hidden')}
                                >
                                    Mais
                                </span>
                                <CaretRightIcon
                                    weight="bold"
                                    aria-hidden="true"
                                    className={cn(compact && 'max-sm:hidden')}
                                />
                                {compact && (
                                    <DotsThreeIcon
                                        weight="bold"
                                        aria-hidden="true"
                                        className="size-5 sm:hidden"
                                    />
                                )}
                            </Button>
                        </DrawerTrigger>
                        <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className={cn(
                                compact && 'min-w-0 flex-1 px-2.5 sm:flex-none',
                            )}
                        >
                            <Link
                                href={productEdit(product.id)}
                                aria-label={`Editar ${product.name}`}
                            >
                                <PencilSimpleIcon />
                                Editar
                            </Link>
                        </Button>
                    </div>
                    <DrawerContent
                        side="right"
                        data-testid="product-card-v3-details"
                        className="gap-0"
                    >
                        <DrawerHeader className="relative border-b border-border p-5 pr-14 text-left">
                            <p className="truncate font-mono text-xs text-muted-foreground">
                                {product.code}
                                {product.model && ` · Mod. ${product.model}`}
                            </p>
                            <DrawerTitle className="text-lg leading-snug text-balance break-words">
                                {product.name}
                            </DrawerTitle>
                            <DrawerDescription>
                                {product.distribution_status ??
                                    'Detalhes do estoque por saco.'}
                            </DrawerDescription>
                        </DrawerHeader>
                        <DrawerClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 text-muted-foreground"
                                aria-label="Fechar detalhes do produto"
                            >
                                <XIcon weight="bold" />
                            </Button>
                        </DrawerClose>
                        <div
                            data-vaul-no-drag
                            className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-5 text-xs text-muted-foreground"
                        >
                            <section
                                className="grid gap-2"
                                aria-label="Resumo do estoque"
                            >
                                <p className="text-sm font-medium text-card-foreground">
                                    Resumo do estoque
                                </p>
                                <StockQuantityDetails
                                    layout="columns"
                                    physicalQuantity={physicalQuantity}
                                    availableSackCount={availableVolumeCount}
                                    reservedQuantity={reservedQuantity}
                                    consumedQuantity={consumedQuantity}
                                    className="[&_dd]:font-semibold [&_dd]:text-card-foreground"
                                />
                            </section>
                            {volumes.length > 0 ? (
                                <div className="grid gap-3">
                                    <p className="text-sm font-medium text-card-foreground">
                                        Quantidade por saco
                                    </p>
                                    <div className="grid gap-2.5">
                                        {volumes.map((volume, index) => {
                                            const volumeSizes = volume.items
                                                .filter(
                                                    (item) => item.is_active,
                                                )
                                                .map(({ size, quantity }) => ({
                                                    size,
                                                    quantity,
                                                }));

                                            return (
                                                <div
                                                    key={volume.id}
                                                    className="grid gap-2.5 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <p className="min-w-0 font-semibold text-card-foreground">
                                                            Saco {index + 1}
                                                            {volume.code && (
                                                                <span className="block truncate font-mono text-[11px] font-normal text-muted-foreground">
                                                                    {
                                                                        volume.code
                                                                    }
                                                                </span>
                                                            )}
                                                        </p>
                                                        {volume.status && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'shrink-0',
                                                                    volume.status ===
                                                                        'Disponível'
                                                                        ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-200'
                                                                        : volume.status ===
                                                                            'Reservado'
                                                                          ? 'border-amber-600/30 bg-amber-500/10 text-amber-900 dark:border-amber-400/30 dark:text-amber-200'
                                                                          : 'border-border bg-muted text-muted-foreground',
                                                                )}
                                                            >
                                                                {volume.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <StockSizeBreakdown
                                                        sizes={volumeSizes}
                                                        compact
                                                        showUnknownAsCards
                                                    />
                                                    <p className="tabular-nums">
                                                        Total do saco:{' '}
                                                        <strong className="text-card-foreground">
                                                            {
                                                                volume.total_quantity
                                                            }{' '}
                                                            {volume.total_quantity ===
                                                            1
                                                                ? 'peça'
                                                                : 'peças'}
                                                        </strong>
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <p>
                                    Este produto ainda não tem sacos
                                    cadastrados.
                                </p>
                            )}
                        </div>
                        <DrawerFooter className="border-t border-border p-5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-fit px-1 text-destructive hover:text-destructive"
                                onClick={() => onDelete(product)}
                                aria-label={`Excluir ${product.name}`}
                            >
                                <TrashIcon />
                                Excluir produto
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </div>
        </article>
    );
}

function ProductCard({
    product,
    onDelete,
    onOpenGallery,
    variant = 'default',
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
    variant?: ProductCardVariant;
}) {
    if (variant === 'refined') {
        return (
            <RefinedProductCard
                product={product}
                onDelete={onDelete}
                onOpenGallery={onOpenGallery}
            />
        );
    }

    return (
        <ProductCardV3
            product={product}
            onDelete={onDelete}
            onOpenGallery={onOpenGallery}
        />
    );
}

function ProductTable({
    products,
    onDelete,
    onOpenGallery,
}: {
    products: Product[];
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
}) {
    return (
        <div className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-sm">
            <table
                className="block w-full border-collapse text-sm lg:table"
                aria-label="Produtos cadastrados"
            >
                <caption className="sr-only">
                    Catálogo de produtos cadastrados
                </caption>
                <thead className="hidden bg-muted/45 lg:table-header-group">
                    <tr className="border-b border-border">
                        <th
                            scope="col"
                            className="h-12 px-5 text-left text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
                        >
                            Produto
                        </th>
                        <th
                            scope="col"
                            className="h-12 px-5 text-left text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
                        >
                            Tamanhos
                        </th>
                        <th
                            scope="col"
                            className="h-12 px-5 text-left text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
                        >
                            Estoque físico e disponível
                        </th>
                        <th scope="col" className="h-12 px-5">
                            <span className="sr-only">Ações</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="block divide-y divide-border lg:table-row-group">
                    {products.map((product) => (
                        <tr
                            key={product.id}
                            className="grid gap-4 p-4 transition-colors hover:bg-muted/30 lg:table-row lg:p-0"
                        >
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-featured-card">
                                        <ProductImageButton
                                            product={product}
                                            onOpenGallery={onOpenGallery}
                                            showImageCount={false}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <TextLink
                                            href={productEdit(product.id)}
                                            className="line-clamp-2 font-semibold break-words text-card-foreground"
                                        >
                                            {product.name}
                                        </TextLink>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-mono tracking-[0.08em]">
                                                {product.code}
                                            </span>
                                            <span
                                                className="size-1 rounded-full bg-muted-foreground/60"
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0 break-words">
                                                {product.model
                                                    ? `Modelo ${product.model}`
                                                    : 'Modelo não informado'}
                                            </span>
                                        </div>
                                        <div className="mt-2">
                                            <ProductClassification
                                                product={product}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4 lg:align-middle">
                                <span className="mb-2 block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                                    Tamanhos
                                </span>
                                <div className="flex max-w-full flex-wrap gap-1.5">
                                    <StockSizeBreakdown
                                        sizes={productSizes(product).map(
                                            (size) => ({
                                                size,
                                                quantity: null,
                                            }),
                                        )}
                                        sizesOnly
                                    />
                                </div>
                            </td>
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4 lg:align-middle">
                                <span className="mb-1 block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                                    Estoque físico e disponível
                                </span>
                                {product.physical_quantity !== undefined ? (
                                    <>
                                        <p className="font-semibold text-card-foreground">
                                            {product.available_quantity ?? 0}{' '}
                                            peças disponíveis
                                        </p>
                                        <StockQuantityDetails
                                            className="mt-1 text-muted-foreground"
                                            physicalQuantity={
                                                product.physical_quantity
                                            }
                                            availableSackCount={
                                                product.available_stock_volume_count ??
                                                0
                                            }
                                            reservedQuantity={
                                                product.reserved_quantity ?? 0
                                            }
                                            consumedQuantity={
                                                product.consumed_quantity ?? 0
                                            }
                                        />
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Sem oferta
                                    </span>
                                )}
                            </td>
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4 lg:align-middle">
                                <span className="mb-2 block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                                    Ações
                                </span>
                                <div className="flex w-full items-center gap-2 lg:w-auto lg:justify-end">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => onDelete(product)}
                                        aria-label={`Excluir ${product.name}`}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ProductsIndex({
    products,
    filters,
    categories,
    washTypes,
    cardVariant = 'default',
    indexUrl = productsIndex.url(),
}: ProductsIndexComponentProps) {
    const [washTypeCreateOpen, setWashTypeCreateOpen] = useState(false);
    const [createdWashTypes, setCreatedWashTypes] = useState<WashType[]>([]);
    const allWashTypes = Array.from(
        new Map(
            [...washTypes, ...createdWashTypes].map((type) => [type.id, type]),
        ).values(),
    );
    const isRefinedCardPreview = cardVariant === 'refined';
    const isV3CardPreview = cardVariant === 'v3';
    const isCardPreview = isRefinedCardPreview || isV3CardPreview;
    const isMobile = useIsMobile();
    const [view, setView] = useState<ProductView>(
        isCardPreview ? 'cards' : 'table',
    );

    useEffect(() => {
        if (isCardPreview) {
            return;
        }

        const storedView = window.localStorage.getItem(productViewStorageKey);

        if (isProductView(storedView)) {
            setView(storedView);
        }
    }, [isCardPreview]);

    const changeView = (nextView: ProductView) => {
        setView(nextView);
        window.localStorage.setItem(productViewStorageKey, nextView);
    };
    const visibleView: ProductView = isCardPreview
        ? 'cards'
        : (isMobile && view === 'table') || (!isMobile && view === 'compact')
          ? 'cards'
          : view;
    const [filterValues, setFilterValues] = useState<ProductFilterValues>({
        search: filters.search,
        category: filters.category?.toString() ?? 'all',
        wash_type: filters.wash_type?.toString() ?? 'all',
        line: filters.line || 'all',
        stock_offer_type: filters.stock_offer_type || 'all',
        image: filters.image || 'all',
        status: filters.status,
    });
    const filtersMounted = useRef(false);
    const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
    const [galleryImageIndex, setGalleryImageIndex] = useState(0);
    const [productToDelete, setProductToDelete] = useState<Product | null>(
        null,
    );
    const [deleting, setDeleting] = useState(false);

    const openProductGallery = (product: Product): void => {
        if (product.images.length === 0) {
            return;
        }

        setGalleryImageIndex(0);
        setGalleryProduct(product);
    };

    useEffect(() => {
        if (!filtersMounted.current) {
            filtersMounted.current = true;

            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(indexUrl, filterValues, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [filterValues]);

    const filterFields: FilterField[] = [
        {
            name: 'status',
            label: 'Status do produto',
            value: filterValues.status,
            defaultValue: 'active',
            allLabel: 'Todos',
            allIcon: ListBulletsIcon,
            display: 'cards',
            options: [
                { value: 'active', label: 'Ativos', icon: CheckCircleIcon },
                {
                    value: 'inactive',
                    label: 'Inativos',
                    icon: ProhibitInsetIcon,
                },
            ],
        },
        categoryFilterField(filterValues.category, categories),
        {
            ...washTypeFilterField(filterValues.wash_type, allWashTypes),
            onAdd: () => setWashTypeCreateOpen(true),
            addLabel: 'Cadastrar tipo de lavagem',
        },
        lineFilterField(filterValues.line, [
            { value: 'slim', label: 'Slim' },
            { value: 'plus', label: 'Plus' },
        ]),
        {
            name: 'stock_offer_type',
            label: 'Tipo de grade',
            value: filterValues.stock_offer_type,
            allLabel: 'Todas as grades',
            allIcon: SquaresFourIcon,
            display: 'cards',
            options: [
                {
                    value: 'replenishment',
                    label: 'Reposição',
                    icon: ArrowsClockwiseIcon,
                },
                { value: 'new_grade', label: 'Grade Nova', icon: SparkleIcon },
                {
                    value: 'broken_grade',
                    label: 'Grade Furada',
                    icon: PackageIcon,
                },
            ],
        },
        {
            name: 'image',
            label: 'Fotos',
            value: filterValues.image,
            allLabel: 'Com ou sem foto',
            allCardLabel: 'Todas',
            allIcon: ImagesIcon,
            display: 'cards',
            options: [
                { value: 'with', label: 'Com foto', icon: ImageIcon },
                { value: 'without', label: 'Sem foto', icon: ImageBrokenIcon },
            ],
        },
    ];

    const handleDelete = () => {
        if (!productToDelete) {
            return;
        }

        setDeleting(true);
        router.delete(destroy.url(productToDelete.id), {
            preserveScroll: true,
            onError: (errors) => {
                toast.error(Object.values(errors).join(' '), {
                    closeButton: true,
                    duration: Infinity,
                });
            },
            onFinish: () => {
                setDeleting(false);
                setProductToDelete(null);
            },
        });
    };

    return (
        <>
            <Head
                title={
                    isV3CardPreview
                        ? 'Cards v3 — Produtos'
                        : isRefinedCardPreview
                          ? 'Cards refinados — Produtos'
                          : 'Produtos'
                }
            />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid gap-3">
                        <p className="text-xs font-semibold tracking-[0.22em] text-highlight uppercase">
                            {isCardPreview
                                ? 'Painel de distribuição / revisão visual'
                                : 'Painel de distribuição / catálogo'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                                Produtos
                            </h1>
                            <span className="rounded-full bg-primary px-3 py-1 font-mono text-xs font-bold text-primary-foreground">
                                {products.meta.total
                                    .toString()
                                    .padStart(2, '0')}
                            </span>
                            {isRefinedCardPreview && (
                                <Badge
                                    variant="outline"
                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                >
                                    Card v2
                                </Badge>
                            )}
                            {isV3CardPreview && (
                                <Badge
                                    variant="outline"
                                    className="rounded-full font-mono text-[10px] tracking-[0.12em] uppercase"
                                >
                                    Card v3
                                </Badge>
                            )}
                        </div>
                        <p className="max-w-xl text-base leading-7 text-muted-foreground">
                            {isV3CardPreview
                                ? 'Foto em cima e leitura em Z: identificação, estoque, grade e sacos no mesmo padrão do catálogo.'
                                : isRefinedCardPreview
                                  ? 'Foto, identificação, grade e estoque em uma linha de leitura única, no padrão das listas de catálogo.'
                                  : 'A identidade de cada peça fica aqui. Depois, ela pode receber diferentes ofertas e condições de estoque.'}
                        </p>
                    </div>
                    <Button asChild size="lg" className="w-full sm:w-fit">
                        <Link href={productCreate()}>
                            <PlusCircleIcon />
                            Novo produto
                        </Link>
                    </Button>
                </header>

                <SearchFilterBar
                    idPrefix="product-filter"
                    search={filterValues.search}
                    onSearchChange={(search) =>
                        setFilterValues((current) => ({ ...current, search }))
                    }
                    fields={filterFields}
                    onFieldChange={(name, value) =>
                        setFilterValues((current) => ({
                            ...current,
                            [name]: value,
                        }))
                    }
                    onClear={() =>
                        setFilterValues({
                            search: '',
                            category: 'all',
                            wash_type: 'all',
                            line: 'all',
                            stock_offer_type: 'all',
                            image: 'all',
                            status: 'active',
                        })
                    }
                    resultCount={products.meta.total}
                />

                {products.data.length > 0 ? (
                    <>
                        {!isCardPreview && (
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <p className="hidden text-sm text-muted-foreground md:block">
                                    Escolha como visualizar seu catálogo.
                                </p>
                                <ToggleGroup
                                    type="single"
                                    value={visibleView}
                                    onValueChange={(value) => {
                                        if (isProductView(value)) {
                                            changeView(value);
                                        }
                                    }}
                                    variant="outline"
                                    size="sm"
                                    aria-label="Escolher visualização dos produtos"
                                    className="w-full md:w-fit"
                                >
                                    {!isMobile && (
                                        <ToggleGroupItem
                                            value="table"
                                            aria-label="Visualização em tabela"
                                            className="flex-1 px-3 data-[state=on]:bg-secondary md:flex-none"
                                        >
                                            <TableIcon />
                                            Tabela
                                        </ToggleGroupItem>
                                    )}
                                    <ToggleGroupItem
                                        value="cards"
                                        aria-label="Visualização em cards"
                                        className="flex-1 px-3 data-[state=on]:bg-secondary md:flex-none"
                                    >
                                        <RowsIcon />
                                        Cards
                                    </ToggleGroupItem>
                                    {isMobile && (
                                        <ToggleGroupItem
                                            value="compact"
                                            aria-label="Visualização com 2 cards por linha"
                                            className="flex-1 px-3 data-[state=on]:bg-secondary md:flex-none"
                                        >
                                            <SquaresFourIcon />2 por linha
                                        </ToggleGroupItem>
                                    )}
                                </ToggleGroup>
                            </div>
                        )}

                        {visibleView === 'compact' ? (
                            <section
                                data-testid="product-cards-compact"
                                className="grid grid-cols-2 gap-3 sm:gap-4"
                                aria-label="Produtos cadastrados em 2 cards por linha"
                            >
                                {products.data.map((product) => (
                                    <ProductCardV3
                                        key={product.id}
                                        product={product}
                                        onDelete={setProductToDelete}
                                        onOpenGallery={openProductGallery}
                                        compact
                                    />
                                ))}
                            </section>
                        ) : visibleView === 'cards' ? (
                            <section
                                data-testid={
                                    isV3CardPreview
                                        ? 'product-cards-v3'
                                        : isRefinedCardPreview
                                          ? 'product-cards-refined'
                                          : 'product-cards'
                                }
                                className={cn(
                                    'grid gap-4',
                                    isRefinedCardPreview
                                        ? 'gap-3 lg:grid-cols-2'
                                        : isV3CardPreview
                                          ? 'gap-4 sm:grid-cols-2 xl:grid-cols-3'
                                          : 'gap-5 sm:grid-cols-2 xl:grid-cols-3',
                                )}
                                aria-label={
                                    isV3CardPreview
                                        ? 'Produtos cadastrados em cards v3'
                                        : isRefinedCardPreview
                                          ? 'Produtos cadastrados em cards refinados'
                                          : 'Produtos cadastrados'
                                }
                            >
                                {products.data.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onDelete={setProductToDelete}
                                        onOpenGallery={openProductGallery}
                                        variant={cardVariant}
                                    />
                                ))}
                            </section>
                        ) : (
                            <ProductTable
                                products={products.data}
                                onDelete={setProductToDelete}
                                onOpenGallery={openProductGallery}
                            />
                        )}
                    </>
                ) : (
                    <Card className="rounded-[2rem] border-dashed shadow-sm">
                        <CardHeader className="items-center pt-12 text-center">
                            <span className="mb-2 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
                                <TShirtIcon className="size-8" />
                            </span>
                            <CardTitle className="text-2xl tracking-tight">
                                Seu catálogo começa aqui
                            </CardTitle>
                            <CardDescription className="max-w-md text-base leading-6">
                                Cadastre a primeira peça para começar a
                                organizar o estoque disponível para
                                distribuição.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-12">
                            <Button asChild>
                                <Link href={productCreate()}>
                                    <PlusCircleIcon />
                                    Cadastrar primeiro produto
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <ProductImageGallery
                    product={galleryProduct}
                    open={galleryProduct !== null}
                    selectedIndex={galleryImageIndex}
                    onOpenChange={(open) => {
                        if (!open) {
                            setGalleryProduct(null);
                        }
                    }}
                    onSelectedIndexChange={setGalleryImageIndex}
                />

                {products.links.length > 3 && (
                    <Pagination
                        links={products.links}
                        compact
                        ariaLabel="Paginação de produtos"
                    />
                )}
            </div>

            <WashTypeCreateDialog
                key={String(washTypeCreateOpen)}
                open={washTypeCreateOpen}
                onOpenChange={setWashTypeCreateOpen}
                onCreated={(created) => {
                    setCreatedWashTypes((current) => [...current, created]);
                    setFilterValues((current) => ({
                        ...current,
                        wash_type: created.id.toString(),
                    }));
                }}
            />
            <ConfirmationDialog
                open={productToDelete !== null}
                onOpenChange={(open) => !open && setProductToDelete(null)}
                title="Excluir produto?"
                description={
                    productToDelete
                        ? `“${productToDelete.name}” será movido para a lixeira, junto com suas fotos, tamanhos e estoque.`
                        : ''
                }
                confirmLabel={deleting ? 'Excluindo...' : 'Excluir produto'}
                confirmIcon={<TrashIcon />}
                cancelLabel="Cancelar"
                cancelVariant="ghost"
                onConfirm={handleDelete}
                destructive
                disabled={deleting}
            />
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Produtos',
            href: productsIndex(),
        },
    ],
};
