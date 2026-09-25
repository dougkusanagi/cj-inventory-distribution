import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Info,
    ImageOff,
    LayoutGrid,
    Package,
    Pencil,
    Plus,
    Search,
    Shirt,
    SlidersHorizontal,
    Tag,
    Table2,
    Trash2,
    X,
} from 'lucide-react';
import {
    Fragment,
    useEffect,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
import { destroy } from '@/actions/App/Http/Controllers/ProductController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
} from '@/types';

export type ProductsIndexProps = {
    products: Paginated<Product>;
    filters: {
        search: string;
        category: number | null;
        line: string;
        stock_offer_type: string;
        image: string;
    };
    categories: Category[];
};

type ProductCardVariant = 'default' | 'refined' | 'v3';

type ProductsIndexComponentProps = ProductsIndexProps & {
    cardVariant?: ProductCardVariant;
    indexUrl?: string;
};

type ProductView = 'table' | 'cards';

type ProductFilterValues = {
    search: string;
    category: string;
    line: string;
    stock_offer_type: string;
    image: string;
};

function formValue(data: FormData, name: string): string {
    const value = data.get(name);

    return typeof value === 'string' ? value : '';
}

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

function ProductFilterSelect({
    name,
    id,
    defaultValue,
    placeholder,
    label,
    children,
    triggerClassName,
}: {
    name: string;
    id: string;
    defaultValue: string;
    placeholder: string;
    label?: string;
    children: ReactNode;
    triggerClassName?: string;
}) {
    const select = (
        <Select name={name} defaultValue={defaultValue}>
            <SelectTrigger
                id={id}
                aria-label={label ?? placeholder}
                className={cn('w-full', triggerClassName)}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>{children}</SelectContent>
        </Select>
    );

    if (!label) {
        return select;
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {select}
        </div>
    );
}

