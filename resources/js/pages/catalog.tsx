import { Head } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ChevronDown,
    Minus,
    PackageCheck,
    Plus,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Sparkles,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';

type Volume = {
    id: number;
    name: string;
    sizes: string[];
    pieces: number;
};

type CatalogProduct = {
    id: number;
    name: string;
    model: string;
    code: string;
    type: 'Reposição' | 'Grade Nova' | 'Grade Furada';
    color: string;
    imagePosition: string;
    volumes: Volume[];
};

type BagItem = {
    product: CatalogProduct;
    volume: Volume;
    selectedSizes: string[];
    quantity: number;
};

const products: CatalogProduct[] = [
    {
        id: 1,
        name: 'Camisa Jeans Premium',
        model: 'CJ 2184',
        code: 'CJ-000184',
        type: 'Grade Nova',
        color: 'from-[#5d7180] via-[#8194a0] to-[#c5cdd0]',
        imagePosition: 'object-center',
        volumes: [
            {
                id: 11,
                name: 'Saco 01',
                sizes: ['P', 'M', 'G', 'GG'],
                pieces: 24,
            },
            { id: 12, name: 'Saco 02', sizes: ['P', 'M', 'G'], pieces: 18 },
        ],
    },
    {
        id: 2,
        name: 'Calça Wide Leg Clara',
        model: 'CJ 3107',
        code: 'CJ-000207',
        type: 'Reposição',
        color: 'from-[#9eb3c0] via-[#718b9c] to-[#3b5669]',
        imagePosition: 'object-[50%_18%]',
        volumes: [
            {
                id: 21,
                name: 'Saco 01',
                sizes: ['36', '38', '40', '42'],
                pieces: 20,
            },
            {
                id: 22,
                name: 'Saco 02',
                sizes: ['38', '40', '42', '44'],
                pieces: 16,
            },
            { id: 23, name: 'Saco 03', sizes: ['36', '38', '40'], pieces: 15 },
        ],
    },
    {
        id: 3,
        name: 'Jaqueta Cropped Stone',
        model: 'CJ 4472',
        code: 'CJ-000231',
        type: 'Grade Furada',
        color: 'from-[#374858] via-[#536a7a] to-[#91a1aa]',
        imagePosition: 'object-bottom',
        volumes: [
            { id: 31, name: 'Saco 01', sizes: ['P', 'M', 'GG'], pieces: 12 },
            { id: 32, name: 'Saco 02', sizes: ['M', 'G'], pieces: 10 },
        ],
    },
    {
        id: 4,
        name: 'Short Mom Vintage',
        model: 'CJ 1938',
        code: 'CJ-000248',
        type: 'Reposição',
        color: 'from-[#688294] via-[#90a7b3] to-[#d3dcdd]',
        imagePosition: 'object-center',
        volumes: [
            {
                id: 41,
                name: 'Saco 01',
                sizes: ['34', '36', '38', '40'],
                pieces: 20,
            },
            {
                id: 42,
                name: 'Saco 02',
                sizes: ['38', '40', '42', '44'],
                pieces: 18,
            },
        ],
    },
];

const filters = ['Todos', 'Grade Nova', 'Reposição', 'Grade Furada'] as const;

function ProductArtwork({ product }: { product: CatalogProduct }) {
    return (
        <div
            className={cn(
                'relative size-full overflow-hidden bg-gradient-to-br',
                product.color,
            )}
        >
            <div className="absolute inset-0 [background-image:repeating-linear-gradient(116deg,transparent_0,transparent_8px,rgba(255,255,255,.16)_9px,transparent_10px)] opacity-35" />
            <div className="absolute top-[13%] left-1/2 h-[76%] w-[58%] -translate-x-1/2 rounded-[46%_46%_22%_22%/18%_18%_12%_12%] border border-white/25 bg-[#244258]/55 shadow-[0_24px_50px_rgba(15,31,42,.35)] backdrop-blur-[1px]">
                <div className="absolute top-0 left-1/2 h-10 w-16 -translate-x-1/2 -translate-y-2 rounded-b-[50%] border-b border-white/35 bg-black/10" />
                <div className="absolute inset-x-[12%] top-[18%] h-px bg-white/30" />
                <div className="absolute top-[24%] left-1/2 h-[58%] w-px bg-white/20" />
                <div className="absolute right-[14%] bottom-[18%] h-[18%] w-[28%] -skew-y-6 border border-white/25 bg-white/5" />
            </div>
            <span className="absolute right-4 bottom-4 rounded-full border border-white/25 bg-black/25 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-white uppercase backdrop-blur-md">
                Denim
            </span>
        </div>
    );
}

