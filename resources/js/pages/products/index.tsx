import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ImageOff,
    LayoutGrid,
    Package,
    Plus,
    Search,
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
import { cn } from '@/lib/utils';
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

type ProductsIndexProps = {
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
    if (label.includes('Previous') || label.includes('laquo')) {
        return 'Anterior';
    }

    if (label.includes('Next') || label.includes('raquo')) {
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
    className,
    iconClassName,
}: {
    product: Product;
    onOpenGallery: (product: Product) => void;
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
            {product.images.length > 1 && (
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

function ProductCard({
    product,
    onDelete,
    onOpenGallery,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    onOpenGallery: (product: Product) => void;
}) {
    return (
        <article
            data-testid="product-card"
            className="group flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-featured-card">
                <ProductImageButton
                    product={product}
                    onOpenGallery={onOpenGallery}
                    className="transition duration-500 group-hover:scale-105"
                    iconClassName="size-8"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
                    <span className="rounded-full bg-background/90 px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-foreground shadow-sm backdrop-blur">
                        {product.code}
                    </span>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-5 p-5">
                <div className="grid gap-2">
                    <div className="flex items-start justify-between gap-3">
                        <TextLink
                            href={productEdit(product.id)}
                            className="text-xl leading-tight font-semibold tracking-tight text-card-foreground"
                        >
                            {product.name}
                        </TextLink>
                        <span
                            className="mt-1 size-2 shrink-0 rounded-full bg-muted-foreground/60"
                            aria-hidden="true"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {product.model
                            ? `Modelo ${product.model}`
                            : 'Modelo não informado'}
                    </p>
                    <ProductClassification product={product} />
                </div>

                <div className="flex min-h-7 flex-wrap gap-1.5">
                    <ProductSizes product={product} />
                </div>

                <div className="mt-auto grid gap-4 border-t border-border pt-4">
                    <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                        {product.notes ?? 'Nenhuma observação registrada.'}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-card-foreground">
                            {product.total_quantity ?? 0} peças
                        </span>
                        {product.stock_volume_count !== undefined &&
                        product.stock_volume_count > 0 ? (
                            <span className="text-xs text-muted-foreground">
                                · {product.stock_volume_count}{' '}
                                {product.stock_volume_count === 1
                                    ? 'saco'
                                    : 'sacos'}
                            </span>
                        ) : null}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                            Estoque total
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
                                    Estoque total
                                </span>
                                {product.total_quantity !== null &&
                                product.total_quantity !== undefined ? (
                                    <>
                                        <p className="font-semibold text-card-foreground">
                                            {product.total_quantity}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {product.stock_volume_count !==
                                                undefined &&
                                            product.stock_volume_count > 0
                                                ? `${product.stock_volume_count} ${product.stock_volume_count === 1 ? 'saco' : 'sacos'}`
                                                : 'unidades'}
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
}: ProductsIndexProps) {
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
        router.get(productsIndex.url(), values, {
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
            onFinish: () => {
                setDeleting(false);
                setProductToDelete(null);
            },
        });
    };

    return (
        <>
            <Head title="Produtos" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid gap-3">
                        <p className="text-xs font-semibold tracking-[0.22em] text-highlight uppercase">
                            Painel de distribuição / catálogo
                        </p>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                                Produtos
                            </h1>
                            <span className="rounded-full bg-primary px-3 py-1 font-mono text-xs font-bold text-primary-foreground">
                                {products.meta.total
                                    .toString()
                                    .padStart(2, '0')}
                            </span>
                        </div>
                        <p className="max-w-xl text-base leading-7 text-muted-foreground">
                            A identidade de cada peça fica aqui. Depois, ela
                            pode receber diferentes ofertas e condições de
                            estoque.
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
                </form>

                {products.data.length > 0 ? (
                    <>
                        {!isMobile && (
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

                        {isMobile || view === 'cards' ? (
                            <section
                                data-testid="product-cards"
                                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                                aria-label="Produtos cadastrados"
                            >
                                {products.data.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onDelete={setProductToDelete}
                                        onOpenGallery={openProductGallery}
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
                                <Package className="size-7" />
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
                                link.label.includes('Previous') ||
                                link.label.includes('laquo');
                            const isNext =
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
                                ? `“${productToDelete.name}”, suas fotos, tamanhos e estoque serão removidos permanentemente.`
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
