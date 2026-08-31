import { Head, Link, router } from '@inertiajs/react';
import {
    Camera,
    ChevronLeft,
    ChevronRight,
    ImageOff,
    LayoutGrid,
    Package,
    Pencil,
    Plus,
    Table2,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
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
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
    index as productsIndex,
    edit as productEdit,
    create as productCreate,
} from '@/routes/products';
import type { Paginated, Product } from '@/types';

type ProductsIndexProps = {
    products: Paginated<Product>;
};

type ProductView = 'table' | 'cards';

function paginationLabel(label: string): string {
    if (label.includes('Previous') || label.includes('laquo')) {
        return 'Anterior';
    }

    if (label.includes('Next') || label.includes('raquo')) {
        return 'Próxima';
    }

    return label;
}

function ProductImage({
    product,
    className,
}: {
    product: Product;
    className?: string;
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
            <ImageOff className="size-5" strokeWidth={1.25} />
        </div>
    );
}

function ProductVariants({ product }: { product: Product }) {
    if (product.variants.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                Sem grade cadastrada
            </span>
        );
    }

    return product.variants.map((variant) => (
        <span
            key={variant.id}
            className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium break-words text-foreground"
        >
            {variant.size}
        </span>
    ));
}

function ProductCard({
    product,
    onDelete,
}: {
    product: Product;
    onDelete: (product: Product) => void;
}) {
    const coverImage = product.images[0];

    return (
        <article className="group flex min-h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="relative aspect-[4/5] overflow-hidden bg-featured-card">
                {coverImage ? (
                    <ProductImage
                        product={product}
                        className="transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-featured-card-muted">
                        <ImageOff className="size-8" strokeWidth={1.25} />
                        <span className="text-xs tracking-[0.16em] uppercase">
                            Sem foto
                        </span>
                    </div>
                )}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                    <span className="rounded-full bg-background/90 px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-foreground shadow-sm backdrop-blur">
                        {product.code}
                    </span>
                    {coverImage && (
                        <span className="flex size-8 items-center justify-center rounded-full bg-background/90 text-highlight shadow-sm backdrop-blur">
                            <Camera className="size-4" />
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-5 p-5">
                <div className="grid gap-2">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-xl leading-tight font-semibold tracking-tight text-card-foreground">
                            {product.name}
                        </h2>
                        <span
                            className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {product.model
                            ? `Modelo ${product.model}`
                            : 'Modelo não informado'}
                    </p>
                </div>

                <div className="flex min-h-7 flex-wrap gap-1.5">
                    <ProductVariants product={product} />
                </div>

                <div className="mt-auto grid gap-4 border-t border-border pt-4">
                    <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                        {product.notes ?? 'Nenhuma observação registrada.'}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            asChild
                            className="flex-1"
                        >
                            <Link href={productEdit(product.id)}>
                                <Pencil />
                                Editar
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

function ProductTable({
    products,
    onDelete,
}: {
    products: Product[];
    onDelete: (product: Product) => void;
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
                        <th
                            scope="col"
                            className="h-12 px-5 text-left text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
                        >
                            Observação
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
                                        <ProductImage product={product} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 font-semibold break-words text-card-foreground">
                                            {product.name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-mono tracking-[0.08em]">
                                                {product.code}
                                            </span>
                                            <span
                                                className="size-1 rounded-full bg-primary"
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0 break-words">
                                                {product.model
                                                    ? `Modelo ${product.model}`
                                                    : 'Modelo não informado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4 lg:align-middle">
                                <span className="mb-2 block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                                    Tamanhos
                                </span>
                                <div className="flex max-w-full flex-wrap gap-1.5">
                                    <ProductVariants product={product} />
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
                                            unidades
                                        </p>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Sem oferta
                                    </span>
                                )}
                            </td>
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4 lg:align-middle">
                                <span className="mb-1 block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                                    Observação
                                </span>
                                <p
                                    className="line-clamp-2 max-w-full leading-5 text-muted-foreground lg:max-w-[15rem]"
                                    title={product.notes ?? undefined}
                                >
                                    {product.notes ?? 'Nenhuma observação'}
                                </p>
                            </td>
                            <td className="block p-0 lg:table-cell lg:px-5 lg:py-4 lg:align-middle">
                                <span className="mb-2 block text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:hidden">
                                    Ações
                                </span>
                                <div className="flex w-full items-center gap-2 lg:w-auto lg:justify-end">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        asChild
                                        className="flex-1 lg:flex-none"
                                    >
                                        <Link href={productEdit(product.id)}>
                                            <Pencil />
                                            Editar
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
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ProductsIndex({ products }: ProductsIndexProps) {
    const [view, setView] = useState<ProductView>('table');
    const [productToDelete, setProductToDelete] = useState<Product | null>(
        null,
    );
    const [deleting, setDeleting] = useState(false);

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

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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

                {products.data.length > 0 ? (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                className="w-full sm:w-fit"
                            >
                                <ToggleGroupItem
                                    value="table"
                                    aria-label="Visualização em tabela"
                                    className="flex-1 px-3 data-[state=on]:bg-secondary sm:flex-none"
                                >
                                    <Table2 />
                                    Tabela
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="cards"
                                    aria-label="Visualização em cards"
                                    className="flex-1 px-3 data-[state=on]:bg-secondary sm:flex-none"
                                >
                                    <LayoutGrid />
                                    Cards
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        {view === 'table' ? (
                            <ProductTable
                                products={products.data}
                                onDelete={setProductToDelete}
                            />
                        ) : (
                            <section
                                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                                aria-label="Produtos cadastrados"
                            >
                                {products.data.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onDelete={setProductToDelete}
                                    />
                                ))}
                            </section>
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
            </main>

            <Dialog
                open={productToDelete !== null}
                onOpenChange={(open) => !open && setProductToDelete(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir produto?</DialogTitle>
                        <DialogDescription>
                            {productToDelete
                                ? `“${productToDelete.name}” e seus tamanhos serão removidos permanentemente.`
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
