import {
    CheckCircleIcon,
    ImagesIcon,
    ListIcon,
    SquaresFourIcon,
    SquareIcon,
    ArrowLeftIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import ImageCarousel from '@/components/image-carousel';
import type { Product } from '@/components/production/types';
import { SearchField } from '@/components/search-filter-bar';
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
import { cn } from '@/lib/utils';

type View = 'list' | 'compact' | 'large';
const views = [
    { value: 'list', label: 'Lista', icon: ListIcon },
    { value: 'compact', label: 'Cards compactos', icon: SquaresFourIcon },
    { value: 'large', label: 'Cards grandes', icon: SquareIcon },
] as const;

function normalize(value: string) {
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

export function ProductPicker({
    open,
    products,
    selectedId,
    onSelect,
    onClose,
}: {
    open: boolean;
    products: Product[];
    selectedId: string;
    onSelect: (product: Product) => void;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const [query, setQuery] = useState('');
    const [view, setView] = useState<View>(() => {
        try {
            const saved = window.localStorage.getItem(
                'production-product-view',
            );
            return saved === 'list' || saved === 'large' ? saved : 'compact';
        } catch {
            return 'compact';
        }
    });
    useEffect(() => {
        try {
            window.localStorage.setItem('production-product-view', view);
        } catch {
            /* A seleção continua disponível sem armazenamento local. */
        }
    }, [view]);
    const term = normalize(query.trim());
    const filtered = products.filter((product) =>
        normalize(
            `${product.name} ${product.code} ${product.model ?? ''}`,
        ).includes(term),
    );
    return (
        <Drawer
            open={open}
            direction={mobile ? 'bottom' : 'right'}
            onOpenChange={(value) => {
                if (!value) onClose();
            }}
        >
            <DrawerContent
                side={mobile ? 'bottom' : 'right'}
                className="sm:max-w-4xl"
            >
                <DrawerHeader className="shrink-0 gap-4 border-b">
                    <div>
                        <DrawerTitle>Escolher produto</DrawerTitle>
                        <DrawerDescription>
                            Veja as fotos e escolha o produto deste lote.
                        </DrawerDescription>
                    </div>
                    <SearchField
                        id="production-product-search"
                        label="Buscar produto"
                        value={query}
                        onClear={() => setQuery('')}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Nome, código ou modelo"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p
                            role="status"
                            className="text-sm text-muted-foreground"
                        >
                            {filtered.length}{' '}
                            {filtered.length === 1 ? 'produto' : 'produtos'}
                        </p>
                        <div
                            role="group"
                            aria-label="Visualização dos produtos"
                            className="flex items-center gap-1"
                        >
                            {views.map(({ value, label, icon: Icon }) => (
                                <Button
                                    key={value}
                                    type="button"
                                    variant={
                                        view === value ? 'secondary' : 'ghost'
                                    }
                                    size="icon"
                                    aria-label={label}
                                    title={label}
                                    aria-pressed={view === value}
                                    onClick={() => setView(value)}
                                    className="h-11"
                                >
                                    <Icon />
                                </Button>
                            ))}
                        </div>
                    </div>
                </DrawerHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    {filtered.length ? (
                        <div
                            data-testid="production-product-grid"
                            data-view={view}
                            className={cn(
                                'grid gap-3',
                                view === 'compact'
                                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                                    : view === 'large'
                                      ? 'grid-cols-1 sm:grid-cols-2'
                                      : 'grid-cols-1',
                            )}
                        >
                            {filtered.map((product) => {
                                const selected =
                                    String(product.id) === selectedId;
                                return (
                                    <article
                                        key={product.id}
                                        aria-label={product.name}
                                        className={cn(
                                            'min-w-0 overflow-hidden rounded-xl border bg-card',
                                            selected &&
                                                'border-primary ring-1 ring-primary',
                                            view === 'list' && 'flex',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'relative overflow-hidden bg-muted',
                                                view === 'list'
                                                    ? 'w-24 shrink-0 sm:w-32'
                                                    : 'aspect-[3/4]',
                                            )}
                                        >
                                            {product.images.length ? (
                                                <ImageCarousel
                                                    images={product.images.map(
                                                        (image) =>
                                                            image.thumb_url ??
                                                            image.url,
                                                    )}
                                                    alt={product.name}
                                                    compact
                                                    dense={view !== 'large'}
                                                />
                                            ) : (
                                                <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                                                    <ImagesIcon className="size-6" />
                                                    <span>Sem foto</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid min-w-0 flex-1 grid-cols-1 content-start gap-3 p-3">
                                            <div className="grid min-w-0 grid-cols-1 gap-1">
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {product.code}
                                                </span>
                                                <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">
                                                    {product.name}
                                                </h3>
                                                {product.model && (
                                                    <p className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
                                                        {product.model}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant={
                                                    selected
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                                className="h-11 w-full"
                                                aria-label={`Selecionar ${product.name}`}
                                                onClick={() =>
                                                    onSelect(product)
                                                }
                                            >
                                                {selected && (
                                                    <CheckCircleIcon />
                                                )}
                                                {selected
                                                    ? 'Escolhido'
                                                    : 'Selecionar'}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid justify-items-center gap-3 py-12 text-center">
                            <ImagesIcon className="size-8 text-muted-foreground" />
                            <h3 className="font-semibold">
                                {products.length
                                    ? 'Nenhum produto encontrado'
                                    : 'Nenhum produto ativo disponível'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {products.length
                                    ? 'Tente outro nome, código ou modelo.'
                                    : 'Cadastre ou ative um produto para criar um lote.'}
                            </p>
                            {query && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setQuery('')}
                                >
                                    Limpar busca
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <DrawerFooter className="shrink-0 border-t bg-background pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-11"
                    >
                        <ArrowLeftIcon weight="bold" />
                        Voltar ao lote
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
