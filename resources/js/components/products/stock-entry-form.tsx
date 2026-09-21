import { Link, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { store as storeEntry } from '@/actions/App/Http/Controllers/StockEntryController';
import InputError from '@/components/input-error';
import {
    StockMovementReasonField,
    stockEntryReasons,
} from '@/components/stock-movement-reason-field';
import { StockOfferTypeSelector } from '@/components/products/stock-offer-type-selector';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { idempotencyKey } from '@/lib/idempotency-key';
import { index as inventoryIndex } from '@/routes/stock-movements';
import type { Product, StockOfferType } from '@/types';

type EntryProduct = Pick<Product, 'id' | 'code' | 'name' | 'model'>;

type StockEntryFormData = {
    product_id: number | null;
    stock_offer_type: StockOfferType;
    reason: string;
    notes: string;
    idempotency_key: string;
    stock_volumes: StockOfferVolumeFormItem[];
};

type StockEntryFormProps = {
    products?: EntryProduct[];
    selectedProductId?: number | null;
    fixedProduct?: EntryProduct;
    initialStockOfferType?: StockOfferType;
    returnToProduct?: boolean;
    onCancel?: () => void;
    onSuccess?: () => void;
};

export function StockEntryForm({
    products = [],
    selectedProductId = null,
    fixedProduct,
    initialStockOfferType = 'replenishment',
    returnToProduct = false,
    onCancel,
    onSuccess,
}: StockEntryFormProps) {
    const [formId] = useState(idempotencyKey);
    const form = useForm<StockEntryFormData>({
        product_id: fixedProduct?.id ?? selectedProductId,
        stock_offer_type: initialStockOfferType,
        reason: '',
        notes: '',
        idempotency_key: `entry-${formId}`,
        stock_volumes: [],
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const url = returnToProduct
            ? storeEntry.url({ query: { return_to: 'product' } })
            : storeEntry.url();

        form.post(url, {
            preserveScroll: true,
            preserveState: true,
            onSuccess,
        });
    };

    const cancelAction = onCancel ? (
        <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={form.processing}
        >
            Cancelar
        </Button>
    ) : (
        <Button type="button" variant="outline" asChild>
            <Link href={inventoryIndex()}>Cancelar</Link>
        </Button>
    );

    return (
        <form
            onSubmit={submit}
            className="grid gap-5"
            data-testid="stock-entry-form"
        >
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
                            Produto <span className="text-destructive">*</span>
                        </Label>
                        {fixedProduct ? (
                            <div
                                id="entry-product"
                                className="flex min-h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm"
                            >
                                {fixedProduct.code} · {fixedProduct.name}
                                {fixedProduct.model
                                    ? ` · ${fixedProduct.model}`
                                    : ''}
                            </div>
                        ) : (
                            <Select
                                value={
                                    form.data.product_id === null
                                        ? undefined
                                        : String(form.data.product_id)
                                }
                                onValueChange={(value) =>
                                    form.setData('product_id', Number(value))
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
                        )}
                        <InputError message={form.errors.product_id} />
                    </div>

                    <StockOfferTypeSelector
                        value={form.data.stock_offer_type}
                        onChange={(value) =>
                            form.setData('stock_offer_type', value)
                        }
                        error={form.errors.stock_offer_type}
                        idPrefix="entry-stock-offer-type"
                        className="sm:col-span-2"
                    />

                    <div className="sm:col-span-2">
                        <StockMovementReasonField
                            id="entry-reason"
                            value={form.data.reason}
                            options={stockEntryReasons}
                            onChange={(reason) =>
                                form.setData('reason', reason)
                            }
                            error={form.errors.reason}
                        />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="entry-notes">
                            Observações (opcional)
                        </Label>
                        <Textarea
                            id="entry-notes"
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
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
                        Informe o total de cada saco. Se você preencher as
                        quantidades por tamanho, o total será calculado
                        automaticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <StockOfferVolumeEditor
                        volumes={form.data.stock_volumes}
                        errors={form.errors as Record<string, string>}
                        onChange={(volumes) =>
                            form.setData('stock_volumes', volumes)
                        }
                    />
                </CardContent>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {cancelAction}
                <Button
                    type="submit"
                    disabled={form.processing || form.data.product_id === null}
                >
                    <Save />
                    {form.processing ? 'Registrando...' : 'Registrar entrada'}
                </Button>
            </div>
        </form>
    );
}
