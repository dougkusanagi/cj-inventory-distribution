import { Link, useForm } from '@inertiajs/react';
import { Layers, Package, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import {
    update,
    store,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { ProductImageUploader } from '@/components/products/product-image-uploader';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { index as productsIndex } from '@/routes/products';
import type { Product } from '@/types';

type VariantFormItem = {
    size: string;
    is_active: boolean;
    quantity: number | string | null;
};

type ProductFormData = {
    name: string;
    model: string;
    notes: string;
    total_quantity: number | string | null;
    variants: VariantFormItem[];
    image: File | null;
    remove_image: boolean;
    _method?: 'PUT';
};

type ProductFormProps = {
    product?: Product;
};

type ProductErrorField =
    | keyof ProductFormData
    | `variants.${number}.size`
    | `variants.${number}.quantity`;

type SizePreset = {
    id: 'numeric' | 'letters';
    label: string;
    subtitle: string;
    sizes: string[];
};

const sizePresets: SizePreset[] = [
    {
        id: 'numeric',
        label: 'Tamanho numérico',
        subtitle: 'Feminino (34 ao 46)',
        sizes: ['34', '36', '38', '40', '42', '44', '46'],
    },
    {
        id: 'letters',
        label: 'Tamanho por letras',
        subtitle: 'PP ao GG',
        sizes: ['PP', 'P', 'M', 'G', 'GG'],
    },
];

function detectPreset(
    variants: Array<{ size: string }>,
): 'numeric' | 'letters' {
    if (variants.length === 0) {
        return 'numeric';
    }

    const sizes = variants.map((v) => v.size.toUpperCase().trim());
    const letterMatches = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'U'];
    const hasLetters = sizes.some((s) => letterMatches.includes(s));

    return hasLetters ? 'letters' : 'numeric';
}

export function ProductForm({ product }: ProductFormProps) {
    const isEditing = product !== undefined;
    const initialPreset = detectPreset(product?.variants ?? []);
    const [selectedPreset, setSelectedPreset] = useState<'numeric' | 'letters'>(
        initialPreset,
    );
    const radioGroupId = useId();

    const initialVariants: VariantFormItem[] =
        product && product.variants.length > 0
            ? product.variants.map(({ size, is_active, quantity }) => ({
                  size,
                  is_active: is_active ?? false,
                  quantity: is_active ? (quantity ?? null) : null,
              }))
            : (
                  sizePresets.find((p) => p.id === initialPreset)?.sizes ?? []
              ).map((size) => ({
                  size,
                  is_active: false,
                  quantity: null,
              }));

    const form = useForm<ProductFormData>({
        name: product?.name ?? '',
        model: product?.model ?? '',
        notes: product?.notes ?? '',
        total_quantity: product?.total_quantity ?? null,
        variants: initialVariants,
        image: null,
        remove_image: false,
        ...(isEditing ? { _method: 'PUT' as const } : {}),
    });

    const error = (field: ProductErrorField): string | undefined =>
        form.errors[field] as string | undefined;

    const handlePresetChange = (presetId: string) => {
        const nextPreset = sizePresets.find((p) => p.id === presetId);

        if (!nextPreset) {
            return;
        }

        setSelectedPreset(nextPreset.id);

        const currentVariants = new Map(
            form.data.variants.map((variant) => [variant.size, variant]),
        );

        form.setData(
            'variants',
            nextPreset.sizes.map((size) => ({
                size,
                is_active: currentVariants.get(size)?.is_active ?? false,
                quantity: currentVariants.get(size)?.quantity ?? null,
            })),
        );
    };

    const updateVariantActive = (index: number, isActive: boolean) => {
        form.setData(
            'variants',
            form.data.variants.map((variant, variantIndex) =>
                variantIndex === index
                    ? {
                          ...variant,
                          is_active: isActive,
                          quantity: isActive ? variant.quantity : null,
                      }
                    : variant,
            ),
        );
    };

    const updateVariantQuantity = (index: number, rawValue: string) => {
        const sanitized =
            rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10) || 0);

        form.setData(
            'variants',
            form.data.variants.map((variant, variantIndex) =>
                variantIndex === index
                    ? { ...variant, quantity: sanitized }
                    : variant,
            ),
        );
    };

    const sumOfVariantQuantities = form.data.variants.reduce((acc, variant) => {
        if (
            variant.is_active &&
            variant.quantity !== null &&
            variant.quantity !== ''
        ) {
            const num = Number(variant.quantity);

            return isNaN(num) ? acc : acc + num;
        }

        return acc;
    }, 0);

    const hasFilledVariantQuantities = form.data.variants.some(
        (variant) =>
            variant.is_active &&
            variant.quantity !== null &&
            variant.quantity !== '',
    );

    const applySumAsTotal = () => {
        form.setData('total_quantity', sumOfVariantQuantities);
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(isEditing ? update.url(product.id) : store.url(), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={submit} className="grid gap-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
                {/* 1. Identidade da peça */}
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader className="p-5 sm:p-6">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Identidade da peça
                        </p>
                        <CardTitle className="text-xl tracking-tight sm:text-2xl">
                            Como a equipe vai encontrar este produto?
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            O código interno é gerado automaticamente ao salvar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 p-5 pt-0 sm:p-6 sm:pt-0">
                        {isEditing && (
                            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                                <span className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                                    Código interno
                                </span>
                                <span className="font-mono text-sm font-semibold text-foreground">
                                    {product.code}
                                </span>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label
                                htmlFor="product-name"
                                className="text-sm font-medium"
                            >
                                Nome do produto{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="product-name"
                                name="name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                aria-invalid={error('name') ? true : undefined}
                                placeholder="Ex.: Calça Wide Leg"
                                className="h-11 text-base sm:h-10 sm:text-sm"
                                autoFocus
                                required
                            />
                            <InputError message={error('name')} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="product-model"
                                    className="text-sm font-medium"
                                >
                                    Modelo{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (opcional)
                                    </span>
                                </Label>
                                <Input
                                    id="product-model"
                                    name="model"
                                    inputMode="numeric"
                                    value={form.data.model}
                                    onChange={(event) =>
                                        form.setData(
                                            'model',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Ex.: 2451"
                                    className="h-11 text-base sm:h-10 sm:text-sm"
                                />
                                <InputError message={error('model')} />
                            </div>

                            <div className="flex flex-col justify-center rounded-xl border border-dashed border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground sm:text-sm">
                                <span className="font-medium text-foreground">
                                    Modelo opcional
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    O código CJ identifica a peça mesmo sem
                                    modelo.
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="product-notes"
                                className="text-sm font-medium"
                            >
                                Observação{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </Label>
                            <Textarea
                                id="product-notes"
                                name="notes"
                                value={form.data.notes}
                                onChange={(event) =>
                                    form.setData('notes', event.target.value)
                                }
                                placeholder="Detalhes úteis para reconhecer a peça..."
                                rows={3}
                                className="text-base sm:text-sm"
                            />
                            <InputError message={error('notes')} />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Referência visual */}
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader className="p-5 sm:p-6">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Referência visual
                        </p>
                        <CardTitle className="text-xl tracking-tight sm:text-2xl">
                            Foto do produto
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Use um arquivo ou abra a câmera no celular. Você
                            pode cortar, girar e espelhar antes de salvar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                        <ProductImageUploader
                            value={form.data.image}
                            existingUrl={
                                form.data.remove_image
                                    ? null
                                    : product?.image_url
                            }
                            error={error('image')}
                            onChange={(file) => {
                                form.setData('image', file);
                                form.setData('remove_image', false);
                            }}
                            onRemoveExisting={() =>
                                form.setData('remove_image', true)
                            }
                        />
                    </CardContent>
                </Card>
            </div>

            {/* 3. Grade de tamanhos com Radio Group Cards */}
            <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                <CardHeader className="p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Layers className="size-4" />
                        </span>
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Grade de tamanhos
                        </p>
                    </div>
                    <CardTitle
                        id={radioGroupId}
                        className="text-xl tracking-tight sm:text-2xl"
                    >
                        Escolha o tipo de tamanho
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Selecione a grade que melhor representa a variação desta
                        peça.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 pt-0 sm:p-6 sm:pt-0">
                    <RadioGroup
                        value={selectedPreset}
                        onValueChange={handlePresetChange}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        aria-labelledby={radioGroupId}
                    >
                        {sizePresets.map((preset) => {
                            const isChecked = selectedPreset === preset.id;
                            const optionId = `preset-option-${preset.id}`;

                            return (
                                <label
                                    key={preset.id}
                                    htmlFor={optionId}
                                    className={cn(
                                        'relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4.5 transition-all select-none',
                                        isChecked
                                            ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                                            : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="grid gap-1">
                                            <span className="text-base font-semibold text-foreground">
                                                {preset.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {preset.subtitle}
                                            </span>
                                        </div>
                                        <RadioGroupItem
                                            id={optionId}
                                            value={preset.id}
                                            className="mt-0.5"
                                        />
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                                        {preset.sizes.map((size) => (
                                            <span
                                                key={size}
                                                className={cn(
                                                    'inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-1 font-mono text-xs font-semibold transition-colors',
                                                    isChecked
                                                        ? 'border border-primary/20 bg-primary/15 text-foreground'
                                                        : 'border border-border/50 bg-muted/60 text-muted-foreground',
                                                )}
                                            >
                                                {size}
                                            </span>
                                        ))}
                                    </div>
                                </label>
                            );
                        })}
                    </RadioGroup>

                    <InputError message={error('variants')} />
                </CardContent>
            </Card>

            {/* 4. Disponibilidade do lote */}
            <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                <CardHeader className="p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Package className="size-4" />
                        </span>
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Disponibilidade em estoque
                        </p>
                    </div>
                    <CardTitle className="text-xl tracking-tight sm:text-2xl">
                        Estoque da peça
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Informe o total se souber e ative os tamanhos presentes
                        neste lote. A quantidade por tamanho é opcional.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-7 p-5 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-end">
                        <div className="grid max-w-xs gap-2">
                            <Label
                                htmlFor="total-quantity"
                                className="text-sm font-semibold text-foreground"
                            >
                                Estoque total{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Quantidade total de peças prontas ou disponíveis
                                desta referência.
                            </p>
                            <Input
                                id="total-quantity"
                                name="total_quantity"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={form.data.total_quantity ?? ''}
                                onChange={(event) =>
                                    form.setData(
                                        'total_quantity',
                                        event.target.value === ''
                                            ? null
                                            : Math.max(
                                                  0,
                                                  parseInt(
                                                      event.target.value,
                                                      10,
                                                  ) || 0,
                                              ),
                                    )
                                }
                                placeholder="Ex.: 30"
                                className="h-11 text-base sm:h-10 sm:text-sm"
                                aria-invalid={
                                    error('total_quantity') ? true : undefined
                                }
                            />
                            <InputError message={error('total_quantity')} />
                        </div>

                        {hasFilledVariantQuantities ? (
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                                    <Sparkles className="size-3 text-primary" />
                                    Soma dos tamanhos: {sumOfVariantQuantities}
                                </span>
                                {String(form.data.total_quantity ?? '') !==
                                    String(sumOfVariantQuantities) && (
                                    <button
                                        type="button"
                                        onClick={applySumAsTotal}
                                        className="text-xs font-medium text-highlight underline underline-offset-2 hover:opacity-80 active:opacity-60"
                                    >
                                        Usar soma ({sumOfVariantQuantities})
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <Separator className="bg-border/70" />

                    <div className="grid gap-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                Tamanhos presentes no lote{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Ative um tamanho para informar que ele existe
                                neste lote. A quantidade pode ficar em branco.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7">
                            {form.data.variants.map((variant, index) => {
                                const activeId = `variant-active-${index}`;
                                const quantityId = `variant-qty-${index}`;

                                return (
                                    <div
                                        key={variant.size}
                                        className={cn(
                                            'grid items-center gap-2 sm:grid-cols-1 sm:items-stretch',
                                            variant.is_active
                                                ? 'grid-cols-[minmax(0,1fr)_7rem]'
                                                : 'grid-cols-1',
                                        )}
                                    >
                                        <Card
                                            className={cn(
                                                'gap-0 rounded-2xl border p-0 shadow-none transition-all',
                                                variant.is_active
                                                    ? 'border-primary/60 bg-primary/5 ring-2 ring-primary/15'
                                                    : 'border-border/80 bg-card hover:border-primary/40',
                                            )}
                                        >
                                            <label
                                                htmlFor={activeId}
                                                className="flex min-h-16 cursor-pointer items-center justify-between gap-3 p-3.5 select-none"
                                            >
                                                <span className="font-mono text-base font-bold text-foreground">
                                                    {variant.size}
                                                </span>
                                                <Switch
                                                    id={activeId}
                                                    pressed={variant.is_active}
                                                    onPressedChange={(
                                                        isActive,
                                                    ) =>
                                                        updateVariantActive(
                                                            index,
                                                            isActive,
                                                        )
                                                    }
                                                    aria-label={`${variant.is_active ? 'Desativar' : 'Ativar'} tamanho ${variant.size}`}
                                                />
                                            </label>
                                        </Card>

                                        {variant.is_active ? (
                                            <div className="grid gap-1.5">
                                                <Label
                                                    htmlFor={quantityId}
                                                    className="sr-only"
                                                >
                                                    Quantidade do tamanho{' '}
                                                    {variant.size}
                                                </Label>
                                                <Input
                                                    id={quantityId}
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    value={
                                                        variant.quantity ?? ''
                                                    }
                                                    onChange={(event) =>
                                                        updateVariantQuantity(
                                                            index,
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex.: 5"
                                                    className="h-[4.125rem] text-center font-mono text-sm"
                                                    aria-invalid={
                                                        error(
                                                            `variants.${index}.quantity`,
                                                        )
                                                            ? true
                                                            : undefined
                                                    }
                                                />
                                                <InputError
                                                    message={error(
                                                        `variants.${index}.quantity`,
                                                    )}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                        <InputError message={error('variants')} />
                    </div>
                </CardContent>
            </Card>

            {/* 5. Ações inferiores (Mobile-First) */}
            <div className="flex flex-col-reverse justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
                <p className="text-xs text-muted-foreground sm:text-sm">
                    Campos marcados com{' '}
                    <span className="text-destructive">*</span> são
                    obrigatórios. Estoque e modelo podem ser definidos depois.
                </p>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                        type="button"
                        variant="ghost"
                        asChild
                        className="h-11 text-base sm:h-10 sm:text-sm"
                    >
                        <Link href={productsIndex()}>Cancelar</Link>
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="h-12 min-w-44 text-base font-semibold sm:h-10 sm:text-sm"
                    >
                        {form.processing
                            ? 'Salvando...'
                            : isEditing
                              ? 'Salvar alterações'
                              : 'Cadastrar produto'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
