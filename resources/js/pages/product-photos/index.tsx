import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircleIcon,
    ImageBrokenIcon,
    ImagesIcon,
    ListBulletsIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import ProductPhotoController from '@/actions/App/Http/Controllers/ProductPhotoController';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Pagination } from '@/components/pagination';
import { ProductImage } from '@/components/products/product-image';
import { ProductPhotoManager } from '@/components/products/product-photo-manager';
import { SearchFilterBar } from '@/components/search-filter-bar';
import type { FilterField } from '@/components/search-filter-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { index } from '@/routes/product-photos';
import type { Paginated, Product } from '@/types';

const MAX_IMAGES = 5;

type PhotoProduct = Pick<
    Product,
    'id' | 'code' | 'name' | 'model' | 'category' | 'is_active' | 'images'
>;

type Filters = {
    search: string;
    image: string;
};

export default function ProductPhotos({
    products,
    filters,
    withoutPhotosCount,
}: {
    products: Paginated<PhotoProduct>;
    filters: Filters;
    withoutPhotosCount: number;
}) {
    const [filterValues, setFilterValues] = useState<Filters>(filters);
    const filtersMounted = useRef(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected =
        products.data.find((product) => product.id === selectedId) ?? null;
    const hasFilters =
        filterValues.search !== '' || filterValues.image !== 'all';

    useEffect(() => {
        if (!filtersMounted.current) {
            filtersMounted.current = true;

            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(index.url(), filterValues, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [filterValues]);

    const clearFilters = () => setFilterValues({ search: '', image: 'all' });
    const filterFields: FilterField[] = [
        {
            name: 'image',
            label: 'Fotos',
            value: filterValues.image,
            allLabel: 'Todos os produtos',
            allCardLabel: 'Todos',
            allIcon: ListBulletsIcon,
            display: 'cards',
            options: [
                { value: 'without', label: 'Sem foto', icon: ImageBrokenIcon },
                { value: 'with', label: 'Com foto', icon: CheckCircleIcon },
            ],
        },
    ];

    return (
        <>
            <Head title="Fotos dos produtos" />
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Marketing
                        </p>
                        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
                            <ImagesIcon className="size-8 text-primary" />
                            Fotos dos produtos
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Toque em um produto para adicionar, remover,
                            recortar ou girar fotos e escolher a capa. Cada
                            produto aceita até {MAX_IMAGES} fotos.
                        </p>
                    </div>
                    {withoutPhotosCount > 0 &&
                        filterValues.image !== 'without' && (
                            <Button
                                type="button"
                                variant="secondary"
                                className="h-11 w-full sm:h-9 sm:w-fit"
                                onClick={() =>
                                    setFilterValues((current) => ({
                                        ...current,
                                        image: 'without',
                                    }))
                                }
                            >
                                <ImageBrokenIcon />
                                Ver {withoutPhotosCount}{' '}
                                {withoutPhotosCount === 1
                                    ? 'produto sem foto'
                                    : 'produtos sem foto'}
                            </Button>
                        )}
                </header>

                <SearchFilterBar
                    idPrefix="photo-filter"
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
                    onClear={clearFilters}
                    resultCount={products.meta.total}
                />

                {products.data.length === 0 ? (
                    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
                        <p className="font-medium">
                            {hasFilters
                                ? 'Nenhum produto encontrado com estes filtros.'
                                : 'Nenhum produto cadastrado ainda.'}
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            {hasFilters
                                ? 'Revise a busca ou limpe os filtros para ver todos os produtos.'
                                : 'Os produtos cadastrados pela equipe de estoque aparecerão aqui para receber fotos.'}
                        </p>
                        {hasFilters && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearFilters}
                            >
                                Limpar filtros
                            </Button>
                        )}
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {products.data.map((product) => (
                            <li key={product.id}>
                                <PhotoProductCard
                                    product={product}
                                    onOpen={() => setSelectedId(product.id)}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                {products.links.length > 3 && (
                    <Pagination
                        links={products.links}
                        compact
                        ariaLabel="Paginação de produtos"
                    />
                )}
            </div>

            {selected && (
                <ProductPhotosDrawer
                    key={selected.id}
                    product={selected}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </>
    );
}

function PhotoProductCard({
    product,
    onOpen,
}: {
    product: PhotoProduct;
    onOpen: () => void;
}) {
    const count = product.images.length;
    const reference = [product.code, product.model].filter(Boolean).join(' · ');

    return (
        <button
            type="button"
            onClick={onOpen}
            data-testid={`photo-product-${product.id}`}
            className="group grid h-full w-full content-start overflow-hidden rounded-2xl border bg-card text-left transition-colors outline-none hover:border-highlight focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            <span className="relative block aspect-[4/5] bg-muted">
                <ProductImage
                    product={product as Product}
                    iconClassName="size-8"
                />
                <Badge
                    variant={count === 0 ? 'outline' : 'secondary'}
                    className="absolute top-2 left-2 rounded-full bg-background/90"
                >
                    {count === 0 ? 'Sem foto' : `${count}/${MAX_IMAGES} fotos`}
                </Badge>
            </span>
            <span className="grid min-w-0 gap-0.5 p-3">
                <span className="line-clamp-2 text-sm font-semibold break-words">
                    {product.name}
                </span>
                <span
                    className="truncate font-mono text-xs text-muted-foreground"
                    title={reference}
                >
                    {reference}
                </span>
                {!product.is_active && (
                    <span className="text-xs text-muted-foreground">
                        Inativo
                    </span>
                )}
            </span>
        </button>
    );
}

function ProductPhotosDrawer({
    product,
    onClose,
}: {
    product: PhotoProduct;
    onClose: () => void;
}) {
    const isMobile = useIsMobile();
    const [processingImages, setProcessingImages] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const initialOrder = product.images.map((image) => 'media:' + image.id);
    const form = useForm({
        images: [] as File[],
        image_order: initialOrder,
        remove_media_ids: [] as number[],
        _method: 'PUT' as const,
    });
    const hasChanges =
        form.data.images.length > 0 ||
        form.data.remove_media_ids.length > 0 ||
        form.data.image_order.join() !== initialOrder.join();
    const requestClose = () => {
        if (form.processing) return;
        if (hasChanges) {
            setConfirmDiscard(true);

            return;
        }
        onClose();
    };
    const save = () =>
        form.post(ProductPhotoController.update.url(product.id), {
            forceFormData: form.data.images.length > 0,
            preserveScroll: true,
            preserveState: true,
            onSuccess: onClose,
        });
    const errorMessages = Object.values(form.errors);

    return (
        <>
            <Drawer
                open
                direction={isMobile ? 'bottom' : 'right'}
                onOpenChange={(open) => {
                    if (!open) requestClose();
                }}
                dismissible={!form.processing}
            >
                <DrawerContent
                    side={isMobile ? 'bottom' : 'right'}
                    className="max-h-[calc(100dvh-1rem)] overflow-hidden sm:max-w-2xl"
                    data-testid="product-photos-drawer"
                >
                    <DrawerHeader className="relative shrink-0 pr-16 text-left">
                        <DrawerTitle className="min-w-0 [overflow-wrap:anywhere]">
                            {product.name}
                        </DrawerTitle>
                        <DrawerDescription className="[overflow-wrap:anywhere]">
                            {[product.code, product.model]
                                .filter(Boolean)
                                .join(' · ')}
                        </DrawerDescription>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-5 right-4"
                            aria-label="Fechar fotos do produto"
                            disabled={form.processing}
                            onClick={requestClose}
                        >
                            <XIcon weight="bold" />
                        </Button>
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6">
                        <ProductPhotoManager
                            value={form.data.images}
                            existingImages={product.images}
                            error={
                                form.errors.images ?? form.errors.image_order
                            }
                            errors={form.errors as Record<string, string>}
                            onChange={(change) => {
                                form.clearErrors();
                                form.setData((previous) => ({
                                    ...previous,
                                    images: change.files,
                                    image_order: change.imageOrder,
                                    remove_media_ids: change.removeMediaIds,
                                }));
                            }}
                            onProcessingChange={setProcessingImages}
                        />
                    </div>
                    <DrawerFooter className="shrink-0 gap-3 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
                        <div aria-live="polite" className="grid gap-1">
                            {errorMessages.length > 0 ? (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {errorMessages[0]}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {hasChanges
                                        ? 'Alterações ainda não salvas.'
                                        : 'Nenhuma alteração.'}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 sm:h-9"
                                disabled={form.processing}
                                onClick={requestClose}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                className="h-11 sm:h-9"
                                disabled={
                                    !hasChanges ||
                                    form.processing ||
                                    processingImages
                                }
                                onClick={save}
                            >
                                {form.processing
                                    ? 'Salvando...'
                                    : processingImages
                                      ? 'Preparando fotos...'
                                      : 'Salvar fotos'}
                            </Button>
                        </div>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
            <ConfirmationDialog
                open={confirmDiscard}
                onOpenChange={setConfirmDiscard}
                title="Descartar alterações?"
                description="As fotos adicionadas, removidas ou editadas neste produto não serão salvas."
                confirmLabel="Descartar"
                cancelLabel="Continuar editando"
                destructive
                onConfirm={() => {
                    setConfirmDiscard(false);
                    onClose();
                }}
            />
        </>
    );
}

ProductPhotos.layout = {
    breadcrumbs: [
        {
            title: 'Fotos dos produtos',
            href: index(),
        },
    ],
};
