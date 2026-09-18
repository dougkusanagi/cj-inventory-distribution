import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, Check, ClipboardCheck, Search, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
            <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6">
                <header className="grid gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Balanço de estoque
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        Escolha os sacos que serão conferidos. O estoque só muda
                        quando você revisar e confirmar o balanço.
                    </p>
                </header>

                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <main className="grid min-w-0 gap-5">
                        <section
                            className="grid gap-4"
                            aria-labelledby="new-count"
                        >
                            <div className="grid gap-1">
                                <h2
                                    id="new-count"
                                    className="text-lg font-semibold"
                                >
                                    Nova contagem
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Selecione um ou mais sacos disponíveis.
                                </p>
                            </div>

                            {selected.length > 0 && (
                                <div
                                    className="grid gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4"
                                    data-testid="inventory-selection"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="grid gap-1">
                                            <p className="font-semibold">
                                                {selected.length}{' '}
                                                {selected.length === 1
                                                    ? 'saco selecionado'
                                                    : 'sacos selecionados'}
                                            </p>
                                            <p className="text-sm text-muted-foreground tabular-nums">
                                                {selected.reduce(
                                                    (total, volume) =>
                                                        total +
                                                        volume.total_quantity,
                                                    0,
                                                )}{' '}
                                                peças registradas
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
                                            Identificação da contagem
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

                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    visit(1);
                                }}
                                className="flex gap-2"
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
                                <Button type="submit" variant="outline">
                                    Buscar
                                </Button>
                            </form>

                            <div className="grid gap-2">
                                {volumes.data.map((volume) => {
                                    const checked = selectedIds.has(volume.id);
                                    return (
                                        <label
                                            key={volume.id}
                                            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 sm:p-4"
                                        >
                                            <Checkbox
                                                aria-label={`Selecionar ${volume.code}`}
                                                checked={checked}
                                                onCheckedChange={() =>
                                                    toggle(volume)
                                                }
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium">
                                                    {volume.product}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {volume.code} ·{' '}
                                                    {volume.total_quantity}{' '}
                                                    peças
                                                </span>
                                            </span>
                                            {checked && (
                                                <Check
                                                    className="size-5 text-primary"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </label>
                                    );
                                })}
                                {volumes.data.length === 0 && (
                                    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed p-8 text-center">
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
                                <div className="flex items-center justify-between gap-2">
                                    <Button
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
                                    className="font-medium text-foreground underline underline-offset-4"
                                    href={stockEntry()}
                                >
                                    Registrar entrada
                                </Link>
                            </p>
                        </section>
                    </main>

                    <aside
                        className="grid gap-3 lg:sticky lg:top-20"
                        aria-labelledby="counts"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="counts" className="text-lg font-semibold">
                                Balanços recentes
                            </h2>
                            <Badge variant="secondary">{counts.total}</Badge>
                        </div>
                        <div className="grid gap-2">
                            {counts.data.map((count) => (
                                <Link
                                    key={count.id}
                                    href={show(count.id)}
                                    className="grid gap-1 rounded-xl border p-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <span className="line-clamp-2 font-medium">
                                        {count.reason}
                                    </span>
                                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span className="tabular-nums">
                                            #{count.id} · {count.items_count}{' '}
                                            {count.items_count === 1
                                                ? 'saco'
                                                : 'sacos'}
                                        </span>
                                        <Badge
                                            variant={
                                                count.status === 'draft'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                        >
                                            {statuses[count.status]}
                                        </Badge>
                                    </span>
                                </Link>
                            ))}
                            {counts.data.length === 0 && (
                                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                    Nenhum balanço registrado.
                                </p>
                            )}
                        </div>
                        {counts.last_page > 1 && (
                            <div className="flex gap-2">
                                <Button
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
                                                    counts.current_page - 1,
                                            },
                                            { preserveState: true },
                                        )
                                    }
                                >
                                    Anteriores
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        counts.current_page >= counts.last_page
                                    }
                                    onClick={() =>
                                        router.get(
                                            index.url(),
                                            {
                                                search,
                                                counts_page:
                                                    counts.current_page + 1,
                                            },
                                            { preserveState: true },
                                        )
                                    }
                                >
                                    Próximos
                                </Button>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [{ title: 'Balanço de estoque', href: index() }],
};
