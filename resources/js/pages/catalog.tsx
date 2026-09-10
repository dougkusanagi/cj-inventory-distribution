import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Check,
    MessageCircle,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import CatalogOrderController from '@/actions/App/Http/Controllers/CatalogOrderController';
import AppearanceToggleTab from '@/components/appearance-tabs';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
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
import { useIsMobile } from '@/hooks/use-mobile';
import type { CatalogPreviewProduct } from '@/lib/catalog-preview';
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';

function normalize(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
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
    options: string[];
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
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function ProductPhoto({ product }: { product: CatalogPreviewProduct }) {
    return (
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-t-2xl bg-muted/60">
            {product.image ? (
                <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    data-testid={`catalog-product-image-${product.id}`}
                    className="size-full object-cover"
                />
            ) : (
                <span className="px-6 text-center text-sm text-muted-foreground">
                    Produto sem foto
                </span>
            )}
            <Badge
                variant="secondary"
                className="absolute top-3 left-3 bg-card text-foreground"
            >
                {product.line}
            </Badge>
            <span className="absolute right-3 bottom-3 rounded-md bg-card px-2.5 py-1 text-xs font-medium">
                {product.category}
            </span>
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
                ? `${size}: qtd. não informada`
                : `${size}: ${quantity} ${quantity === 1 ? 'pç' : 'pçs'}`,
        )
        .join(' · ');
}

function SizeBreakdown({
    sizes,
}: {
    sizes: CatalogPreviewProduct['volumes'][number]['sizes'];
}) {
    if (!sizes.some(({ quantity }) => quantity !== null)) {
        return (
            <div className="grid gap-1 text-muted-foreground">
                <p className="text-sm">
                    Tamanhos: {sizes.map(({ size }) => size).join(' · ')}
                </p>
                <p className="text-xs">Quantidade por tamanho não informada.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
                Conteúdo por tamanho
            </p>
            <dl className="flex flex-wrap gap-2">
                {sizes.map(({ size, quantity }) => (
                    <div
                        key={size}
                        className="grid min-w-16 justify-items-center gap-0.5 rounded-lg bg-muted px-3 py-2 tabular-nums"
                        aria-label={
                            quantity === null
                                ? `Tamanho ${size}, quantidade não informada`
                                : `Tamanho ${size}, ${quantity} ${quantity === 1 ? 'peça' : 'peças'}`
                        }
                    >
                        <dt className="text-base leading-5 font-semibold text-foreground">
                            {size}
                        </dt>
                        <dd className="text-xs leading-4 text-muted-foreground">
                            {quantity === null
                                ? 'Não informada'
                                : `${quantity} ${quantity === 1 ? 'pç' : 'pçs'}`}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
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
    onAddVolume: (id: number) => void;
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
                            <SizeBreakdown sizes={volume.sizes} />
                            <Button
                                variant={selected ? 'secondary' : 'default'}
                                className="h-11 w-full"
                                onClick={() =>
                                    selected
                                        ? onRemoveVolume(volume.id)
                                        : onAddVolume(volume.id)
                                }
                                aria-label={
                                    selected
                                        ? `Remover ${volume.name} da sacola`
                                        : `Adicionar ${volume.name}`
                                }
                            >
                                {selected ? <Trash2 /> : <ShoppingBag />}
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
    onRemoveVolume,
    className,
}: {
    bag: CatalogBagItem[];
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
            {bag.length === 0 ? (
                <div className="grid justify-items-center gap-3 py-10 text-center">
                    <ShoppingBag className="size-10 text-muted-foreground" />
                    <p>Sua sacola está vazia.</p>
                </div>
            ) : (
                bag.map(({ product, volume }) => (
                    <article
                        key={volume.id}
                        className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-border p-4"
                    >
                        <div className="grid min-w-0 gap-1">
                            <h3 className="font-semibold">{product.name}</h3>
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
                ))
            )}
        </div>
    );
}

function CatalogCheckout({
    bag,
    canPlaceOrder,
}: {
    bag: CatalogBagItem[];
    canPlaceOrder: boolean;
}) {
    const [checkoutResult, setCheckoutResult] = useState<{
        orderCode: string;
        whatsappUrl: string;
    } | null>(null);
    const form = useForm({
        store_name: '',
        requester_name: '',
        whatsapp: '',
        notes: '',
        order: '',
        volume_ids: [] as number[],
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
                        Clique abaixo e envie os detalhes pelo WhatsApp. Nossa
                        equipe está pronta para atender você.
                    </p>
                </div>
                <Button asChild className="h-12 w-full">
                    <a
                        href={checkoutResult.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="finalizar-whatsapp"
                    >
                        <MessageCircle />
                        Abrir WhatsApp e enviar pedido
                    </a>
                </Button>
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

            {!canPlaceOrder && (
                <p className="rounded-xl bg-muted p-3 text-sm leading-6 text-muted-foreground">
                    Os pedidos estão temporariamente indisponíveis. A equipe
                    ainda precisa configurar o WhatsApp de atendimento.
                </p>
            )}

            <Button
                type="submit"
                className="h-12 w-full"
                disabled={form.processing || bag.length === 0 || !canPlaceOrder}
            >
                <MessageCircle />
                {form.processing
                    ? 'Registrando pedido...'
                    : 'Finalizar no WhatsApp'}
            </Button>
            <p className="text-center text-xs leading-5 text-muted-foreground">
                Seu pedido será registrado antes de abrir a conversa no
                WhatsApp.
            </p>
        </form>
    );
}

export default function Catalog({
    products,
    canPlaceOrder,
}: {
    products: CatalogPreviewProduct[];
    canPlaceOrder: boolean;
}) {
    const { auth } = usePage().props;
    const isMobile = useIsMobile();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [line, setLine] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] =
        useState<CatalogPreviewProduct | null>(null);
    const [selectedVolumeIds, setSelectedVolumeIds] = useState<number[]>([]);
    const [bagOpen, setBagOpen] = useState(false);
    const [feedback, setFeedback] = useState('');

    const filteredProducts = products.filter(
        (product) =>
            normalize(
                `${product.name} ${product.model ?? ''} ${product.code}`,
            ).includes(normalize(query)) &&
            (category === 'all' || product.category === category) &&
            (line === 'all' || product.line === line),
    );
    const bag: CatalogBagItem[] = products.flatMap((product) =>
        product.volumes
            .filter((volume) => selectedVolumeIds.includes(volume.id))
            .map((volume) => ({ product, volume })),
    );
    const totalPieces = bag.reduce((sum, item) => sum + item.volume.pieces, 0);
    const bagDescription = bag.length
        ? `${bag.length} ${bag.length === 1 ? 'saco' : 'sacos'} · ${totalPieces} peças no total`
        : 'Escolha os sacos para reabastecer sua loja.';
    const filterCount = [category, line].filter(
        (value) => value !== 'all',
    ).length;
    const hasFilters = query !== '' || filterCount > 0;

    function clearFilters() {
        setQuery('');
        setCategory('all');
        setLine('all');
    }

    function addVolume(id: number) {
        setSelectedVolumeIds((current) =>
            current.includes(id) ? current : [...current, id],
        );
        setFeedback('Saco adicionado à sacola.');
    }

    function removeVolume(id: number) {
        setSelectedVolumeIds((current) =>
            current.filter((item) => item !== id),
        );
        setFeedback('Saco removido da sacola.');
    }

    return (
        <>
            <Head title="Catálogo para lojistas" />
            <div className="min-h-svh bg-background text-foreground selection:bg-primary/30">
                <a
                    href="#produtos"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
                >
                    Ir para os produtos
                </a>
                <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
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
                                aria-label={`Ver sacola, ${bag.length} sacos`}
                            >
                                <ShoppingBag aria-hidden="true" />
                                <span>Sacola</span>
                                <span className="flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                                    {bag.length}
                                </span>
                            </Button>
                        </div>
                    </div>
                </header>

                <main
                    id="produtos"
                    className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-5 pb-12 sm:px-6 sm:pt-8 lg:px-8"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="grid gap-2">
                            <p className="text-xs font-semibold tracking-widest text-highlight uppercase">
                                Crônicas Jeans · para lojistas
                            </p>
                            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                                Reabasteça sua loja
                            </h1>
                            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                                Encontre a peça e escolha os sacos com os
                                tamanhos que sua loja precisa.
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Sacos completos · escolha por produto
                        </p>
                    </div>

                    <section
                        aria-label="Buscar e filtrar produtos"
                        className="mt-8 mb-3 border-y border-border py-5"
                    >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                            <div className="flex items-end gap-3 sm:contents">
                                <div className="grid min-w-0 flex-1 gap-2">
                                    <Label htmlFor="catalog-search">
                                        O que você procura?
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
                                    className="h-11 shrink-0 sm:hidden"
                                    aria-expanded={filtersOpen}
                                    aria-controls="catalog-filters"
                                    onClick={() =>
                                        setFiltersOpen((current) => !current)
                                    }
                                >
                                    <SlidersHorizontal /> Filtros
                                    {filterCount > 0 && ` (${filterCount})`}
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
                                    options={[
                                        ...new Set(
                                            products.map(
                                                (product) => product.category,
                                            ),
                                        ),
                                    ]}
                                    onChange={setCategory}
                                />
                                <CatalogFilter
                                    id="catalog-line"
                                    label="Linha"
                                    value={line}
                                    options={[
                                        ...new Set(
                                            products.map(
                                                (product) => product.line,
                                            ),
                                        ),
                                    ]}
                                    onChange={setLine}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-2">
                        <p
                            role="status"
                            className="text-sm text-muted-foreground"
                        >
                            <strong className="text-foreground">
                                {filteredProducts.length}
                            </strong>{' '}
                            {filteredProducts.length === 1
                                ? 'produto encontrado'
                                : 'produtos encontrados'}
                            {filterCount > 0 &&
                                ` · ${filterCount} ${filterCount === 1 ? 'filtro aplicado' : 'filtros aplicados'}`}
                        </p>
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                className="h-11"
                                onClick={clearFilters}
                            >
                                <X /> Limpar filtros
                            </Button>
                        )}
                    </div>
                    {filteredProducts.length === 0 ? (
                        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-16 text-center">
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
                        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product) => {
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
                                            'flex min-w-0 flex-col rounded-2xl border bg-card transition-colors motion-reduce:transition-none',
                                            selectedCount > 0
                                                ? 'border-highlight'
                                                : 'border-border hover:border-input',
                                        )}
                                    >
                                        <button
                                            className="rounded-t-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                            onClick={() =>
                                                setSelectedProduct(product)
                                            }
                                            aria-label={`Ver sacos de ${product.name}`}
                                        >
                                            <ProductPhoto product={product} />
                                        </button>
                                        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                                            <div>
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {product.code}
                                                    {product.model &&
                                                        ` · Mod. ${product.model}`}
                                                </p>
                                                <h2 className="mt-1.5 text-xl leading-snug font-semibold tracking-tight text-balance">
                                                    {product.name}
                                                </h2>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="w-fit"
                                            >
                                                {product.type}
                                            </Badge>
                                            <p className="text-sm text-muted-foreground">
                                                Tamanhos nos sacos
                                            </p>
                                            <div
                                                className="flex flex-wrap gap-1.5"
                                                aria-label="Tamanhos presentes"
                                            >
                                                {sizes.map((size) => (
                                                    <span
                                                        key={size}
                                                        className="inline-flex min-w-9 items-center justify-center rounded-md bg-muted px-2.5 py-1 text-sm font-medium tabular-nums"
                                                    >
                                                        {size}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                                                <strong>
                                                    {product.volumes.length}{' '}
                                                    {product.volumes.length ===
                                                    1
                                                        ? 'saco'
                                                        : 'sacos'}
                                                </strong>
                                                <span className="text-muted-foreground">
                                                    {product.volumes.reduce(
                                                        (sum, volume) =>
                                                            sum + volume.pieces,
                                                        0,
                                                    )}{' '}
                                                    peças no total
                                                </span>
                                            </div>
                                            <Button
                                                className="h-12 w-full"
                                                onClick={() =>
                                                    setSelectedProduct(product)
                                                }
                                                aria-label={`Escolher sacos de ${product.name}`}
                                            >
                                                {selectedCount > 0 ? (
                                                    <Check />
                                                ) : (
                                                    <ShoppingBag />
                                                )}
                                                {selectedCount > 0
                                                    ? `Ver sacos · ${selectedCount} na sacola`
                                                    : 'Escolher sacos'}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
                        <p>Crônicas Jeans · Distribuição de estoque</p>
                        <Link
                            href={auth.user ? dashboard() : login()}
                            className="inline-flex min-h-11 items-center underline underline-offset-4"
                        >
                            Área da equipe
                        </Link>
                    </footer>
                </main>
                <p role="status" aria-live="polite" className="sr-only">
                    {feedback}
                </p>

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
                                    bagLength={bag.length}
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
                                    bagLength={bag.length}
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
                                onRemoveVolume={removeVolume}
                                className="px-4 pb-5 sm:px-6"
                            />
                            <CatalogCheckout
                                bag={bag}
                                canPlaceOrder={canPlaceOrder}
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
                                onRemoveVolume={removeVolume}
                                className="flex-1 px-6 py-5"
                            />
                            <CatalogCheckout
                                bag={bag}
                                canPlaceOrder={canPlaceOrder}
                            />
                        </SheetContent>
                    </Sheet>
                )}
            </div>
        </>
    );
}