function ProductFilterFields({
    categories,
    idPrefix,
    values,
    labelled = false,
}: {
    categories: Category[];
    idPrefix: string;
    values: Omit<ProductFilterValues, 'search'>;
    labelled?: boolean;
}) {
    const triggerClassName = labelled ? 'h-11' : undefined;

    return (
        <>
            <ProductFilterSelect
                name="category"
                id={`${idPrefix}-category`}
                defaultValue={values.category || 'all'}
                placeholder="Todas as categorias"
                label={labelled ? 'Categoria' : undefined}
                triggerClassName={triggerClassName}
            >
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                    <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                    >
                        {category.name}
                    </SelectItem>
                ))}
            </ProductFilterSelect>
            <ProductFilterSelect
                name="line"
                id={`${idPrefix}-line`}
                defaultValue={values.line || 'all'}
                placeholder="Slim ou Plus"
                label={labelled ? 'Linha comercial' : undefined}
                triggerClassName={triggerClassName}
            >
                <SelectItem value="all">Slim e Plus</SelectItem>
                <SelectItem value="slim">Slim</SelectItem>
                <SelectItem value="plus">Plus</SelectItem>
            </ProductFilterSelect>
            <ProductFilterSelect
                name="stock_offer_type"
                id={`${idPrefix}-stock-offer-type`}
                defaultValue={values.stock_offer_type || 'all'}
                placeholder="Tipo de grade"
                label={labelled ? 'Tipo de grade' : undefined}
                triggerClassName={triggerClassName}
            >
                <SelectItem value="all">Todas as grades</SelectItem>
                <SelectItem value="replenishment">Reposição</SelectItem>
                <SelectItem value="new_grade">Grade Nova</SelectItem>
                <SelectItem value="broken_grade">Grade Furada</SelectItem>
            </ProductFilterSelect>
            <ProductFilterSelect
                name="image"
                id={`${idPrefix}-image`}
                defaultValue={values.image || 'all'}
                placeholder="Fotos"
                label={labelled ? 'Fotos' : undefined}
                triggerClassName={triggerClassName}
            >
                <SelectItem value="all">Com ou sem foto</SelectItem>
                <SelectItem value="with">Com foto</SelectItem>
                <SelectItem value="without">Sem foto</SelectItem>
            </ProductFilterSelect>
        </>
    );
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
            <ImageOff
                className={cn('size-5', iconClassName)}
                strokeWidth={1.25}
            />
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
                                <p className="mt-0.5 text-xs leading-4 text-muted-foreground tabular-nums">
                                    Físico: {physicalQuantity} peças ·{' '}
                                    {availableVolumeCount}{' '}
                                    {availableVolumeCount === 1
                                        ? 'saco disponível'
                                        : 'sacos disponíveis'}
                                    {reservedQuantity > 0 &&
                                        ` · Reservado: ${reservedQuantity}`}
                                    {consumedQuantity > 0 &&
                                        ` · Baixado: ${consumedQuantity}`}
                                </p>
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
                                <Pencil />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(product)}
                            aria-label={`Excluir ${product.name}`}
                        >
                            <Trash2 />
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
    const sizes = productSizeBreakdown(product);
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
                                <Info className="size-4" aria-hidden="true" />
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
                    <p className="truncate font-mono text-xs text-muted-foreground">
                        {product.code}
                        {product.model && ` · Mod. ${product.model}`}
                    </p>
                    <TextLink
                        href={productEdit(product.id)}
                        className="mt-1 line-clamp-2 rounded-sm text-lg leading-7 font-semibold tracking-tight text-card-foreground no-underline hover:underline"
                    >
                        {product.name}
                    </TextLink>
                </div>

                {hasStock ? (
                    <div
                        className={cn(
                            'flex items-center justify-between gap-3 rounded-xl px-3.5 py-3.5',
                            isAvailable
                                ? 'bg-emerald-950 text-white dark:bg-emerald-950/80'
                                : isInternalUse
                                  ? 'bg-amber-100 text-amber-950 dark:bg-amber-400/15 dark:text-amber-100'
                                  : 'bg-muted',
                        )}
                    >
                        <div className="min-w-0">
                            <p className="text-2xl leading-7 font-bold tabular-nums">
                                {availableQuantity}{' '}
                                <span className="text-sm font-semibold text-current/75">
                                    peças
                                </span>
                            </p>
                            <p className="mt-1 text-xs leading-4 text-current/70 tabular-nums">
                                Físico: {physicalQuantity} peças ·{' '}
                                {availableVolumeCount}{' '}
                                {availableVolumeCount === 1
                                    ? 'saco disponível'
                                    : 'sacos disponíveis'}
                                {reservedQuantity > 0 &&
                                    ` · Reservado: ${reservedQuantity}`}
                                {consumedQuantity > 0 &&
                                    ` · Baixado: ${consumedQuantity}`}
                            </p>
                        </div>
                        <span
                            className={cn(
                                'flex size-11 shrink-0 items-center justify-center rounded-full',
                                isAvailable
                                    ? 'bg-emerald-400/20 text-emerald-100'
                                    : 'bg-background text-muted-foreground',
                            )}
                            aria-hidden="true"
                        >
                            <Package className="size-5" />
                        </span>
                    </div>
                ) : (
                    <p className="rounded-xl bg-muted px-3.5 py-3 text-sm font-semibold text-muted-foreground">
                        Sem oferta de estoque
                    </p>
                )}

                {(product.stock_offer_type ||
                    product.line ||
                    sizes.length > 0) && (
                    <div className="grid gap-3 rounded-xl bg-muted/30 p-3">
                        {(product.stock_offer_type || product.line) && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground">
                                {product.stock_offer_type && (
                                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate font-medium">
                                        <LayoutGrid
                                            className="size-4 shrink-0"
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
                                        <Tag
                                            className="size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">
                                            Linha{' '}
                                            {productLineLabels[product.line]}
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}

                        {sizes.length > 0 && (
                            <div className="grid gap-1.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Tamanhos
                                </p>
                                <StockSizeBreakdown sizes={sizes} sizesOnly />
                            </div>
                        )}
                    </div>
                )}

                <Collapsible
                    open={detailsOpen}
                    onOpenChange={setDetailsOpen}
                    className="-mx-4 mt-auto -mb-4 sm:-mx-5 sm:-mb-5"
                >
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-1 text-muted-foreground"
                                aria-label={
                                    detailsOpen
                                        ? `Ocultar mais informações de ${product.name}`
                                        : `Ver mais informações de ${product.name}`
                                }
                            >
                                Mais
                                <ChevronDown
                                    className={cn(
                                        'transition-transform duration-200',
                                        detailsOpen && 'rotate-180',
                                    )}
                                    aria-hidden="true"
                                />
                            </Button>
                        </CollapsibleTrigger>
                        <Button asChild variant="secondary" size="sm">
                            <Link
                                href={productEdit(product.id)}
                                aria-label={`Editar ${product.name}`}
                            >
                                <Pencil />
                                Editar
                            </Link>
                        </Button>
                    </div>
                    <CollapsibleContent
                        data-testid="product-card-v3-details"
                        className="border-t border-border px-4 py-4 sm:px-5"
                    >
                        <div className="grid gap-4 text-xs text-muted-foreground">
                            {volumes.length > 0 && (
                                <div className="grid gap-2">
                                    <p className="font-medium text-card-foreground">
                                        Quantidade por saco
                                    </p>
                                    <div className="grid gap-2">
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
                                                    className="grid gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5"
                                                >
                                                    <p className="flex items-center justify-between gap-2">
                                                        <span className="min-w-0 truncate font-semibold text-card-foreground">
                                                            Saco {index + 1}
                                                            {volume.code && (
                                                                <span className="font-mono font-normal text-muted-foreground">
                                                                    {' '}
                                                                    ·{' '}
                                                                    {
                                                                        volume.code
                                                                    }
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="shrink-0 tabular-nums">
                                                            {volume.status &&
                                                                `${volume.status} · `}
                                                            {
                                                                volume.total_quantity
                                                            }{' '}
                                                            {volume.total_quantity ===
                                                            1
                                                                ? 'peça'
                                                                : 'peças'}
                                                        </span>
                                                    </p>
                                                    <StockSizeBreakdown
                                                        sizes={volumeSizes}
                                                        compact
                                                        showUnknownAsCards
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-fit px-1 text-destructive hover:text-destructive"
                                onClick={() => onDelete(product)}
                                aria-label={`Excluir ${product.name}`}
                            >
                                <Trash2 />
                                Excluir produto
                            </Button>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
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
                                        <p className="text-xs text-muted-foreground">
                                            Físico: {product.physical_quantity}{' '}
                                            peças ·{' '}
                                            {product.available_stock_volume_count ??
                                                0}{' '}
                                            {(product.available_stock_volume_count ??
                                                0) === 1
                                                ? 'saco disponível'
                                                : 'sacos disponíveis'}
                                            {(product.reserved_quantity ?? 0) >
                                                0 &&
                                                ` · Reservado: ${product.reserved_quantity}`}
                                            {(product.consumed_quantity ?? 0) >
                                                0 &&
                                                ` · Baixado: ${product.consumed_quantity}`}
                                        </p>
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
                                        <Trash2 />
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
    cardVariant = 'default',
    indexUrl = productsIndex.url(),
}: ProductsIndexComponentProps) {
    const isRefinedCardPreview = cardVariant === 'refined';
    const isV3CardPreview = cardVariant === 'v3';
    const isCardPreview = isRefinedCardPreview || isV3CardPreview;
    const isMobile = useIsMobile();
    const [view, setView] = useState<ProductView>(
        isCardPreview ? 'cards' : 'table',
    );
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [mobileSearch, setMobileSearch] = useState(filters.search);
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

    const applyFilters = (values: ProductFilterValues) => {
        setMobileSearch(values.search);
        router.get(indexUrl, values, {
            preserveState: true,
            replace: true,
            onSuccess: () => setFiltersOpen(false),
        });
    };

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        applyFilters({
            search: formValue(data, 'search'),
            category: formValue(data, 'category'),
            line: formValue(data, 'line'),
            stock_offer_type: formValue(data, 'stock_offer_type'),
            image: formValue(data, 'image'),
        });
    };

    useEffect(() => {
        setMobileSearch(filters.search);
    }, [filters.search]);

    const submitMobileSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        applyFilters({
            search: formValue(data, 'search'),
            category: filters.category?.toString() ?? 'all',
            line: filters.line || 'all',
            stock_offer_type: filters.stock_offer_type || 'all',
            image: filters.image || 'all',
        });
    };

    const clearFilters = () => {
        applyFilters({
            search: '',
            category: '',
            line: '',
            stock_offer_type: '',
            image: '',
        });
    };

    const filterValues: Omit<ProductFilterValues, 'search'> = {
        category: filters.category?.toString() ?? 'all',
        line: filters.line || 'all',
        stock_offer_type: filters.stock_offer_type || 'all',
        image: filters.image || 'all',
    };
    const activeFilterCount = [
        filters.category !== null,
        filters.line !== '' && filters.line !== 'all',
        filters.stock_offer_type !== '' && filters.stock_offer_type !== 'all',
        filters.image !== '' && filters.image !== 'all',
    ].filter(Boolean).length;
    const hasAppliedFilters = filters.search !== '' || activeFilterCount > 0;

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
                            <Plus />
                            Novo produto
                        </Link>
                    </Button>
                </header>

                <div className="md:hidden">
                    <form
                        onSubmit={submitMobileSearch}
                        data-testid="mobile-product-filters"
                        aria-label="Buscar produtos"
                        className="grid gap-2 rounded-[1.25rem] border border-border/80 bg-card p-3 shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <Input
                                id="mobile-product-search"
                                name="search"
                                type="search"
                                value={mobileSearch}
                                placeholder="Buscar por nome"
                                aria-label="Buscar por nome"
                                onChange={(event) =>
                                    setMobileSearch(event.target.value)
                                }
                                className="h-11 bg-background"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-11 shrink-0 gap-2 px-3"
                                aria-expanded={filtersOpen}
                                aria-controls="mobile-product-filter-drawer"
                                aria-label="Abrir filtros de produtos"
                                onClick={() => setFiltersOpen(true)}
                            >
                                <SlidersHorizontal />
                                <span>Filtros</span>
                                {activeFilterCount > 0 && (
                                    <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                        {hasAppliedFilters && activeFilterCount > 0 && (
                            <p className="px-1 text-xs text-muted-foreground">
                                {activeFilterCount}{' '}
                                {activeFilterCount === 1
                                    ? 'filtro aplicado'
                                    : 'filtros aplicados'}
                            </p>
                        )}
                    </form>

                    <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                        <DrawerContent
                            id="mobile-product-filter-drawer"
                            className="mx-auto max-w-2xl"
                        >
                            <form
                                onSubmit={submitFilters}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <DrawerHeader className="relative shrink-0 px-4 pt-5 pr-16 pb-4 text-left sm:px-6">
                                    <DrawerTitle>Filtrar produtos</DrawerTitle>
                                    <DrawerDescription>
                                        Refine a lista e aplique todos os
                                        filtros de uma vez.
                                    </DrawerDescription>
                                    <DrawerClose asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-4 right-4 size-11"
                                            aria-label="Fechar filtros de produtos"
                                        >
                                            <X />
                                        </Button>
                                    </DrawerClose>
                                </DrawerHeader>
                                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
                                    <div className="grid gap-4">
                                        <input
                                            type="hidden"
                                            name="search"
                                            value={mobileSearch}
                                            readOnly
                                        />
                                        <ProductFilterFields
                                            key={`mobile-${Object.values(filterValues).join('-')}`}
                                            categories={categories}
                                            idPrefix="mobile-product-filter"
                                            values={filterValues}
                                            labelled
                                        />
                                    </div>
                                </div>
                                <DrawerFooter className="shrink-0 border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
                                    <Button
                                        type="submit"
                                        className="h-11"
                                        aria-label="Aplicar filtros de produtos"
                                    >
                                        <Search />
                                        Aplicar filtros
                                    </Button>
                                    {hasAppliedFilters && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-11"
                                            onClick={clearFilters}
                                        >
                                            Limpar filtros
                                        </Button>
                                    )}
                                </DrawerFooter>
                            </form>
                        </DrawerContent>
                    </Drawer>
                </div>

                <form
                    onSubmit={submitFilters}
                    className="hidden gap-3 rounded-[1.75rem] border border-border/80 bg-card p-4 shadow-sm md:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(11rem,1fr)_minmax(9rem,.75fr)_minmax(10rem,.9fr)_minmax(10rem,.8fr)_auto]"
                >
                    <Input
                        name="search"
                        defaultValue={filters.search}
                        placeholder="Buscar por nome"
                        aria-label="Buscar por nome"
                    />
                    <ProductFilterFields
                        key={`desktop-${Object.values(filterValues).join('-')}`}
                        categories={categories}
                        idPrefix="desktop-product-filter"
                        values={filterValues}
                    />
                    <Button type="submit" variant="secondary">
                        <Search />
                        Filtrar
                    </Button>
                    {hasAppliedFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={clearFilters}
                        >
                            <X />
                            Limpar filtros
                        </Button>
                    )}
                </form>

                {products.data.length > 0 ? (
                    <>
                        {!isMobile && !isCardPreview && (
                            <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Escolha como visualizar seu catálogo.
                                </p>
                                <ToggleGroup
                                    type="single"
                                    value={view}
                                    onValueChange={(value) => {
                                        if (value) {
                                            setView(value as ProductView);
                                        }
                                    }}
                                    variant="outline"
                                    size="sm"
                                    aria-label="Escolher visualização dos produtos"
                                    className="w-full md:w-fit"
                                >
                                    <ToggleGroupItem
                                        value="table"
                                        aria-label="Visualização em tabela"
                                        className="flex-1 px-3 data-[state=on]:bg-secondary md:flex-none"
                                    >
                                        <Table2 />
                                        Tabela
                                    </ToggleGroupItem>
                                    <ToggleGroupItem
                                        value="cards"
                                        aria-label="Visualização em cards"
                                        className="flex-1 px-3 data-[state=on]:bg-secondary md:flex-none"
                                    >
                                        <LayoutGrid />
                                        Cards
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        )}

                        {isMobile || isCardPreview || view === 'cards' ? (
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
                                <Shirt className="size-7" />
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
                                    <Plus />
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
                                                <ChevronLeft />
                                            ) : isNext ? (
                                                <ChevronRight />
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
                            <Trash2 />
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
