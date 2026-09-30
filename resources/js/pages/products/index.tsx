import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowsClockwiseIcon,
    CaretLeftIcon,
    CaretRightIcon,
    CheckCircleIcon,
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
import { Fragment, useEffect, useRef, useState } from 'react';
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
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    ProductLine,
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

function paginationLabel(label: string): string {
    if (
        label === 'pagination.previous' ||
        label.includes('Previous') ||
        label.includes('laquo')
    ) {
        return 'Anterior';
    }

    if (
        label === 'pagination.next' ||
        label.includes('Next') ||
        label.includes('raquo')
    ) {
        return 'Próxima';
    }

    return label;
}

function ProductImage({
    product,
    className,
    iconClassName,
}: {
    product: Product;
    className?: string;
    iconClassName?: string;
}) {
    const coverImage = product.images[0];

    if (coverImage) {
        return (
            <img
                src={coverImage.thumb_url ?? coverImage.url}
                alt={product.name}
                className={cn('size-full object-cover', className)}
                loading="lazy"
                decoding="async"
            />
        );
    }

    return (
        <div
            className={cn(
                'flex size-full items-center justify-center text-featured-card-muted',
                className,
            )}
            aria-label="Produto sem foto"
        >
            <ImageBrokenIcon className={cn('size-5', iconClassName)} />
        </div>
    );
}

function ProductImageButton({
    product,
    onOpenGallery,
    showImageCount = true,
    className,
    iconClassName,
}: {
    product: Product;
    onOpenGallery: (product: Product) => void;
    showImageCount?: boolean;
    className?: string;
    iconClassName?: string;
}) {
    const coverImage = product.images[0];

    if (!coverImage) {
        return (
            <ProductImage
                product={product}
                className={className}
                iconClassName={iconClassName}
            />
        );
    }

    return (
        <button
            type="button"
            data-testid={`abrir-galeria-produto-${product.id}`}
            aria-label={`Abrir galeria de imagens de ${product.name}`}
            onClick={() => onOpenGallery(product)}
            className={cn(
                'group/image relative block size-full overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                className,
            )}
        >
            <ProductImage product={product} />
            {showImageCount && product.images.length > 1 && (
                <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-foreground/75 px-2 py-1 text-[10px] font-semibold text-background tabular-nums backdrop-blur-sm">
                    {product.images.length} fotos
                </span>
            )}
        </button>
    );
}

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

function ProductSizes({ product }: { product: Product }) {
    const sizes = productSizes(product);

    if (sizes.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                Sem grade cadastrada
            </span>
        );
    }

    return sizes.map((size) => (
        <span
            key={size}
            className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium break-words text-foreground"
        >
            {size}
        </span>
    ));
}

const stockOfferTypeLabels: Record<StockOfferType, string> = {
    replenishment: 'Reposição',
    new_grade: 'Nova',
    broken_grade: 'Furada',
};

const productLineLabels: Record<ProductLine, string> = {
    slim: 'Slim',
    plus: 'Plus',
};

const stockOfferTypeCardLabels: Record<StockOfferType, string> = {
    replenishment: 'Reposição',
    new_grade: 'Grade Nova',
    broken_grade: 'Grade Furada',
};

