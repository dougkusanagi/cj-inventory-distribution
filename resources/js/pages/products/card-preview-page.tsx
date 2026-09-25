import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ChevronDown,
    Pencil,
    ImageOff,
    LayoutGrid,
    Plus,
    Search,
    Shirt,
    SlidersHorizontal,
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import TextLink from '@/components/text-link';
import ProductImageGallery from '@/components/products/product-image-gallery';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
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

type PreviewProps = ProductsIndexProps & {
    listingUrl: string;
    variant: 'v4' | 'v5';
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

function availableProductSizes(product: Product): Array<{
    size: string;
    quantity: number | null;
}> {
    const availableVolumes = product.stock_volumes.filter(
        (volume) => volume.status === 'Disponível' && volume.total_quantity > 0,
    );
    return Array.from(
        availableVolumes
            .flatMap((volume) => volume.items)
            .filter((item) => item.is_active)
            .reduce((bySize, item) => {
                const previous = bySize.get(item.size);

                bySize.set(item.size, {
                    size: item.size,
                    quantity:
                        previous === undefined
                            ? item.quantity
                            : previous.quantity === null ||
                                item.quantity === null
                              ? null
                              : previous.quantity + item.quantity,
                });

                return bySize;
            }, new Map<string, { size: string; quantity: number | null }>()),
    ).map(([, size]) => size);
}

function ProductCard({
    product,
    onDelete,
    onOpenGallery,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
}) {
    const sizes = availableProductSizes(product);

    return (
        <article
            data-testid="product-card"
            className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
            <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                <div className="aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:w-28">
                    <ProductImageButton
                        product={product}
                        onOpenGallery={onOpenGallery}
                        iconClassName="size-8"
                    />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                    <span className="font-mono text-xs font-medium tracking-wide text-muted-foreground">
                        {product.code}
                    </span>
                    <TextLink
                        href={productEdit(product.id)}
                        className="line-clamp-2 text-lg leading-snug font-semibold break-words text-card-foreground sm:text-xl"
                    >
                        {product.name}
                    </TextLink>
                    {product.model && (
                        <span className="text-sm text-muted-foreground">
                            Modelo {product.model}
                        </span>
                    )}
                    <span
                        className={cn(
                            'mt-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                            product.available_for_distribution
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 rounded-full',
                                product.available_for_distribution
                                    ? 'bg-emerald-600 dark:bg-emerald-300'
                                    : 'bg-muted-foreground',
                            )}
                            aria-hidden="true"
                        />
                        {product.available_for_distribution
                            ? 'Disponível'
                            : !product.is_active
                              ? 'Inativo'
                              : product.stock_offer_type === 'new_grade'
                                ? 'Apenas equipe'
                                : 'Sem estoque disponível'}
                    </span>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 border-t border-border px-4 py-4 sm:px-5">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {product.category && (
                        <span className="rounded-md bg-muted px-2 py-1 text-foreground">
                            {product.category.name}
                        </span>
                    )}
                    {product.line && (
                        <span className="rounded-md bg-muted px-2 py-1 text-foreground">
                            {productLineLabels[product.line]}
                        </span>
                    )}
                    {product.stock_offer_type && (
                        <span className="rounded-md bg-muted px-2 py-1 text-foreground">
                            {stockOfferTypeLabels[product.stock_offer_type]}
                        </span>
                    )}
                </div>
                <div className="flex items-end justify-between gap-3 rounded-xl bg-muted/70 px-4 py-3">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            Estoque disponível
                        </p>
                        <p className="mt-0.5 text-2xl leading-none font-semibold text-foreground tabular-nums">
                            {product.available_quantity ?? 0}{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                                peças
                            </span>
                        </p>
                    </div>
                    <span className="text-right text-xs text-muted-foreground">
                        {product.available_stock_volume_count ?? 0}{' '}
                        {(product.available_stock_volume_count ?? 0) === 1
                            ? 'saco disponível'
                            : 'sacos disponíveis'}
                    </span>
                </div>
                <div>
                    {sizes.length > 0 ? (
                        <StockSizeBreakdown sizes={sizes} showUnknownAsCards />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Nenhum tamanho com estoque disponível.
                        </p>
                    )}
                </div>
                {product.notes && (
                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {product.notes}
                    </p>
                )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
                <Button asChild variant="secondary" size="sm">
                    <Link href={productEdit(product.id)}>
                        <Pencil />
                        Editar produto
                        <ArrowUpRight className="ml-1 opacity-60" />
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
        </article>
    );
}

function ProductCardV5({
    product,
    onDelete,
    onOpenGallery,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
}) {
    const sizes = availableProductSizes(product);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const availableQuantity = product.available_quantity ?? 0;
    const availableSacks = product.available_stock_volume_count ?? 0;
    const status = !product.is_active
        ? 'Inativo'
        : product.stock_offer_type === 'new_grade'
          ? 'Uso interno'
          : product.available_for_distribution
            ? 'Disponível'
            : 'Sem estoque livre';

    return (
        <article
            data-testid="product-card-v5"
            className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
        >
            <div className="flex gap-3 p-4">
                <div className="aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:w-24">
                    <ProductImageButton
                        product={product}
                        onOpenGallery={onOpenGallery}
                        iconClassName="size-7"
                    />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                    <span className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
                        {product.code}
                        {product.model && ` · Mod. ${product.model}`}
                    </span>
                    <TextLink
                        href={productEdit(product.id)}
                        className="line-clamp-2 text-base leading-5 font-semibold text-card-foreground sm:text-lg"
                    >
                        {product.name}
                    </TextLink>
                    <span
                        className={cn(
                            'mt-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                            product.available_for_distribution &&
                                product.is_active
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 rounded-full',
                                product.available_for_distribution &&
                                    product.is_active
                                    ? 'bg-emerald-600 dark:bg-emerald-300'
                                    : 'bg-muted-foreground',
                            )}
                            aria-hidden="true"
                        />
                        {status}
                    </span>
                </div>
            </div>

            <div className="grid gap-3 border-t border-border px-4 py-3">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Estoque livre
                        </p>
                        <p className="text-2xl leading-tight font-semibold text-foreground tabular-nums">
                            {availableQuantity}{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                                {availableQuantity === 1 ? 'peça' : 'peças'}
                            </span>
                        </p>
                    </div>
                    <p className="pb-1 text-right text-sm font-medium text-foreground tabular-nums">
                        {availableSacks}{' '}
                        {availableSacks === 1 ? 'saco livre' : 'sacos livres'}
                    </p>
                </div>
                {sizes.length > 0 ? (
                    <div className="grid gap-1.5">
                        <p className="text-xs text-muted-foreground">
                            Tamanhos nos sacos livres
                        </p>
                        <StockSizeBreakdown
                            sizes={sizes}
                            compact
                            showUnknownAsCards
                        />
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Nenhum tamanho com estoque livre.
                    </p>
                )}
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-1 text-muted-foreground"
                        >
                            Detalhes
                            <ChevronDown
                                className={cn(
                                    'transition-transform',
                                    detailsOpen && 'rotate-180',
                                )}
                            />
                        </Button>
                    </CollapsibleTrigger>
                    <Button asChild variant="secondary" size="sm">
                        <Link href={productEdit(product.id)}>
                            <Pencil />
                            Editar produto
                        </Link>
                    </Button>
                </div>
                <CollapsibleContent className="border-t border-border px-4 py-4">
                    <div className="grid gap-3 text-xs text-muted-foreground">
                        <p>
                            {[
                                product.category?.name,
                                product.line
                                    ? productLineLabels[product.line]
                                    : null,
                                product.stock_offer_type
                                    ? stockOfferTypeLabels[
                                          product.stock_offer_type
                                      ]
                                    : null,
                            ]
                                .filter(Boolean)
                                .join(' · ') || 'Sem classificação adicional'}
                        </p>
                        <p className="tabular-nums">
                            Físico: {product.physical_quantity ?? 0} peças
                            {(product.reserved_quantity ?? 0) > 0 &&
                                ` · Reservado: ${product.reserved_quantity}`}
                            {(product.consumed_quantity ?? 0) > 0 &&
                                ` · Baixado: ${product.consumed_quantity}`}
                        </p>
                        {product.notes && <p>{product.notes}</p>}
                        {product.stock_volumes.length > 0 && (
                            <div className="grid max-h-48 gap-1.5 overflow-y-auto">
                                {product.stock_volumes.map((volume) => (
                                    <div
                                        key={volume.id}
                                        className="flex justify-between gap-2 rounded-lg bg-muted px-3 py-2"
                                    >
                                        <span className="min-w-0 truncate">
                                            {volume.code ??
                                                `Saco ${volume.sort_order + 1}`}
                                        </span>
                                        <span className="shrink-0 tabular-nums">
                                            {volume.status} ·{' '}
                                            {volume.total_quantity}{' '}
                                            {volume.total_quantity === 1
                                                ? 'peça'
                                                : 'peças'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit px-1 text-destructive hover:text-destructive"
                            onClick={() => onDelete(product)}
                        >
                            <Trash2 />
                            Excluir produto
                        </Button>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </article>
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

export default function ProductsCardPreview({
    products,
    filters,
    categories,
    listingUrl,
    variant,
}: PreviewProps) {
    const isMobile = useIsMobile();
    const [view, setView] = useState<ProductView>('table');
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
        router.get(listingUrl, values, {
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
                title={variant === 'v5' ? 'Cards v5 — Produtos' : 'Produtos'}
            />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid gap-2">
                        <p className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                            Catálogo interno
                        </p>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                                Produtos
                            </h1>
                            <span className="rounded-full bg-primary px-3 py-1 font-mono text-xs font-bold text-primary-foreground">
                                {products.meta.total
                                    .toString()
                                    .padStart(2, '0')}
                            </span>
                        </div>
                        <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                            {variant === 'v5'
                                ? 'Encontre rápido o saldo, os sacos livres e os tamanhos de cada produto.'
                                : 'Consulte produtos, tamanhos e estoque em um só lugar.'}
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
                            <div className="relative min-w-0 flex-1">
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
                                    className="h-11 bg-background pr-11"
                                />
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-0 right-0 size-11 text-muted-foreground"
                                    aria-label="Buscar produtos"
                                >
                                    <Search />
                                </Button>
                            </div>
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
                        {!isMobile && variant === 'v4' && (
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

                        {variant === 'v5' || isMobile || view === 'cards' ? (
                            <section
                                data-testid="product-cards"
                                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                                aria-label="Produtos cadastrados"
                            >
                                {products.data.map((product) =>
                                    variant === 'v5' ? (
                                        <ProductCardV5
                                            key={product.id}
                                            product={product}
                                            onDelete={setProductToDelete}
                                            onOpenGallery={openProductGallery}
                                        />
                                    ) : (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onDelete={setProductToDelete}
                                            onOpenGallery={openProductGallery}
                                        />
                                    ),
                                )}
                            </section>
                        ) : (
                            <ProductTable
                                products={products.data}
                                onDelete={setProductToDelete}
                                onOpenGallery={openProductGallery}
                            />
                        )}
                    </>
                ) : hasAppliedFilters ? (
                    <Card className="items-center rounded-2xl border-dashed px-5 py-12 text-center shadow-none">
                        <CardHeader className="items-center">
                            <CardTitle className="text-xl">
                                Nenhum produto encontrado
                            </CardTitle>
                            <CardDescription>
                                Tente outro nome ou remova os filtros para ver
                                todos os produtos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="secondary" onClick={clearFilters}>
                                Limpar filtros
                            </Button>
                        </CardContent>
                    </Card>
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
