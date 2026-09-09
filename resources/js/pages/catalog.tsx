import { Head, Link, usePage } from '@inertiajs/react';
import {
    Check,
    PackageOpen,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
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
import { catalogPreviewProducts } from '@/lib/catalog-preview';
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
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-muted/60">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <PackageOpen className="size-12 stroke-1" aria-hidden="true" />
                <span className="text-sm">Foto em breve</span>
            </div>
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

export default function Catalog() {
    const { auth } = usePage().props;
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [line, setLine] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] =
        useState<CatalogPreviewProduct | null>(null);
    const [selectedVolumeIds, setSelectedVolumeIds] = useState<number[]>([]);
    const [bagOpen, setBagOpen] = useState(false);
    const [feedback, setFeedback] = useState('');

    const products = catalogPreviewProducts.filter(
        (product) => product.type !== 'Grade Nova',
    );
    const filteredProducts = products.filter(
        (product) =>
            normalize(
                `${product.name} ${product.model ?? ''} ${product.code}`,
            ).includes(normalize(query)) &&
            (category === 'all' || product.category === category) &&
            (line === 'all' || product.line === line),
    );
    const bag = products.flatMap((product) =>
        product.volumes
            .filter((volume) => selectedVolumeIds.includes(volume.id))
            .map((volume) => ({ product, volume })),
    );
    const totalPieces = bag.reduce((sum, item) => sum + item.volume.pieces, 0);
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
            <div className="min-h-svh bg-background text-foreground">
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
                                className="h-auto max-h-10 w-32 object-contain sm:w-40 dark:hidden"
                            />
                            <img
                                src="/images/brand/logo-cronicas-white.png"
                                alt="Crônicas Jeans"
                                className="hidden h-auto max-h-10 w-32 object-contain sm:w-40 dark:block"
                            />
                        </a>
                        <Button
                            variant="secondary"
                            className="h-11 shrink-0 gap-2"
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
                </header>

                <main
                    id="produtos"
                    className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-6 pb-40 sm:px-6 lg:px-8"
                >
                    <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm leading-6">
                        <span className="font-semibold text-highlight">
                            Catálogo de demonstração.
                        </span>{' '}
                        Produtos ilustrativos para experimentar a sacola. Nenhum
                        pedido será enviado.
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="grid gap-2">
                            <p className="text-xs font-semibold tracking-widest text-highlight uppercase">
                                Crônicas Jeans · para lojistas
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
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
                        className="my-6 grid gap-4 rounded-2xl border border-border bg-card/50 p-4 sm:p-5"
                    >
                        <div className="flex items-end gap-2">
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
                                className="h-11 sm:hidden"
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
                                'grid grid-cols-1 gap-4 sm:grid sm:grid-cols-2',
                                !filtersOpen && 'hidden',
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
                                options={['Slim', 'Plus']}
                                onChange={setLine}
                            />
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
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product) => {
                                const selectedCount = product.volumes.filter(
                                    (volume) =>
                                        selectedVolumeIds.includes(volume.id),
                                ).length;
                                const sizes = [
                                    ...new Set(
                                        product.volumes.flatMap(
                                            (volume) => volume.sizes,
                                        ),
                                    ),
                                ];

                                return (
                                    <article
                                        key={product.id}
                                        data-testid="catalog-product"
                                        className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-input"
                                    >
                                        <button
                                            className="rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            onClick={() =>
                                                setSelectedProduct(product)
                                            }
                                            aria-label={`Ver sacos de ${product.name}`}
                                        >
                                            <ProductPhoto product={product} />
                                        </button>
                                        <div className="mt-4 flex flex-1 flex-col gap-3">
                                            <div>
                                                <p className="font-mono text-xs text-highlight">
                                                    {product.code}
                                                    {product.model &&
                                                        ` · Mod. ${product.model}`}
                                                </p>
                                                <h2 className="mt-1 text-xl font-semibold tracking-tight">
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
                                                        className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-sm"
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
                {bag.length > 0 && (
                    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
                        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                            <div className="min-w-0 text-sm">
                                <strong className="block">
                                    {bag.length}{' '}
                                    {bag.length === 1
                                        ? 'saco na sacola'
                                        : 'sacos na sacola'}
                                </strong>
                                <span className="text-muted-foreground">
                                    {totalPieces} peças
                                </span>
                            </div>
                            <Button
                                className="h-12 shrink-0"
                                onClick={() => setBagOpen(true)}
                            >
                                Revisar sacola <ShoppingBag />
                            </Button>
                        </div>
                    </div>
                )}

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
                                Escolha os sacos completos. Os tamanhos mostram
                                o conteúdo de cada saco.
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
                        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6">
                            {selectedProduct?.volumes.map((volume) => {
                                const selected = selectedVolumeIds.includes(
                                    volume.id,
                                );

                                return (
                                    <section
                                        key={volume.id}
                                        className={cn(
                                            'mb-3 grid gap-3 rounded-xl border p-4',
                                            selected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border',
                                        )}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="font-semibold">
                                                {volume.name}
                                            </h3>
                                            <strong>
                                                {volume.pieces} peças
                                            </strong>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Tamanhos: {volume.sizes.join(' · ')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Quantidade por tamanho não
                                            informada.
                                        </p>
                                        <Button
                                            variant={
                                                selected
                                                    ? 'secondary'
                                                    : 'default'
                                            }
                                            className="h-11 w-full"
                                            disabled={selected}
                                            onClick={() => addVolume(volume.id)}
                                            aria-label={
                                                selected
                                                    ? `${volume.name} já está na sacola`
                                                    : `Adicionar ${volume.name}`
                                            }
                                        >
                                            {selected ? (
                                                <Check />
                                            ) : (
                                                <ShoppingBag />
                                            )}
                                            {selected
                                                ? 'Na sacola'
                                                : 'Adicionar saco'}
                                        </Button>
                                    </section>
                                );
                            })}
                        </div>
                        <DrawerFooter className="shrink-0 border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
                            <Button
                                className="h-12"
                                onClick={() => {
                                    setSelectedProduct(null);
                                    setBagOpen(true);
                                }}
                                disabled={bag.length === 0}
                            >
                                Revisar sacola ({bag.length})
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="ghost" className="h-11">
                                    Continuar escolhendo
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>

                <Drawer open={bagOpen} onOpenChange={setBagOpen}>
                    <DrawerContent className="mx-auto max-w-2xl">
                        <DrawerHeader className="relative shrink-0 pr-16 text-left">
                            <DrawerTitle>Sua sacola</DrawerTitle>
                            <DrawerDescription>
                                {bag.length
                                    ? `${bag.length} ${bag.length === 1 ? 'saco' : 'sacos'} · ${totalPieces} peças no total`
                                    : 'Escolha os sacos para reabastecer sua loja.'}
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
                        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6">
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
                                            <h3 className="font-semibold">
                                                {product.name}
                                            </h3>
                                            <p className="text-sm">
                                                {volume.name} · {volume.pieces}{' '}
                                                peças
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {volume.sizes.join(' · ')}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-11 shrink-0"
                                            onClick={() =>
                                                removeVolume(volume.id)
                                            }
                                            aria-label={`Remover ${volume.name} de ${product.name}`}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </article>
                                ))
                            )}
                        </div>
                        <DrawerFooter className="shrink-0 border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
                            <p className="rounded-lg bg-muted p-3 text-sm leading-6">
                                Esta é uma demonstração. A sacola fica apenas
                                nesta página e será limpa ao recarregar. O envio
                                de pedidos será disponibilizado na próxima
                                etapa.
                            </p>
                            <DrawerClose asChild>
                                <Button className="h-12">
                                    Continuar escolhendo
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </div>
        </>
    );
}