function ProductClassification({ product }: { product: Product }) {
    const stockOfferType = product.stock_offer_type;
    const productLine = product.line;

    const classifications = [
        product.is_active ? 'Ativo' : 'Inativo',
        `Grade: ${stockOfferType ? stockOfferTypeLabels[stockOfferType] : 'Sem oferta'}`,
        productLine ? productLineLabels[productLine] : null,
        product.category?.name ?? null,
        product.wash_type?.name ?? null,
    ].filter(
        (classification): classification is string => classification !== null,
    );

    return (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            {classifications.map((classification, index) => (
                <Fragment key={`${classification}-${index}`}>
                    {index > 0 && (
                        <span
                            className="size-1 rounded-full bg-muted-foreground/60"
                            aria-hidden="true"
                        />
                    )}
                    <span>{classification}</span>
                </Fragment>
            ))}
        </div>
    );
}

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
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
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
            data-testid="product-card-v3"
            aria-label={product.name}
            className="group flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-foreground/20 hover:shadow-md"
        >
            <div
                className={cn(
                    'relative aspect-[6/5] overflow-hidden bg-muted/60',
                    !product.is_active && '[&_img]:grayscale',
                )}
            >
                <ProductImageButton
                    product={product}
                    onOpenGallery={onOpenGallery}
                    className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    iconClassName="size-8"
                />
                {product.notes && (
                    <Popover modal={false}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-white/50 bg-card/90 text-foreground shadow-sm backdrop-blur transition hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                {product.category && (
                    <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-white/50 bg-card/90 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                        {product.category.name}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                    <p className="truncate font-mono text-xs leading-4 text-muted-foreground">
                        {product.code}
                        {product.model && ` · Mod. ${product.model}`}
                    </p>
                    <TextLink
                        href={productEdit(product.id)}
                        className="line-clamp-2 rounded-sm text-lg leading-6 font-semibold tracking-tight text-card-foreground no-underline hover:underline"
                    >
                        {product.name}
                    </TextLink>
                </div>

                {hasStock ? (
                    <div
                        className={cn(
                            'grid gap-2 rounded-xl px-3.5 py-3',
                            isAvailable
                                ? 'bg-emerald-950 text-white dark:bg-emerald-950/80'
                                : isInternalUse
                                  ? 'bg-amber-100 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100'
                                  : 'bg-muted',
                        )}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <p className="min-w-0 flex-1 text-xs leading-4 font-semibold text-current/80">
                                {isAvailable
                                    ? 'Disponível para lojistas'
                                    : isInternalUse
                                      ? 'Uso interno da equipe'
                                      : (product.distribution_status ??
                                        'Indisponível')}
                            </p>
                            <p className="shrink-0 text-2xl leading-7 font-bold whitespace-nowrap tabular-nums">
                                {availableQuantity}{' '}
                                <span className="text-sm font-semibold text-current/75">
                                    peças
                                </span>
                            </p>
                        </div>
                        <StockQuantityDetails
                            layout="columns"
                            className="border-t border-current/15 pt-2 text-current/80"
                            physicalQuantity={physicalQuantity}
                            availableSackCount={availableVolumeCount}
                            reservedQuantity={reservedQuantity}
                            consumedQuantity={consumedQuantity}
                        />
                    </div>
                ) : (
                    <p className="rounded-xl bg-muted px-3.5 py-3 text-sm font-semibold text-muted-foreground">
                        Sem oferta de estoque
                    </p>
                )}

                {(product.stock_offer_type || product.line) && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                        {product.stock_offer_type && (
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium">
                                <SquaresFourIcon
                                    className="size-5 shrink-0"
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
                                    className="size-5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    Linha {productLineLabels[product.line]}
                                </span>
                            </span>
                        )}
                    </div>
                )}

                <Drawer
                    direction="right"
                    open={detailsOpen}
                    onOpenChange={setDetailsOpen}
                >
                    <div className="-mx-4 mt-auto -mb-4 flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 sm:-mx-5 sm:-mb-5 sm:px-5">
                        <DrawerTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-1 text-muted-foreground"
                                aria-label={`Ver mais informações de ${product.name}`}
                            >
                                Mais
                                <CaretRightIcon
                                    weight="bold"
                                    aria-hidden="true"
                                />
                            </Button>
                        </DrawerTrigger>
                        <Button asChild variant="secondary" size="sm">
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

function ProductCompactCard({
    product,
    onDelete,
    onOpenGallery,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
}) {
    const availableQuantity = product.available_quantity ?? 0;
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
    const sizes = productSizeBreakdown(product);

    return (
        <article
            data-testid="product-card-compact"
            aria-label={product.name}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-200 hover:border-foreground/30 lg:flex-row"
        >
            <div
                className={cn(
                    'relative aspect-[4/5] shrink-0 overflow-hidden bg-muted/60 lg:aspect-auto lg:w-44',
                    !product.is_active && '[&_img]:grayscale',
                )}
            >
                <ProductImageButton
                    product={product}
                    onOpenGallery={onOpenGallery}
                    className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    iconClassName="size-7"
                />
                <span
                    className={cn(
                        'pointer-events-none absolute top-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur',
                        isAvailable
                            ? 'border-emerald-600/30 bg-emerald-50/95 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/85 dark:text-emerald-200'
                            : 'border-border bg-card/90 text-muted-foreground',
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
                </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
                <div className="min-w-0">
                    <p className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs">
                        {product.code}
                        {product.model && ` · ${product.model}`}
                    </p>
                    <TextLink
                        href={productEdit(product.id)}
                        className="mt-1 line-clamp-2 rounded-sm text-base leading-5 font-semibold tracking-tight text-card-foreground no-underline hover:underline sm:text-lg sm:leading-6"
                    >
                        {product.name}
                    </TextLink>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {product.stock_offer_type && (
                        <Badge
                            variant="secondary"
                            className="rounded-full px-2 text-[11px] sm:text-xs"
                        >
                            {stockOfferTypeCardLabels[product.stock_offer_type]}
                        </Badge>
                    )}
                    {product.line && (
                        <span>{productLineLabels[product.line]}</span>
                    )}
                </div>

                {hasStock ? (
                    <p className="border-t border-border/70 pt-3 text-sm leading-5 text-muted-foreground tabular-nums">
                        <strong className="text-xl font-bold text-card-foreground sm:text-2xl">
                            {availableQuantity}
                        </strong>{' '}
                        {availableQuantity === 1 ? 'peça' : 'peças'}
                        <span className="block text-[11px] sm:inline sm:text-xs">
                            <span className="hidden sm:inline"> · </span>
                            {availableVolumeCount}{' '}
                            {availableVolumeCount === 1 ? 'saco' : 'sacos'}
                        </span>
                    </p>
                ) : (
                    <p className="text-xs font-medium text-muted-foreground">
                        Sem oferta de estoque
                    </p>
                )}

                {sizes.length > 0 && (
                    <StockSizeBreakdown sizes={sizes} sizesOnly />
                )}

                <div className="mt-auto flex items-center gap-1 border-t border-border/70 pt-3">
                    <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="h-10 min-w-0 flex-1"
                    >
                        <Link
                            href={productEdit(product.id)}
                            aria-label={`Editar ${product.name}`}
                        >
                            <PencilSimpleIcon />
                            Editar
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(product)}
                        aria-label={`Excluir ${product.name}`}
                    >
                        <TrashIcon />
                    </Button>
                </div>
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
                                    <ProductSizes product={product} />
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
        : isMobile && view === 'table'
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
                                    <ToggleGroupItem
                                        value="compact"
                                        aria-label="Visualização com 2 cards por linha"
                                        className="flex-1 px-3 data-[state=on]:bg-secondary md:flex-none"
                                    >
                                        <SquaresFourIcon />2 por linha
                                    </ToggleGroupItem>
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
                                    <ProductCompactCard
                                        key={product.id}
                                        product={product}
                                        onDelete={setProductToDelete}
                                        onOpenGallery={openProductGallery}
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
                    <nav
                        className="flex items-center justify-center gap-1"
                        aria-label="Paginação de produtos"
                    >
                        {products.links.map((link) => {
                            const isPrevious =
                                link.label === 'pagination.previous' ||
                                link.label.includes('Previous') ||
                                link.label.includes('laquo');
                            const isNext =
                                link.label === 'pagination.next' ||
                                link.label.includes('Next') ||
                                link.label.includes('raquo');

                            return (
                                <Button
                                    key={`${link.label}-${link.url ?? 'disabled'}`}
                                    variant={
                                        link.active ? 'secondary' : 'ghost'
                                    }
                                    size="sm"
                                    asChild={link.url !== null}
                                    disabled={link.url === null}
                                    aria-label={paginationLabel(link.label)}
                                >
                                    {link.url ? (
                                        <Link href={link.url} preserveScroll>
                                            {isPrevious ? (
                                                <CaretLeftIcon weight="bold" />
                                            ) : isNext ? (
                                                <CaretRightIcon weight="bold" />
                                            ) : null}
                                            <span
                                                className={
                                                    isPrevious || isNext
                                                        ? 'hidden sm:inline'
                                                        : undefined
                                                }
                                            >
                                                {paginationLabel(link.label)}
                                            </span>
                                        </Link>
                                    ) : (
                                        <span>
                                            {paginationLabel(link.label)}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </nav>
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
            <Dialog
                open={productToDelete !== null}
                onOpenChange={(open) => !open && setProductToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir produto?</DialogTitle>
                        <DialogDescription>
                            {productToDelete
                                ? `“${productToDelete.name}” será movido para a lixeira, junto com suas fotos, tamanhos e estoque.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost" disabled={deleting}>
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            <TrashIcon />
                            {deleting ? 'Excluindo...' : 'Excluir produto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
