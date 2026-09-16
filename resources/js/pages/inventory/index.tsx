import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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
    draft: 'Em contagem',
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
    return (
        <>
            <Head title="Balanço de estoque" />
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6">
                <header className="grid gap-2">
                    <h1 className="text-2xl font-semibold">
                        Balanço de estoque
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        Selecione até 100 sacos, conte as peças e revise as
                        diferenças. O saldo só muda depois da confirmação. Sacos
                        reservados ou consumidos não entram na contagem.
                    </p>
                </header>
                <section className="grid gap-4" aria-labelledby="new-count">
                    <h2 id="new-count" className="text-xl font-semibold">
                        Abrir uma contagem
                    </h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            visit(1);
                        }}
                        className="flex flex-wrap items-end gap-2"
                    >
                        <div className="grid min-w-0 flex-1 gap-2">
                            <Label htmlFor="inventory-search">
                                Buscar produto, modelo ou código do saco
                            </Label>
                            <Input
                                id="inventory-search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Buscar
                        </Button>
                    </form>
                    <div className="divide-y rounded-xl border">
                        {volumes.data.map((volume) => (
                            <label
                                key={volume.id}
                                className="flex items-center gap-3 p-4"
                            >
                                <Checkbox
                                    aria-label={`Selecionar ${volume.code}`}
                                    checked={selected.some(
                                        (item) => item.id === volume.id,
                                    )}
                                    onCheckedChange={() => toggle(volume)}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium">
                                        {volume.product}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {volume.code} · {volume.total_quantity}{' '}
                                        peças
                                    </span>
                                </span>
                            </label>
                        ))}
                        {volumes.data.length === 0 && (
                            <p className="p-6 text-sm text-muted-foreground">
                                Nenhum saco disponível para essa busca.
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            disabled={volumes.current_page <= 1}
                            onClick={() => visit(volumes.current_page - 1)}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm">
                            {volumes.current_page} / {volumes.last_page}
                        </span>
                        <Button
                            variant="outline"
                            disabled={volumes.current_page >= volumes.last_page}
                            onClick={() => visit(volumes.current_page + 1)}
                        >
                            Próxima
                        </Button>
                    </div>
                    <div className="grid gap-3 rounded-xl bg-muted p-4">
                        <h3 className="font-semibold">
                            {selected.length} sacos selecionados
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {selected.map((volume) => (
                                <Button
                                    key={volume.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggle(volume)}
                                    aria-label={`Remover ${volume.code}`}
                                >
                                    {volume.code} · remover
                                </Button>
                            ))}
                        </div>
                        <Label htmlFor="inventory-reason">
                            Motivo ou identificação do balanço
                        </Label>
                        <Input
                            id="inventory-reason"
                            value={form.data.reason}
                            onChange={(e) =>
                                form.setData('reason', e.target.value)
                            }
                            placeholder="Ex.: Conferência de setembro"
                            maxLength={500}
                        />
                        <div role="alert">
                            {Object.entries(form.errors).map(
                                ([field, message]) => (
                                    <InputError key={field} message={message} />
                                ),
                            )}
                        </div>
                        <Button
                            className="w-fit"
                            disabled={
                                !selected.length ||
                                selected.length > 100 ||
                                form.processing
                            }
                            onClick={() => {
                                form.transform((data) => ({
                                    ...data,
                                    volume_ids: selected.map(
                                        (volume) => volume.id,
                                    ),
                                }));
                                form.post(store.url());
                            }}
                        >
                            {form.processing
                                ? 'Abrindo...'
                                : 'Iniciar contagem'}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Encontrou um saco ainda não cadastrado?{' '}
                        <Link
                            className="font-medium text-foreground underline underline-offset-4"
                            href={stockEntry()}
                        >
                            Registre a entrada do saco encontrado
                        </Link>{' '}
                        e inclua-o em uma contagem.
                    </p>
                </section>
                <section className="grid gap-4" aria-labelledby="counts">
                    <h2 id="counts" className="text-xl font-semibold">
                        Balanços registrados
                    </h2>
                    <div className="divide-y rounded-xl border">
                        {counts.data.map((count) => (
                            <Link
                                key={count.id}
                                href={show(count.id)}
                                className="flex flex-wrap justify-between gap-2 p-4 hover:bg-muted"
                            >
                                <span className="font-medium">
                                    #{count.id} · {count.reason}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {count.items_count} sacos ·{' '}
                                    {statuses[count.status]}
                                </span>
                            </Link>
                        ))}
                        {counts.data.length === 0 && (
                            <p className="p-6 text-sm text-muted-foreground">
                                Nenhum balanço registrado.
                            </p>
                        )}
                    </div>
                    <div className="flex justify-between gap-2">
                        <Button
                            variant="outline"
                            disabled={counts.current_page <= 1}
                            onClick={() =>
                                router.get(
                                    index.url(),
                                    {
                                        search,
                                        counts_page: counts.current_page - 1,
                                    },
                                    { preserveState: true },
                                )
                            }
                        >
                            Balanços anteriores
                        </Button>
                        <Button
                            variant="outline"
                            disabled={counts.current_page >= counts.last_page}
                            onClick={() =>
                                router.get(
                                    index.url(),
                                    {
                                        search,
                                        counts_page: counts.current_page + 1,
                                    },
                                    { preserveState: true },
                                )
                            }
                        >
                            Mais balanços
                        </Button>
                    </div>
                </section>
            </div>
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [{ title: 'Balanço de estoque', href: index() }],
};