function ProductCard({
    product,
    onSelect,
}: {
    product: CatalogProduct;
    onSelect: (product: CatalogProduct) => void;
}) {
    return (
        <article className="group overflow-hidden rounded-[1.65rem] border border-border/70 bg-card shadow-[0_10px_40px_rgba(45,33,25,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(45,33,25,.12)]">
            <button
                type="button"
                onClick={() => onSelect(product)}
                className="relative block aspect-[4/4.8] w-full overflow-hidden text-left"
                aria-label={`Escolher um saco de ${product.name}`}
            >
                <ProductArtwork product={product} />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                    <Badge className="border-0 bg-background/90 text-foreground shadow-sm backdrop-blur-md">
                        {product.type}
                    </Badge>
                    <span className="rounded-full bg-featured-card/85 px-2.5 py-1 text-[11px] font-semibold text-featured-card-foreground backdrop-blur-md">
                        {product.volumes.length}{' '}
                        {product.volumes.length === 1 ? 'saco' : 'sacos'}
                    </span>
                </div>
            </button>

            <div className="grid gap-5 p-5">
                <div className="grid gap-1">
                    <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-highlight uppercase">
                        {product.code}
                    </p>
                    <h2 className="text-xl font-semibold tracking-[-0.025em]">
                        {product.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Modelo {product.model}
                    </p>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                            A partir de
                        </p>
                        <p className="text-sm font-semibold">
                            {Math.min(
                                ...product.volumes.map(
                                    (volume) => volume.pieces,
                                ),
                            )}{' '}
                            peças / saco
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        className="size-11 rounded-full"
                        onClick={() => onSelect(product)}
                        aria-label={`Ver sacos de ${product.name}`}
                    >
                        <ArrowRight className="size-5" />
                    </Button>
                </div>
            </div>
        </article>
    );
}

function SelectionDrawer({
    product,
    onClose,
    onAdd,
}: {
    product: CatalogProduct | null;
    onClose: () => void;
    onAdd: (item: BagItem) => void;
}) {
    const [volumeId, setVolumeId] = useState<number | null>(null);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [quantity, setQuantity] = useState(1);
    const volume =
        product?.volumes.find((item) => item.id === volumeId) ??
        product?.volumes[0];

    function resetAndClose() {
        setVolumeId(null);
        setSelectedSizes([]);
        setQuantity(1);
        onClose();
    }

    function toggleSize(size: string) {
        setSelectedSizes((current) =>
            current.includes(size)
                ? current.filter((item) => item !== size)
                : [...current, size],
        );
    }

    if (!product || !volume) {
        return null;
    }

    return (
        <Drawer open onOpenChange={(open) => !open && resetAndClose()}>
            <DrawerContent className="mx-auto max-w-2xl">
                <div className="overflow-y-auto">
                    <DrawerHeader className="border-b border-border/70 pb-5 text-left">
                        <div className="flex items-start justify-between gap-4">
                            <div className="grid gap-1">
                                <p className="text-[10px] font-semibold tracking-[0.18em] text-highlight uppercase">
                                    Monte seu pedido
                                </p>
                                <DrawerTitle className="text-2xl tracking-tight">
                                    {product.name}
                                </DrawerTitle>
                                <DrawerDescription>
                                    {product.model} · Escolha o saco e os
                                    tamanhos desejados
                                </DrawerDescription>
                            </div>
                            <DrawerClose asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    aria-label="Fechar"
                                >
                                    <X />
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerHeader>

                    <div className="grid gap-7 px-6 py-6">
                        <fieldset className="grid gap-3">
                            <legend className="mb-3 text-sm font-semibold">
                                1. Qual saco você quer?
                            </legend>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {product.volumes.map((item) => {
                                    const selected = item.id === volume.id;

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setVolumeId(item.id);
                                                setSelectedSizes([]);
                                            }}
                                            className={cn(
                                                'flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition',
                                                selected
                                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                                    : 'border-border bg-card hover:border-input',
                                            )}
                                        >
                                            <span>
                                                <span className="block font-semibold">
                                                    {item.name}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                                    {item.pieces} peças
                                                    disponíveis
                                                </span>
                                            </span>
                                            <span
                                                className={cn(
                                                    'flex size-6 items-center justify-center rounded-full border',
                                                    selected
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-input',
                                                )}
                                            >
                                                {selected && (
                                                    <Check
                                                        className="size-3.5"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <fieldset className="grid gap-3">
                            <legend className="mb-3 text-sm font-semibold">
                                2. Quais tamanhos interessam?
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {volume.sizes.map((size) => {
                                    const selected =
                                        selectedSizes.includes(size);

                                    return (
                                        <button
                                            key={size}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => toggleSize(size)}
                                            className={cn(
                                                'flex h-12 min-w-12 items-center justify-center rounded-xl border px-4 font-mono text-sm font-semibold transition',
                                                selected
                                                    ? 'border-featured-card bg-featured-card text-featured-card-foreground'
                                                    : 'border-input bg-background hover:bg-muted',
                                            )}
                                        >
                                            {size}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Você pode selecionar mais de um tamanho do mesmo
                                saco.
                            </p>
                        </fieldset>

                        <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/65 p-4">
                            <div>
                                <p className="text-sm font-semibold">
                                    Quantidade de sacos
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Ajuste conforme sua necessidade
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() =>
                                        setQuantity((current) =>
                                            Math.max(1, current - 1),
                                        )
                                    }
                                    disabled={quantity === 1}
                                    aria-label="Diminuir quantidade"
                                >
                                    <Minus />
                                </Button>
                                <span className="min-w-5 text-center text-lg font-semibold">
                                    {quantity}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() =>
                                        setQuantity((current) => current + 1)
                                    }
                                    aria-label="Aumentar quantidade"
                                >
                                    <Plus />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <DrawerFooter className="border-t border-border/70 bg-background pt-4">
                    <Button
                        type="button"
                        size="lg"
                        className="h-12 rounded-xl"
                        disabled={selectedSizes.length === 0}
                        onClick={() => {
                            onAdd({ product, volume, selectedSizes, quantity });
                            resetAndClose();
                        }}
                    >
                        <ShoppingBag />
                        Adicionar à sacola
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

function BagDrawer({
    items,
    open,
    onOpenChange,
    onRemove,
}: {
    items: BagItem[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove: (index: number) => void;
}) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="mx-auto max-w-2xl">
                <DrawerHeader className="border-b border-border/70 text-left">
                    <DrawerTitle className="flex items-center gap-2 text-2xl">
                        <ShoppingBag className="text-highlight" /> Sua sacola
                    </DrawerTitle>
                    <DrawerDescription>
                        Revise os sacos e tamanhos antes de continuar.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="grid max-h-[52vh] gap-3 overflow-y-auto p-6">
                    {items.length === 0 ? (
                        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-input py-12 text-center">
                            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <ShoppingBag />
                            </span>
                            <div>
                                <p className="font-semibold">
                                    Sua sacola está vazia
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Escolha um produto para começar.
                                </p>
                            </div>
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <div
                                key={`${item.volume.id}-${index}`}
                                className="flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-4"
                            >
                                <div
                                    className={cn(
                                        'size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br',
                                        item.product.color,
                                    )}
                                >
                                    <ProductArtwork product={item.product} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                        {item.product.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.volume.name} · {item.quantity}{' '}
                                        {item.quantity === 1 ? 'saco' : 'sacos'}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {item.selectedSizes.map((size) => (
                                            <span
                                                key={size}
                                                className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] font-semibold"
                                            >
                                                {size}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="-mt-1 -mr-1 size-8 rounded-full text-muted-foreground"
                                    onClick={() => onRemove(index)}
                                    aria-label={`Remover ${item.product.name}`}
                                >
                                    <X />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
                <DrawerFooter className="border-t border-border/70 bg-background pt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Total selecionado
                        </span>
                        <strong>
                            {items.reduce(
                                (total, item) => total + item.quantity,
                                0,
                            )}{' '}
                            sacos
                        </strong>
                    </div>
                    <Button
                        type="button"
                        size="lg"
                        className="h-12 rounded-xl"
                        disabled={items.length === 0}
                        onClick={() => onOpenChange(false)}
                    >
                        Revisar pedido <ArrowRight />
                    </Button>
                    <p className="text-center text-[11px] text-muted-foreground">
                        Protótipo visual — nenhum pedido será enviado.
                    </p>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

export default function Catalog() {
    const [activeFilter, setActiveFilter] =
        useState<(typeof filters)[number]>('Todos');
    const [query, setQuery] = useState('');
    const [selectedProduct, setSelectedProduct] =
        useState<CatalogProduct | null>(null);
    const [bagItems, setBagItems] = useState<BagItem[]>([]);
    const [bagOpen, setBagOpen] = useState(false);

    const filteredProducts = useMemo(
        () =>
            products.filter((product) => {
                const matchesFilter =
                    activeFilter === 'Todos' || product.type === activeFilter;
                const searchable =
                    `${product.name} ${product.model} ${product.code}`.toLocaleLowerCase(
                        'pt-BR',
                    );

                return (
                    matchesFilter &&
                    searchable.includes(query.toLocaleLowerCase('pt-BR'))
                );
            }),
        [activeFilter, query],
    );

    const bagCount = bagItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <>
            <Head title="Catálogo" />
            <div className="min-h-screen bg-background text-foreground">
                <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <a
                            href="#catalogo"
                            className="flex items-center gap-3"
                            aria-label="Crônicas Jeans - início do catálogo"
                        >
                            <img
                                src="/images/brand/logo-cronicas-color.png"
                                alt="Crônicas Jeans"
                                className="h-8 w-auto dark:hidden"
                            />
                            <img
                                src="/images/brand/logo-cronicas-white.png"
                                alt="Crônicas Jeans"
                                className="hidden h-8 w-auto dark:block"
                            />
                            <span className="hidden h-5 w-px bg-border sm:block" />
                            <span className="hidden text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase sm:block">
                                Distribuição
                            </span>
                        </a>
                        <Button
                            type="button"
                            variant="outline"
                            className="relative rounded-full"
                            onClick={() => setBagOpen(true)}
                        >
                            <ShoppingBag />
                            <span className="hidden sm:inline">
                                Minha sacola
                            </span>
                            {bagCount > 0 && (
                                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {bagCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </header>

                <main id="catalogo">
                    <section className="relative overflow-hidden bg-featured-card text-featured-card-foreground">
                        <div className="pointer-events-none absolute -top-24 right-[8%] size-80 rounded-full border-[42px] border-primary/10" />
                        <div className="pointer-events-none absolute -bottom-36 left-[45%] size-80 rounded-full bg-brand/15 blur-3xl" />
                        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:px-8 lg:py-20">
                            <div className="grid gap-5">
                                <div className="flex items-center gap-2 text-primary">
                                    <Sparkles className="size-4" />
                                    <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                                        Seleção da semana
                                    </p>
                                </div>
                                <h1 className="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.055em] sm:text-6xl">
                                    Escolha seus tamanhos. A gente separa o
                                    saco.
                                </h1>
                                <p className="max-w-xl text-sm leading-6 text-featured-card-muted sm:text-base">
                                    Veja o estoque disponível, escolha o saco
                                    com a grade ideal para sua loja e monte seu
                                    pedido em poucos passos.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <PackageCheck className="mb-5 size-5 text-primary" />
                                    <strong className="block text-2xl">
                                        09
                                    </strong>
                                    <span className="text-xs text-featured-card-muted">
                                        sacos disponíveis
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <ShoppingBag className="mb-5 size-5 text-primary" />
                                    <strong className="block text-2xl">
                                        04
                                    </strong>
                                    <span className="text-xs text-featured-card-muted">
                                        modelos nesta seleção
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8">
                        <div className="grid gap-5 border-b border-border/70 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                    Estoque disponível
                                </p>
                                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                                    Encontre a grade certa
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Cada opção mostra os tamanhos disponíveis em
                                    um saco real.
                                </p>
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Buscar modelo ou produto"
                                    className="h-11 rounded-xl bg-card pr-10 pl-10"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                                        onClick={() => setQuery('')}
                                        aria-label="Limpar busca"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto py-5 [&::-webkit-scrollbar]:hidden">
                            <span className="flex shrink-0 items-center gap-2 pr-2 text-xs font-semibold text-muted-foreground">
                                <SlidersHorizontal className="size-4" /> Filtrar
                            </span>
                            {filters.map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setActiveFilter(filter)}
                                    className={cn(
                                        'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition',
                                        activeFilter === filter
                                            ? 'border-featured-card bg-featured-card text-featured-card-foreground'
                                            : 'border-border bg-card hover:border-input',
                                    )}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onSelect={setSelectedProduct}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="grid place-items-center gap-3 rounded-[1.75rem] border border-dashed border-input py-20 text-center">
                                <Search className="size-8 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">
                                        Nenhum produto encontrado
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Tente outro termo ou filtro.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                </main>

                <div
                    className={cn(
                        'fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 p-3 backdrop-blur-xl transition sm:hidden',
                        bagCount === 0 && 'translate-y-full',
                    )}
                >
                    <Button
                        type="button"
                        size="lg"
                        className="h-12 w-full rounded-xl"
                        onClick={() => setBagOpen(true)}
                    >
                        <ShoppingBag /> Ver sacola · {bagCount}{' '}
                        {bagCount === 1 ? 'saco' : 'sacos'}{' '}
                        <ChevronDown className="ml-auto size-4 rotate-180" />
                    </Button>
                </div>

                <footer className="border-t border-border/70 bg-card">
                    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                        <span>Crônicas Jeans · Catálogo de distribuição</span>
                        <span>Feito para facilitar seu pedido</span>
                    </div>
                </footer>
            </div>

            <SelectionDrawer
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAdd={(item) => setBagItems((current) => [...current, item])}
            />
            <BagDrawer
                items={bagItems}
                open={bagOpen}
                onOpenChange={setBagOpen}
                onRemove={(index) =>
                    setBagItems((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                    )
                }
            />
        </>
    );
}
