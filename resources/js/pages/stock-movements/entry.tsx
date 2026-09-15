import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowDownToLine, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useId } from 'react';
import { store as storeEntry } from '@/actions/App/Http/Controllers/StockEntryController';
import InputError from '@/components/input-error';
import { StockOfferVolumeEditor } from '@/components/products/stock-offer-volume-editor';
import type { StockOfferVolumeFormItem } from '@/components/products/stock-offer-volume-editor';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/stock-movements';
import type { StockOfferType } from '@/types';

type EntryFormData = {
    product_id: number | null;
    stock_offer_type: StockOfferType;
    reason: string;
    notes: string;
    idempotency_key: string;
    stock_volumes: StockOfferVolumeFormItem[];
};

export default function StockEntry({
    products,
    stockOfferTypes,
}: {
    products: Array<{
        id: number;
        code: string;
        name: string;
        model: string | null;
        category: string | null;
    }>;
    stockOfferTypes: Array<{ value: StockOfferType; label: string }>;
}) {
    const formId = useId().replace(/[^a-zA-Z0-9]/g, '');
    const form = useForm<EntryFormData>({
        product_id: null,
        stock_offer_type: stockOfferTypes[0]?.value ?? 'replenishment',
        reason: '',
        notes: '',
        idempotency_key: `entry-${formId}`,
        stock_volumes: [],
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(storeEntry.url(), { preserveScroll: true });
    };

    return (
        <>
            <Head title="Registrar entrada" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex items-start gap-3">
                    <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <ArrowDownToLine className="size-5" />
                    </span>
                    <div className="grid gap-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Registrar entrada de estoque
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Adicione sacos inteiros a uma oferta compatível ou
                            crie uma nova oferta quando o tipo ou a observação
                            mudarem.
                        </p>
                    </div>
                </header>

                <form onSubmit={submit} className="grid gap-5">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Identificação da entrada</CardTitle>
                            <CardDescription>
                                A entrada fica vinculada a um produto existente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="entry-product">
                                    Produto{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={
                                        form.data.product_id === null
                                            ? undefined
                                            : String(form.data.product_id)
                                    }
                                    onValueChange={(value) =>
                                        form.setData(
                                            'product_id',
                                            Number(value),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="entry-product"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Selecione o produto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem
                                                key={product.id}
                                                value={String(product.id)}
                                            >
                                                {product.code} · {product.name}
                                                {product.model
                                                    ? ` · ${product.model}`
                                                    : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.product_id} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="entry-type">
                                    Tipo do estoque{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.data.stock_offer_type}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'stock_offer_type',
                                            value as StockOfferType,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="entry-type"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stockOfferTypes.map((type) => (
                                            <SelectItem
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={form.errors.stock_offer_type}
                                />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="entry-reason">
                                    Motivo{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="entry-reason"
                                    value={form.data.reason}
                                    onChange={(event) =>
                                        form.setData(
                                            'reason',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Ex.: recebimento da fábrica"
                                />
                                <InputError message={form.errors.reason} />
                            </div>
                            <div className="grid gap-2 sm:col-span-2">
                                <Label htmlFor="entry-notes">
                                    Observações (opcional)
                                </Label>
                                <Textarea
                                    id="entry-notes"
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Lote, nota fiscal ou observação operacional"
                                />
                                <InputError message={form.errors.notes} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Sacos recebidos</CardTitle>
                            <CardDescription>
                                O total de cada saco é calculado pelas
                                quantidades conhecidas; quando não houver
                                contagem por tamanho, informe o total manual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StockOfferVolumeEditor
                                volumes={form.data.stock_volumes}
                                errors={form.errors}
                                onChange={(volumes) =>
                                    form.setData('stock_volumes', volumes)
                                }
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" asChild>
                            <Link href={index()}>Cancelar</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                form.processing || form.data.product_id === null
                            }
                        >
                            <Save />
                            {form.processing
                                ? 'Registrando...'
                                : 'Registrar entrada'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

StockEntry.layout = {
    breadcrumbs: [
        { title: 'Movimentações', href: index() },
        { title: 'Nova entrada', href: index() },
    ],
};
