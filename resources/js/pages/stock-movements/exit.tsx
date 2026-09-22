import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowUpFromLine, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { idempotencyKey } from '@/lib/idempotency-key';
import {
    create,
    store as storeExit,
} from '@/actions/App/Http/Controllers/StockExitController';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';
import {
    StockMovementReasonField,
    stockExitReasons,
} from '@/components/stock-movement-reason-field';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/stock-movements';
import type { StockExitVolume } from '@/types';

type ExitFormData = {
    volume_ids: number[];
    reason: string;
    notes: string;
    idempotency_key: string;
};

export default function StockExit({
    volumes,
    selectedProductId,
    search,
    pagination,
}: {
    volumes: StockExitVolume[];
    selectedProductId: number | null;
    search: string;
    pagination: { current_page: number; last_page: number };
}) {
    const [query, setQuery] = useState(search);
    const [formId] = useState(idempotencyKey);
    const form = useForm<ExitFormData>({
        volume_ids: [],
        reason: '',
        notes: '',
        idempotency_key: `exit-${formId}`,
    });

    const toggleVolume = (id: number, checked: boolean) => {
        form.setData(
            'volume_ids',
            checked
                ? [...form.data.volume_ids, id]
                : form.data.volume_ids.filter((volumeId) => volumeId !== id),
        );
    };
    const browse = (page: number) =>
        router.get(
            create.url(),
            {
                product: selectedProductId,
                search: query,
                page,
                selected: form.data.volume_ids,
            },
            { preserveState: true, preserveScroll: true },
        );

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(storeExit.url(), { preserveScroll: true });
    };

    return (
        <>
            <Head title="Registrar saída" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex items-start gap-3">
                    <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                        <ArrowUpFromLine className="size-5" />
                    </span>
                    <div className="grid gap-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Registrar saída manual
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            A saída retira sacos inteiros do estoque disponível.
                            Sacos reservados ou já retirados não podem ser
                            selecionados aqui.
                        </p>
                    </div>
                </header>

                <form onSubmit={submit} className="grid gap-5">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Sacos disponíveis</CardTitle>
                            <CardDescription>
                                Selecione os sacos que serão retirados do
                                estoque.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="exit-search">
                                    Buscar produto, modelo ou código do saco
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="exit-search"
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => browse(1)}
                                    >
                                        Buscar
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {form.data.volume_ids.length} sacos
                                    selecionados. A seleção permanece ao buscar.
                                </p>
                            </div>
                            {volumes.map((volume) => {
                                const selected = form.data.volume_ids.includes(
                                    volume.id,
                                );

                                return (
                                    <label
                                        key={volume.id}
                                        className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/30"
                                    >
                                        <Checkbox
                                            checked={selected}
                                            onCheckedChange={(checked) =>
                                                toggleVolume(
                                                    volume.id,
                                                    checked === true,
                                                )
                                            }
                                            aria-label={`Selecionar ${volume.code}`}
                                        />
                                        <span className="grid min-w-0 flex-1 gap-2">
                                            <span className="flex flex-wrap items-center justify-between gap-2">
                                                <strong>
                                                    {volume.product.name}
                                                </strong>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {volume.code}
                                                </span>
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {volume.product.code}
                                                {volume.product.model
                                                    ? ` · ${volume.product.model}`
                                                    : ''}{' '}
                                                · {volume.total_quantity} peças
                                            </span>
                                            <StockSizeBreakdown
                                                sizes={volume.sizes}
                                            />
                                        </span>
                                    </label>
                                );
                            })}
                            {volumes.length === 0 && (
                                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                    {selectedProductId === null
                                        ? 'Não há sacos disponíveis para uma saída manual.'
                                        : 'Este produto não possui sacos disponíveis para retirada.'}
                                </div>
                            )}
                            <InputError message={form.errors.volume_ids} />
                            <div className="flex items-center justify-between gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() =>
                                        browse(pagination.current_page - 1)
                                    }
                                >
                                    Anterior
                                </Button>
                                <span className="text-sm">
                                    {pagination.current_page} /{' '}
                                    {pagination.last_page}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        pagination.current_page >=
                                        pagination.last_page
                                    }
                                    onClick={() =>
                                        browse(pagination.current_page + 1)
                                    }
                                >
                                    Próxima
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Motivo da saída</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <StockMovementReasonField
                                    id="exit-reason"
                                    value={form.data.reason}
                                    options={stockExitReasons}
                                    onChange={(reason) =>
                                        form.setData('reason', reason)
                                    }
                                    error={form.errors.reason}
                                />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="exit-notes">
                                    Observações (opcional)
                                </Label>
                                <Textarea
                                    id="exit-notes"
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError message={form.errors.notes} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" asChild>
                            <Link href={index()}>Cancelar</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                form.processing ||
                                form.data.volume_ids.length === 0
                            }
                        >
                            <Save />
                            {form.processing
                                ? 'Registrando...'
                                : 'Registrar saída'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

StockExit.layout = {
    breadcrumbs: [
        { title: 'Histórico de estoque', href: index() },
        { title: 'Nova saída', href: index() },
    ],
};
