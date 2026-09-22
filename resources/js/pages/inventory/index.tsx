import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ClipboardCheck,
    History,
    ListChecks,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PaperBag } from '@/components/icons/paper-bag';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { idempotencyKey } from '@/lib/idempotency-key';
import { index, show, store } from '@/routes/inventory';
import { create as stockEntry } from '@/routes/stock-entries';

type Volume = {
    id: number;
    code: string;
    product: string;
    total_quantity: number;
};
type Page<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
};
type Count = {
    id: number;
    status: string;
    reason: string;
    items_count: number;
};

const statuses: Record<string, string> = {
    draft: 'Em andamento',
    confirmed: 'Confirmado',
    canceled: 'Cancelado',
};

export default function InventoryIndex({
    volumes,
    counts,
    search,
}: {
    volumes: Page<Volume>;
    counts: Page<Count>;
    search: string;
}) {
    const [query, setQuery] = useState(search);
    const [selected, setSelected] = useState<Volume[]>([]);
    const [key] = useState(idempotencyKey);
    const form = useForm({
        volume_ids: [] as number[],
        reason: '',
        idempotency_key: key,
    });
    const selectedIds = new Set(selected.map((volume) => volume.id));
    const selectedTotal = selected.reduce(
        (total, volume) => total + volume.total_quantity,
        0,
    );
    const visit = (page: number) =>
        router.get(
            index.url(),
            { search: query, page },
            { preserveState: true, preserveScroll: true },
        );
    const toggle = (volume: Volume) =>
        setSelected((current) =>
            current.some((item) => item.id === volume.id)
                ? current.filter((item) => item.id !== volume.id)
                : [...current, volume],
        );
    const startCount = () => {
        form.transform((data) => ({
            ...data,
            volume_ids: selected.map((volume) => volume.id),
        }));
        form.post(store.url());
    };

    return (
        <>
            <Head title="Balanço de estoque" />
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <header className="relative overflow-hidden rounded-[2rem] bg-featured-card px-6 py-8 text-featured-card-foreground shadow-sm sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full border-[24px] border-primary/15" />
                    <div className="pointer-events-none absolute -right-8 -bottom-20 size-56 rounded-full bg-primary/10 blur-3xl" />
                    <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-end">
                        <div className="grid gap-3">
                            <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
                                Estoque / conferência física
                            </p>
                            <h1 className="flex max-w-2xl items-center gap-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:size-14">
                                    <ClipboardCheck className="size-6 sm:size-7" />
                                </span>
                                <span>Balanço de estoque</span>
                            </h1>
                            <p className="max-w-xl text-sm leading-6 text-featured-card-muted sm:text-base">
                                Confira os sacos disponíveis, registre o que foi
                                encontrado e aplique as diferenças somente após
                                revisar tudo.
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
                                    1
                                </span>
                                <div className="grid gap-0.5">
                                    <strong className="text-sm">
                                        Selecione
                                    </strong>
                                    <span className="text-xs text-featured-card-muted">
                                        os sacos disponíveis
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 font-semibold text-primary">
                                    2
                                </span>
                                <div className="grid gap-0.5">
                                    <strong className="text-sm">Conte</strong>
                                    <span className="text-xs text-featured-card-muted">
                                        cada saco selecionado
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 font-semibold text-primary">
                                    3
                                </span>
                                <div className="grid gap-0.5">
                                    <strong className="text-sm">
                                        Confirme
                                    </strong>
                                    <span className="text-xs text-featured-card-muted">
                                        depois de revisar
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <section
                    className="grid gap-3 sm:grid-cols-3 sm:gap-4"
                    aria-label="Resumo do balanço de estoque"
                >
                    <Card className="rounded-[1.5rem] border-border/80 shadow-sm">
                        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <PaperBag className="size-5" />
                            </span>
                            <div className="grid min-w-0 gap-0.5">
                                <span className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Sacos disponíveis
                                </span>
                                <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {volumes.total}
                                </strong>
                                <span className="text-xs text-muted-foreground">
                                    prontos para conferência
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-[1.5rem] border-border/80 shadow-sm">
                        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <History className="size-5" />
                            </span>
                            <div className="grid min-w-0 gap-0.5">
                                <span className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Balanços registrados
                                </span>
                                <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {counts.total}
                                </strong>
                                <span className="text-xs text-muted-foreground">
                                    conferências no histórico
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-[1.5rem] border-primary/25 bg-primary/10 shadow-none">
                        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                <ClipboardCheck className="size-5" />
                            </span>
                            <div className="grid min-w-0 gap-0.5">
                                <span className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                                    Selecionados agora
                                </span>
                                <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {selected.length}
                                </strong>
                                <span className="text-xs text-muted-foreground">
                                    {selectedTotal} peças registradas
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]">
                    <Card className="min-w-0 rounded-[1.75rem] border-border/80 shadow-sm">
                        <CardHeader className="gap-3 p-6 pb-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                        <ListChecks className="size-5" />
                                    </span>
                                    <div className="grid min-w-0 gap-1">
                                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                            Etapa 1 de 2
                                        </p>
                                        <CardTitle
                                            id="new-count"
                                            className="text-2xl tracking-tight"
                                        >
                                            Nova contagem
                                        </CardTitle>
                                        <CardDescription className="leading-6">
                                            Selecione um ou mais sacos
                                            disponíveis para começar a
                                            conferência.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="shrink-0">
                                    Até 100 sacos
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-5 p-6 pt-0">
                            {selected.length > 0 && (
                                <div
                                    className="grid gap-4 rounded-2xl border border-primary/35 bg-primary/10 p-4"
                                    data-testid="inventory-selection"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="grid gap-1">
                                            <p className="font-semibold tracking-tight">
                                                {selected.length}{' '}
                                                {selected.length === 1
                                                    ? 'saco selecionado'
                                                    : 'sacos selecionados'}
                                            </p>
                                            <p className="text-sm text-muted-foreground tabular-nums">
                                                {selectedTotal} peças
                                                registradas
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelected([])}
                                        >
                                            Limpar
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selected.map((volume) => (
                                            <Button
                                                key={volume.id}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggle(volume)}
                                                aria-label={`Remover ${volume.code}`}
                                            >
                                                {volume.code}
                                                <X />
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="inventory-reason">
                                            Nomeie esta contagem
                                        </Label>
                                        <Input
                                            id="inventory-reason"
                                            value={form.data.reason}
                                            onChange={(event) =>
                                                form.setData(
                                                    'reason',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Ex.: Conferência de setembro"
                                            maxLength={500}
                                            autoFocus
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Use uma referência fácil de
                                            encontrar depois, como mês e setor.
                                        </p>
                                    </div>
                                    <div role="alert">
                                        {Object.entries(form.errors).map(
                                            ([field, message]) => (
                                                <InputError
                                                    key={field}
                                                    message={message}
                                                />
                                            ),
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full sm:w-fit"
                                        disabled={
                                            selected.length > 100 ||
                                            form.processing ||
                                            form.data.reason.trim() === ''
                                        }
                                        onClick={startCount}
                                    >
                                        {form.processing
                                            ? 'Iniciando...'
                                            : 'Começar a contar'}
                                        {!form.processing && <ArrowRight />}
                                    </Button>
                                </div>
                            )}

                            {selected.length === 0 && (
                                <div className="flex items-start gap-3 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-4">
                                    <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                                    <div className="grid gap-1">
                                        <p className="font-medium">
                                            Comece selecionando os sacos
                                        </p>
                                        <p className="text-sm leading-5 text-muted-foreground">
                                            Você poderá revisar a referência e
                                            nomear a contagem antes de entrar na
                                            conferência.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    visit(1);
                                }}
                                className="flex flex-col gap-2 sm:flex-row"
                                role="search"
                            >
                                <div className="relative min-w-0 flex-1">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        aria-label="Buscar sacos"
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        className="pl-9"
                                        placeholder="Produto, modelo ou código do saco"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                >
                                    Buscar
                                </Button>
                            </form>

                            <div className="flex items-center justify-between gap-3 border-b pb-3">
                                <p className="text-sm text-muted-foreground">
                                    {volumes.total}{' '}
                                    {volumes.total === 1
                                        ? 'saco disponível'
                                        : 'sacos disponíveis'}
                                </p>
                                <Badge
                                    variant="outline"
                                    className="tabular-nums"
                                >
                                    Página {volumes.current_page} de{' '}
                                    {volumes.last_page}
                                </Badge>
                            </div>

                            <div className="grid gap-2">
                                {volumes.data.map((volume) => {
                                    const checked = selectedIds.has(volume.id);
                                    return (
                                        <label
                                            key={volume.id}
                                            className={`group flex min-h-18 cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-[border-color,background-color,box-shadow] sm:p-4 ${checked ? 'border-primary/50 bg-primary/10 shadow-sm' : 'border-border/80 hover:bg-muted/40'}`}
                                        >
                                            <Checkbox
                                                aria-label={`Selecionar ${volume.code}`}
                                                checked={checked}
                                                onCheckedChange={() =>
                                                    toggle(volume)
                                                }
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate font-medium">
                                                        {volume.product}
                                                    </span>
                                                    {checked && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="hidden sm:inline-flex"
                                                        >
                                                            Selecionado
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    Saco {volume.code}
                                                </span>
                                            </span>
                                            <span className="grid shrink-0 justify-items-end gap-0.5 text-right">
                                                <strong className="text-lg tracking-tight tabular-nums">
                                                    {volume.total_quantity}
                                                </strong>
                                                <span className="text-xs text-muted-foreground">
                                                    peças
                                                </span>
                                            </span>
                                            {checked && (
                                                <Check
                                                    className="size-5 shrink-0 text-primary"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </label>
                                    );
                                })}
                                {volumes.data.length === 0 && (
                                    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
                                        <ClipboardCheck className="size-8 text-muted-foreground" />
                                        <p className="font-medium">
                                            Nenhum saco disponível
                                        </p>
                                        <p className="max-w-sm text-sm text-muted-foreground">
                                            Tente outra busca ou registre a
                                            entrada de um saco encontrado.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {volumes.last_page > 1 && (
                                <div className="flex items-center justify-between gap-2 border-t pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={volumes.current_page <= 1}
                                        onClick={() =>
                                            visit(volumes.current_page - 1)
                                        }
                                    >
                                        Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground tabular-nums">
                                        Página {volumes.current_page} de{' '}
                                        {volumes.last_page}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            volumes.current_page >=
                                            volumes.last_page
                                        }
                                        onClick={() =>
                                            visit(volumes.current_page + 1)
                                        }
                                    >
                                        Próxima
                                    </Button>
                                </div>
                            )}

                            <p className="text-sm text-muted-foreground">
                                Não encontrou o saco?{' '}
                                <Link
                                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                                    href={stockEntry()}
                                >
                                    Registrar entrada
                                </Link>
                            </p>
                        </CardContent>
                    </Card>

                    <aside
                        className="grid gap-4 xl:sticky xl:top-20"
                        aria-labelledby="counts"
                    >
                        <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                            <CardHeader className="gap-3 p-6 pb-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="grid gap-1">
                                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                            Histórico
                                        </p>
                                        <CardTitle
                                            id="counts"
                                            className="text-2xl tracking-tight"
                                        >
                                            Balanços recentes
                                        </CardTitle>
                                        <CardDescription>
                                            Retome uma conferência ou consulte o
                                            resultado de uma anterior.
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary">
                                        {counts.total}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-2 p-6 pt-0">
                                {counts.data.map((count) => (
                                    <Link
                                        key={count.id}
                                        href={show(count.id)}
                                        className="group grid gap-3 rounded-2xl border border-border/80 p-4 transition-[border-color,background-color] hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="flex items-center gap-2 text-sm font-semibold">
                                                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <History className="size-4" />
                                                </span>
                                                <span className="tabular-nums">
                                                    Balanço #{count.id}
                                                </span>
                                            </span>
                                            <Badge
                                                variant={
                                                    count.status === 'draft'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                            >
                                                {statuses[count.status] ??
                                                    count.status}
                                            </Badge>
                                        </div>
                                        <span className="line-clamp-2 font-medium transition-colors group-hover:text-primary">
                                            {count.reason}
                                        </span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {count.items_count}{' '}
                                            {count.items_count === 1
                                                ? 'saco selecionado'
                                                : 'sacos selecionados'}
                                        </span>
                                    </Link>
                                ))}
                                {counts.data.length === 0 && (
                                    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed p-6 text-center">
                                        <History className="size-7 text-muted-foreground" />
                                        <p className="font-medium">
                                            Nenhum balanço registrado.
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Os balanços iniciados aparecerão
                                            aqui.
                                        </p>
                                    </div>
                                )}
                                {counts.last_page > 1 && (
                                    <div className="flex gap-2 border-t pt-4">
                                        <Button
                                            type="button"
                                            className="flex-1"
                                            variant="outline"
                                            size="sm"
                                            disabled={counts.current_page <= 1}
                                            onClick={() =>
                                                router.get(
                                                    index.url(),
                                                    {
                                                        search,
                                                        counts_page:
                                                            counts.current_page -
                                                            1,
                                                    },
                                                    { preserveState: true },
                                                )
                                            }
                                        >
                                            Anteriores
                                        </Button>
                                        <Button
                                            type="button"
                                            className="flex-1"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                counts.current_page >=
                                                counts.last_page
                                            }
                                            onClick={() =>
                                                router.get(
                                                    index.url(),
                                                    {
                                                        search,
                                                        counts_page:
                                                            counts.current_page +
                                                            1,
                                                    },
                                                    { preserveState: true },
                                                )
                                            }
                                        >
                                            Próximos
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="rounded-[1.75rem] border-primary/25 bg-primary/10 shadow-none">
                            <CardContent className="flex items-start gap-3 p-5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                    <ClipboardCheck className="size-5" />
                                </span>
                                <div className="grid gap-1">
                                    <p className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                                        Regra do balanço
                                    </p>
                                    <p className="text-sm leading-5 text-muted-foreground">
                                        O estoque só muda quando todos os sacos
                                        forem contados e você confirmar o
                                        resultado.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [{ title: 'Balanço de estoque', href: index() }],
};
