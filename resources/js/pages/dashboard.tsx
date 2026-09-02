import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Camera,
    Layers3,
    Package,
    Plus,
    Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import {
    create as productCreate,
    index as productsIndex,
} from '@/routes/products';
import type { DashboardStats } from '@/types';

type DashboardProps = {
    stats: DashboardStats;
};

type MetricCardProps = {
    label: string;
    value: string;
    description: string;
    icon: typeof Package;
    featured?: boolean;
};

function MetricCard({
    label,
    value,
    description,
    icon: Icon,
    featured = false,
}: MetricCardProps) {
    return (
        <Card
            className={
                featured
                    ? 'rounded-[1.75rem] border-0 bg-featured-card text-featured-card-foreground shadow-none'
                    : 'rounded-[1.75rem] border-border/80 bg-card shadow-sm'
            }
        >
            <CardContent className="flex min-h-40 flex-col justify-between gap-6 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <span
                        className={
                            featured
                                ? 'flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground'
                                : 'flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary'
                        }
                    >
                        <Icon className="size-5" strokeWidth={1.7} />
                    </span>
                    <span
                        className={
                            featured
                                ? 'font-mono text-xs tracking-[0.16em] text-featured-card-muted uppercase'
                                : 'font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase'
                        }
                    >
                        Operação
                    </span>
                </div>
                <div className="grid gap-1">
                    <strong className="text-3xl font-semibold tracking-tight">
                        {value}
                    </strong>
                    <span
                        className={
                            featured
                                ? 'text-sm text-featured-card-muted'
                                : 'text-sm text-muted-foreground'
                        }
                    >
                        {label}
                    </span>
                    <span
                        className={
                            featured
                                ? 'mt-1 text-xs text-featured-card-muted/80'
                                : 'mt-1 text-xs text-muted-foreground'
                        }
                    >
                        {description}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ stats }: DashboardProps) {
    return (
        <>
            <Head title="Painel" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="relative overflow-hidden rounded-[2rem] bg-featured-card px-6 py-8 text-featured-card-foreground shadow-sm sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full border-[24px] border-primary/15" />
                    <div className="pointer-events-none absolute -right-8 -bottom-20 size-56 rounded-full bg-primary/10 blur-3xl" />
                    <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="grid gap-3">
                            <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
                                Painel de distribuição / visão geral
                            </p>
                            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                                O que está acontecendo no estoque?
                            </h1>
                            <p className="max-w-xl text-sm leading-6 text-featured-card-muted sm:text-base">
                                Acompanhe os números da operação e use o
                                catálogo quando precisar cuidar de uma peça.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                            <Button asChild className="w-full sm:w-fit">
                                <Link href={productCreate()}>
                                    <Plus />
                                    Novo produto
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                className="w-full text-featured-card-foreground hover:bg-white/10 hover:text-featured-card-foreground sm:w-fit"
                            >
                                <Link href={productsIndex()}>
                                    Abrir catálogo
                                    <ArrowRight />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                <section
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    aria-label="Resumo da operação"
                >
                    <MetricCard
                        label="produtos cadastrados"
                        value={stats.total.toString().padStart(2, '0')}
                        description="Referências disponíveis no catálogo."
                        icon={Package}
                        featured
                    />
                    <MetricCard
                        label="com fotos"
                        value={stats.withPhotos.toString().padStart(2, '0')}
                        description="Peças prontas para identificação visual."
                        icon={Camera}
                    />
                    <MetricCard
                        label="com grade de tamanhos"
                        value={stats.withSizes.toString().padStart(2, '0')}
                        description="Produtos com variações cadastradas."
                        icon={Layers3}
                    />
                    <MetricCard
                        label="ofertas ativas"
                        value={stats.activeOffers.toString().padStart(2, '0')}
                        description={
                            stats.stockUnits + ' peças no estoque ativo.'
                        }
                        icon={Warehouse}
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                        <CardHeader className="p-6 pb-3">
                            <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                Próximo passo
                            </p>
                            <CardTitle className="text-2xl tracking-tight">
                                Mantenha o catálogo reconhecível
                            </CardTitle>
                            <CardDescription className="max-w-xl leading-6">
                                Fotos e grades ajudam a equipe a encontrar a
                                peça certa antes de distribuir o estoque.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <Button variant="secondary" asChild>
                                <Link href={productsIndex()}>
                                    Revisar produtos
                                    <ArrowRight />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.75rem] border-primary/25 bg-primary/10 shadow-none">
                        <CardContent className="flex h-full items-center gap-4 p-6">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                <Warehouse className="size-6" />
                            </span>
                            <div className="grid gap-1">
                                <span className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                                    Estoque ativo
                                </span>
                                <strong className="text-3xl font-semibold tracking-tight">
                                    {stats.stockUnits}
                                </strong>
                                <span className="text-sm text-muted-foreground">
                                    unidades somadas nas ofertas atuais
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Painel',
            href: dashboard(),
        },
    ],
};
