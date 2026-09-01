import { router, useForm } from '@inertiajs/react';
import { Layers, Package, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    update,
    store,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { ProductPhotoManager } from '@/components/products/product-photo-manager';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useScrollVisibility } from '@/hooks/use-scroll-visibility';
import { cn } from '@/lib/utils';
import type { Product, StockOfferType } from '@/types';

type VariantFormItem = {
    size: string;
    is_active: boolean;
    quantity: number | string | null;
};

type ProductFormData = {
    name: string;
    model: string;
    notes: string;
    has_stock_offer: boolean;
    stock_offer_type: StockOfferType | '';
    total_quantity: number | string | null;
    volumes: number | string | null;
    variants: VariantFormItem[];
    images: File[];
    image_order: string[];
    remove_media_ids: number[];
    _method?: 'PUT';
};

type ProductFormProps = {
    product?: Product;
};

type ProductErrorField =
    | keyof ProductFormData
    | `variants.${number}.size`
    | `variants.${number}.quantity`;

type SizePresetId =
    | 'none'
    | 'single'
    | 'numeric-female'
    | 'numeric-male'
    | 'letters'
    | 'custom';

type SizePreset = {
    id: SizePresetId;
    label: string;
    subtitle: string;
    sizes: string[];
};

const sizePresets: SizePreset[] = [
    {
        id: 'none',
        label: 'Sem tamanhos',
        subtitle: 'Produto sem grade definida',
        sizes: [],
    },
    {
        id: 'single',
        label: 'Único',
        subtitle: 'Tamanho único (U)',
        sizes: ['U'],
    },
    {
        id: 'numeric-female',
        label: 'Numérica feminina',
        subtitle: 'Feminino (34 ao 46)',
        sizes: ['34', '36', '38', '40', '42', '44', '46'],
    },
    {
        id: 'numeric-male',
        label: 'Numérica masculina',
        subtitle: 'Masculino (36 ao 48)',
        sizes: ['36', '38', '40', '42', '44', '46', '48'],
    },
    {
        id: 'letters',
        label: 'Tamanho por letras',
        subtitle: 'PP ao GG',
        sizes: ['PP', 'P', 'M', 'G', 'GG'],
    },
    {
        id: 'custom',
        label: 'Personalizada',
        subtitle: 'Defina os tamanhos manualmente',
        sizes: [],
    },
];

const hiddenSizePresetIds: SizePresetId[] = ['none', 'single', 'numeric-male'];

const visibleSizePresets = sizePresets.filter(
    (preset) => !hiddenSizePresetIds.includes(preset.id),
);

const stockOfferTypes: Array<{
    id: StockOfferType;
    label: string;
}> = [
    { id: 'replenishment', label: 'Reposição' },
    { id: 'new_grade', label: 'Grade Nova' },
    { id: 'broken_grade', label: 'Grade Furada' },
];

function stockOfferRequiresVolumes(type: StockOfferType | ''): boolean {
    return type === 'replenishment' || type === 'broken_grade';
}

function detectPreset(variants: Array<{ size: string }>): SizePresetId {
    const sizes = variants.map((variant) => variant.size.toUpperCase().trim());

    const matchingPreset = sizePresets.find(
        (preset) =>
            preset.id !== 'custom' &&
            preset.sizes.length === sizes.length &&
            preset.sizes.every((size, index) => size === sizes[index]),
    );

    return matchingPreset?.id ?? 'custom';
}

