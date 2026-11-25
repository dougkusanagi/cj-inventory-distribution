import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { formatMoney, MoneyInput } from '@/components/ui/amount-inputs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/material-prices';
import { index } from '@/routes/materials';
import type { Paginated } from '@/types';
import type { Material } from './material-form';

type MaterialPrice = { id: number; unit_price: string; effective_from: string };

export default function MaterialPrices({
    material,
    prices,
    currentPriceId,
    today,
}: {
    material: Pick<Material, 'id' | 'code' | 'name'>;
    prices: Pick<Paginated<MaterialPrice>, 'data' | 'links'>;
    currentPriceId: number | null;
    today: string;
}) {
    const { locale } = usePage().props;
    const dateFormat = new Intl.DateTimeFormat(locale, { timeZone: 'UTC' });
    const form = useForm({ unit_price: '', effective_from: today });
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.submit(store(material.id), { onSuccess: () => form.reset() });
    };

    return (
        <>
            <Head title="Preços do insumo" />
            <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6">
                <header className="grid gap-1">
                    <h1 className="text-3xl font-semibold break-words">
                        Preços de {material.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {material.code}
                    </p>
                </header>
                <Card className="p-4 sm:p-6">
                    <form className="grid gap-4" onSubmit={submit}>
                        <div className="grid gap-2">
                            <Label htmlFor="unit-price">Preço unitário</Label>
                            <MoneyInput
                                id="unit-price"
                                precision={4}
                                required
                                value={form.data.unit_price}
                                onValueChange={(value) =>
                                    form.setData('unit_price', value)
                                }
                                aria-invalid={!!form.errors.unit_price}
                            />
                            <p className="text-xs text-muted-foreground">
                                Digite os algarismos incluindo as quatro casas
                                decimais. Exemplo: 123456 vira R$ 12,3456.
                            </p>
                            <InputError message={form.errors.unit_price} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price-date">
                                Início da vigência
                            </Label>
                            <Input
                                id="price-date"
                                type="date"
                                required
                                min="1900-01-01"
                                max="9999-12-31"
                                value={form.data.effective_from}
                                onChange={(event) =>
                                    form.setData(
                                        'effective_from',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!form.errors.effective_from}
                            />
                            <InputError message={form.errors.effective_from} />
                        </div>
                        <Button
                            className="h-11 sm:justify-self-start"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Registrando preço…'
                                : 'Registrar preço'}
                        </Button>
                    </form>
                </Card>
                <section
                    className="grid gap-3"
                    aria-label="Histórico de preços"
                >
                    <h2 className="text-xl font-semibold">
                        Histórico de preços
                    </h2>
                    {prices.data.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Ainda não há preços registrados para este insumo.
                        </p>
                    )}
                    {prices.data.map((price) => (
                        <Card
                            className="flex flex-wrap items-center justify-between gap-2 p-4"
                            key={price.id}
                        >
                            <span>
                                {dateFormat.format(
                                    new Date(price.effective_from),
                                )}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                {price.id === currentPriceId && (
                                    <Badge>Vigente</Badge>
                                )}
                                {price.effective_from > today && (
                                    <Badge variant="secondary">Agendado</Badge>
                                )}
                                <span className="font-semibold">
                                    {formatMoney(price.unit_price, locale, 4)}
                                </span>
                            </div>
                        </Card>
                    ))}
                    {prices.links.length > 3 && (
                        <Pagination
                            links={prices.links}
                            ariaLabel="Paginação do histórico de preços"
                        />
                    )}
                </section>
                <Button
                    asChild
                    variant="outline"
                    className="h-11 justify-self-start"
                >
                    <Link href={index()}>Voltar aos insumos</Link>
                </Button>
            </div>
        </>
    );
}