export function ProductForm({ product }: ProductFormProps) {
    const isEditing = product !== undefined;
    const initialPreset = detectPreset(product?.variants ?? []);
    const [selectedPreset, setSelectedPreset] =
        useState<SizePresetId>(initialPreset);
    const [processingImages, setProcessingImages] = useState(false);
    const radioGroupId = useId();
    const formRef = useRef<HTMLFormElement>(null);
    const submittingRef = useRef(false);
    const { isVisible: isFooterVisible, show: showFooter } =
        useScrollVisibility();

    const initialVariants: VariantFormItem[] =
        product && product.variants.length > 0
            ? product.variants.map(({ size, is_active, quantity }) => ({
                  size,
                  is_active: is_active ?? false,
                  quantity: is_active ? (quantity ?? null) : null,
              }))
            : [];

    const form = useForm<ProductFormData>({
        name: product?.name ?? '',
        model: product?.model ?? '',
        notes: product?.notes ?? '',
        has_stock_offer: product?.has_stock_offer ?? false,
        stock_offer_type: product?.stock_offer_type ?? '',
        total_quantity: product?.total_quantity ?? null,
        volumes: product?.volumes ?? null,
        variants: initialVariants,
        images: [],
        image_order: product?.images.map((image) => 'media:' + image.id) ?? [],
        remove_media_ids: [],
        ...(isEditing ? { _method: 'PUT' as const } : {}),
    });

    const error = (field: ProductErrorField): string | undefined =>
        form.errors[field] as string | undefined;

    const hasErrors = Object.keys(form.errors).length > 0;
    const errorEntries = Object.entries(form.errors).filter(([, message]) =>
        Boolean(message),
    );

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!form.isDirty || submittingRef.current) {
                return;
            }

            event.preventDefault();
            event.returnValue = true;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () =>
            window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [form.isDirty]);

    useEffect(() => {
        const removeBeforeVisitListener = router.on('before', () => {
            if (!form.isDirty || form.processing || submittingRef.current) {
                return;
            }

            return window.confirm(
                'Você tem alterações não salvas. Deseja sair mesmo assim?',
            );
        });

        return removeBeforeVisitListener;
    }, [form.isDirty, form.processing]);

    useEffect(() => {
        if (!hasErrors || form.processing) {
            return;
        }

        window.requestAnimationFrame(() => {
            const firstInvalidField =
                formRef.current?.querySelector<HTMLElement>(
                    '[aria-invalid="true"]',
                );

            firstInvalidField?.scrollIntoView({ block: 'center' });
            firstInvalidField?.focus({ preventScroll: true });
        });
    }, [form.errors, form.processing, hasErrors]);

    const handlePresetChange = (presetId: string) => {
        const nextPreset = sizePresets.find((p) => p.id === presetId);

        if (!nextPreset) {
            return;
        }

        setSelectedPreset(nextPreset.id);

        if (nextPreset.id === 'custom') {
            return;
        }

        const currentVariants = new Map(
            form.data.variants.map((variant) => [variant.size, variant]),
        );

        const wouldDiscardData = form.data.variants.some(
            (variant) =>
                !nextPreset.sizes.includes(variant.size) &&
                (variant.is_active ||
                    variant.quantity !== null ||
                    (selectedPreset === 'custom' &&
                        variant.size.trim() !== '')),
        );

        if (wouldDiscardData) {
            setSelectedPreset('custom');

            return;
        }

        form.setData(
            'variants',
            nextPreset.sizes.map((size) => ({
                size,
                is_active: currentVariants.get(size)?.is_active ?? false,
                quantity: currentVariants.get(size)?.quantity ?? null,
            })),
        );
    };

    const updateVariantSize = (index: number, size: string) => {
        form.setData(
            'variants',
            form.data.variants.map((variant, variantIndex) =>
                variantIndex === index ? { ...variant, size } : variant,
            ),
        );
    };

    const addCustomSize = () => {
        setSelectedPreset('custom');
        form.setData('variants', [
            ...form.data.variants,
            { size: '', is_active: false, quantity: null },
        ]);
    };

    const removeCustomSize = (index: number) => {
        form.setData(
            'variants',
            form.data.variants.filter(
                (_, variantIndex) => variantIndex !== index,
            ),
        );
    };

    const selectStockOfferType = (value: string) => {
        const type = value as StockOfferType;

        form.setData((previousData) => ({
            ...previousData,
            stock_offer_type: type,
            volumes: stockOfferRequiresVolumes(type)
                ? previousData.volumes
                : null,
        }));
    };

    const toggleStockOffer = (hasStockOffer: boolean) => {
        form.setData((previousData) => ({
            ...previousData,
            has_stock_offer: hasStockOffer,
            stock_offer_type: hasStockOffer
                ? previousData.stock_offer_type || 'new_grade'
                : '',
            total_quantity: hasStockOffer ? previousData.total_quantity : null,
            volumes: hasStockOffer ? previousData.volumes : null,
        }));
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
        submittingRef.current = true;

        form.post(isEditing ? update.url(product.id) : store.url(), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                submittingRef.current = false;
            },
        });
    };

    return (
        <form
            ref={formRef}
            onSubmit={submit}
            className="grid gap-6 pb-48 sm:pb-28"
        >
            <p className="text-xs text-muted-foreground sm:text-sm">
                Campos marcados com <span className="text-destructive">*</span>{' '}
                são obrigatórios. As quantidades por tamanho podem ficar em
                branco.
            </p>

            {hasErrors && (
                <div
                    role="alert"
                    aria-labelledby="product-form-errors"
                    className="grid gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                >
                    <p id="product-form-errors" className="font-semibold">
                        Não foi possível salvar o produto.
                    </p>
                    <p>
                        Revise os campos destacados antes de tentar novamente.
                    </p>
                    <ul className="grid list-disc gap-1 pl-5">
                        {errorEntries.slice(0, 5).map(([field, message]) => (
                            <li key={field}>{message}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
                {/* 1. Identidade da peça */}
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader className="p-5 sm:p-6">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Identidade da peça
                        </p>
                        <h2 className="text-xl tracking-tight sm:text-2xl">
                            Dados do produto
                        </h2>
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
                                    value={form.data.model}
                                    onChange={(event) =>
                                        form.setData(
                                            'model',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={
                                        error('model') ? true : undefined
                                    }
                                    placeholder="Ex.: 2451"
                                    className="h-11 text-base sm:h-10 sm:text-sm"
                                />
                                <InputError message={error('model')} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="product-notes"
                                className="text-sm font-medium"
                            >
                                Mais detalhes{' '}
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
                                aria-invalid={error('notes') ? true : undefined}
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
                        <h2 className="text-xl tracking-tight sm:text-2xl">
                            Fotos
                        </h2>
                        <CardDescription className="text-xs sm:text-sm">
                            Adicione até 5 fotos pela câmera ou pela galeria. O
                            enquadramento é definido antes de salvar cada foto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                        <ProductPhotoManager
                            value={form.data.images}
                            existingImages={product?.images ?? []}
                            error={error('images') ?? error('image_order')}
                            errors={form.errors as Record<string, string>}
                            onChange={(change) => {
                                form.setData((previousData) => ({
                                    ...previousData,
                                    images: change.files,
                                    image_order: change.imageOrder,
                                    remove_media_ids: change.removeMediaIds,
                                }));
                            }}
                            onProcessingChange={setProcessingImages}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* 3. Tamanhos do produto */}
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
                    <h2
                        id={radioGroupId}
                        className="text-xl tracking-tight sm:text-2xl"
                    >
                        Tamanhos
                    </h2>
                    <CardDescription className="text-xs sm:text-sm">
                        Escolha uma grade pronta ou defina os tamanhos da peça.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 pt-0 sm:p-6 sm:pt-0">
                    <RadioGroup
                        value={selectedPreset}
                        onValueChange={handlePresetChange}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                        aria-labelledby={radioGroupId}
                        aria-invalid={error('variants') ? true : undefined}
                    >
                        {visibleSizePresets.map((preset) => {
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

                                    {preset.sizes.length > 0 ? (
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
                                    ) : null}
                                </label>
                            );
                        })}
                    </RadioGroup>

                    {selectedPreset === 'custom' && (
                        <div className="grid gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
                            <div className="grid gap-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Tamanhos personalizados
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Adicione os tamanhos na ordem em que devem
                                    aparecer.
                                </p>
                            </div>

                            {form.data.variants.map((variant, index) => (
                                <div
                                    key={`${index}-${variant.size}`}
                                    className="flex items-start gap-2"
                                >
                                    <div className="grid min-w-0 flex-1 gap-1.5">
                                        <Label
                                            htmlFor={`custom-size-${index}`}
                                            className="sr-only"
                                        >
                                            Tamanho {index + 1}
                                        </Label>
                                        <Input
                                            id={`custom-size-${index}`}
                                            value={variant.size}
                                            onChange={(event) =>
                                                updateVariantSize(
                                                    index,
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Ex.: 3G ou 42"
                                            className="h-12 text-base sm:text-sm"
                                            aria-invalid={
                                                error(`variants.${index}.size`)
                                                    ? true
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            message={error(
                                                `variants.${index}.size`,
                                            )}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => removeCustomSize(index)}
                                        className="size-12 shrink-0 px-0 text-muted-foreground hover:text-destructive"
                                        aria-label={`Remover tamanho ${index + 1}`}
                                    >
                                        <X />
                                    </Button>
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={addCustomSize}
                                className="h-12 w-full sm:w-fit"
                            >
                                <Plus />
                                Adicionar tamanho
                            </Button>
                        </div>
                    )}

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
                    <h2 className="text-xl tracking-tight sm:text-2xl">
                        Oferta de estoque (opcional)
                    </h2>
                    <CardDescription className="text-xs sm:text-sm">
                        {isEditing
                            ? 'Atualize a disponibilidade ou desative somente a oferta, mantendo o produto cadastrado.'
                            : 'Cadastre uma disponibilidade agora ou salve somente os dados do produto para criar a oferta depois.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-7 p-5 pt-0 sm:p-6 sm:pt-0">
                    <label
                        htmlFor="has-stock-offer"
                        className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-4 select-none"
                    >
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Há uma oferta de estoque ativa agora?
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {form.data.has_stock_offer
                                    ? 'Ela ficará disponível no catálogo enquanto houver estoque.'
                                    : isEditing
                                      ? 'A oferta será desativada, mas o produto continuará cadastrado.'
                                      : 'O produto será salvo sem uma oferta de estoque ativa.'}
                            </p>
                        </div>
                        <Switch
                            id="has-stock-offer"
                            checked={form.data.has_stock_offer}
                            onCheckedChange={toggleStockOffer}
                            aria-label={
                                form.data.has_stock_offer
                                    ? 'Desativar oferta de estoque'
                                    : 'Ativar oferta de estoque'
                            }
                        />
                    </label>

                    {form.data.has_stock_offer ? (
                        <>
                            <fieldset className="grid gap-3">
                                <legend className="text-sm font-semibold text-foreground">
                                    Tipo da oferta
                                </legend>
                                <RadioGroup
                                    value={form.data.stock_offer_type}
                                    onValueChange={selectStockOfferType}
                                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                                    aria-invalid={
                                        error('stock_offer_type')
                                            ? true
                                            : undefined
                                    }
                                >
                                    {stockOfferTypes.map((offerType) => {
                                        const optionId = `stock-offer-type-${offerType.id}`;

                                        return (
                                            <label
                                                key={offerType.id}
                                                htmlFor={optionId}
                                                className={cn(
                                                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors select-none',
                                                    form.data
                                                        .stock_offer_type ===
                                                        offerType.id
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                        : 'border-border hover:bg-muted/30',
                                                )}
                                            >
                                                <RadioGroupItem
                                                    id={optionId}
                                                    value={offerType.id}
                                                />
                                                {offerType.label}
                                            </label>
                                        );
                                    })}
                                </RadioGroup>
                                <InputError
                                    message={error('stock_offer_type')}
                                />
                            </fieldset>

                            <div className="grid gap-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid max-w-xs gap-2">
                                        <Label
                                            htmlFor="total-quantity"
                                            className="text-sm font-semibold text-foreground"
                                        >
                                            Estoque total{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Quantidade total de peças prontas ou
                                            disponíveis desta referência.
                                        </p>
                                        <Input
                                            id="total-quantity"
                                            name="total_quantity"
                                            type="number"
                                            min="0"
                                            inputMode="numeric"
                                            value={
                                                form.data.total_quantity ?? ''
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'total_quantity',
                                                    event.target.value === ''
                                                        ? null
                                                        : Math.max(
                                                              0,
                                                              parseInt(
                                                                  event.target
                                                                      .value,
                                                                  10,
                                                              ) || 0,
                                                          ),
                                                )
                                            }
                                            placeholder="Ex.: 30"
                                            className="h-11 text-base sm:h-10 sm:text-sm"
                                            required
                                            aria-invalid={
                                                error('total_quantity')
                                                    ? true
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            message={error('total_quantity')}
                                        />
                                    </div>

                                    {stockOfferRequiresVolumes(
                                        form.data.stock_offer_type,
                                    ) ? (
                                        <div className="grid max-w-xs gap-2">
                                            <Label
                                                htmlFor="volumes"
                                                className="text-sm font-semibold text-foreground"
                                            >
                                                Sacos disponíveis{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Quantidade de sacos que ainda
                                                podem ser solicitados. Ao chegar
                                                a zero, a oferta sai do
                                                catálogo.
                                            </p>
                                            <Input
                                                id="volumes"
                                                name="volumes"
                                                type="number"
                                                min="1"
                                                step="1"
                                                inputMode="numeric"
                                                value={form.data.volumes ?? ''}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'volumes',
                                                        event.target.value ===
                                                            ''
                                                            ? null
                                                            : Math.max(
                                                                  1,
                                                                  parseInt(
                                                                      event
                                                                          .target
                                                                          .value,
                                                                      10,
                                                                  ) || 1,
                                                              ),
                                                    )
                                                }
                                                placeholder="Ex.: 12"
                                                className="h-11 text-base sm:h-10 sm:text-sm"
                                                required
                                                aria-invalid={
                                                    error('volumes')
                                                        ? true
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                message={error('volumes')}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                {hasFilledVariantQuantities ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                                            <Sparkles className="size-3 text-primary" />
                                            Soma dos tamanhos:{' '}
                                            {sumOfVariantQuantities}
                                        </span>
                                        {String(
                                            form.data.total_quantity ?? '',
                                        ) !==
                                            String(sumOfVariantQuantities) && (
                                            <button
                                                type="button"
                                                onClick={applySumAsTotal}
                                                className="text-xs font-medium text-highlight underline underline-offset-2 hover:opacity-80 active:opacity-60"
                                            >
                                                Usar soma (
                                                {sumOfVariantQuantities})
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
                                        Ative um tamanho para informar que ele
                                        existe neste lote. A quantidade pode
                                        ficar em branco.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7">
                                    {form.data.variants.map(
                                        (variant, index) => {
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
                                                            'h-12 gap-0 rounded-xl border p-0 shadow-none transition-colors',
                                                            variant.is_active
                                                                ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/15'
                                                                : 'border-border/80 bg-muted/20 hover:border-primary/40',
                                                        )}
                                                    >
                                                        <label
                                                            htmlFor={activeId}
                                                            className="flex h-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 select-none"
                                                        >
                                                            <span className="font-mono text-base font-bold text-foreground">
                                                                {variant.size}
                                                            </span>
                                                            <Switch
                                                                id={activeId}
                                                                checked={
                                                                    variant.is_active
                                                                }
                                                                onCheckedChange={(
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
                                                                htmlFor={
                                                                    quantityId
                                                                }
                                                                className="sr-only"
                                                            >
                                                                Quantidade do
                                                                tamanho{' '}
                                                                {variant.size}
                                                            </Label>
                                                            <Input
                                                                id={quantityId}
                                                                type="number"
                                                                min="0"
                                                                inputMode="numeric"
                                                                value={
                                                                    variant.quantity ??
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateVariantQuantity(
                                                                        index,
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Ex.: 5"
                                                                className="h-12 rounded-xl px-2 text-center font-mono text-sm"
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
                                        },
                                    )}
                                </div>
                                <InputError message={error('variants')} />
                            </div>
                        </>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                            {isEditing
                                ? 'A oferta de estoque será desativada ao salvar. O produto continuará cadastrado.'
                                : 'Nenhuma oferta de estoque será criada ao salvar este produto.'}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 5. Ações inferiores (Mobile-First) */}
            <div
                onFocusCapture={showFooter}
                className={cn(
                    'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 ease-out will-change-transform sm:p-4 md:right-0 md:left-(--sidebar-width) md:peer-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+1rem)]',
                    isFooterVisible ? 'translate-y-0' : 'translate-y-full',
                )}
            >
                <div className="mx-auto flex w-full max-w-7xl justify-end">
                    <Button
                        type="submit"
                        disabled={form.processing || processingImages}
                        className="h-12 min-w-44 text-base font-semibold sm:text-sm"
                    >
                        {form.processing
                            ? 'Salvando...'
                            : processingImages
                              ? 'Preparando fotos...'
                              : isEditing
                                ? 'Salvar alterações'
                                : 'Cadastrar produto'}
                    </Button>
                </div>
            </div>
        </form>
    );
}
