import { router, useForm } from '@inertiajs/react';
import {
    Info,
    Layers,
    ListCheck,
    ListX,
    Package,
    PackageX,
    Plus,
    Save,
    Sparkles,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    update,
    store,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { ProductPhotoManager } from '@/components/products/product-photo-manager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
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
    is_active: boolean;
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

type SizePresetId = 'none' | 'numeric-female' | 'letters' | 'custom';

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
        id: 'numeric-female',
        label: 'Numérica feminina',
        subtitle: 'Feminino (34 ao 46)',
        sizes: ['34', '36', '38', '40', '42', '44', '46'],
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

const hiddenSizePresetIds: SizePresetId[] = ['none'];

const visibleSizePresets = sizePresets.filter(
    (preset) => !hiddenSizePresetIds.includes(preset.id),
);

const stockOfferTypes: Array<{
    id: StockOfferType;
    label: string;
    description: string;
}> = [
    {
        id: 'replenishment',
        label: 'Reposição',
        description: 'Distribuição em sacos.',
    },
    {
        id: 'new_grade',
        label: 'Grade Nova',
        description: 'Grade completa, sem controle de sacos.',
    },
    {
        id: 'broken_grade',
        label: 'Grade Furada',
        description: 'Grade incompleta, distribuída em sacos.',
    },
];

function stockOfferRequiresVolumes(type: StockOfferType | ''): boolean {
    return type === 'replenishment' || type === 'broken_grade';
}

function hasStockOfferData(
    data: Pick<ProductFormData, 'total_quantity' | 'volumes' | 'variants'>,
): boolean {
    return (
        Number(data.total_quantity) > 0 ||
        Number(data.volumes) > 0 ||
        data.variants.some(
            (variant) =>
                variant.is_active ||
                (variant.quantity !== null && variant.quantity !== ''),
        )
    );
}

function hasVariantQuantity(variant: VariantFormItem): boolean {
    return (
        variant.is_active &&
        variant.quantity !== null &&
        variant.quantity !== ''
    );
}

function hasVariantQuantities(variants: VariantFormItem[]): boolean {
    return variants.some(hasVariantQuantity);
}

function sumVariantQuantities(variants: VariantFormItem[]): number {
    return variants.reduce((total, variant) => {
        if (!hasVariantQuantity(variant)) {
            return total;
        }

        const quantity = Number(variant.quantity);

        return Number.isNaN(quantity) ? total : total + quantity;
    }, 0);
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
    const initialPreset = product
        ? detectPreset(product.variants)
        : 'numeric-female';
    const [selectedPreset, setSelectedPreset] =
        useState<SizePresetId>(initialPreset);
    const [pendingPresetId, setPendingPresetId] = useState<SizePresetId | null>(
        null,
    );
    const [processingImages, setProcessingImages] = useState(false);
    const radioGroupId = useId();
    const formRef = useRef<HTMLFormElement>(null);
    const submittingRef = useRef(false);
    const { isMobile, state: sidebarState } = useSidebar();
    const { isVisible: isFooterVisible, show: showFooter } =
        useScrollVisibility({ showAtDocumentEnd: true });
    const pendingPreset = pendingPresetId
        ? sizePresets.find((preset) => preset.id === pendingPresetId)
        : undefined;
    const pendingPresetDescription = pendingPreset
        ? `Trocar para a grade "${pendingPreset.label}" substituirá a lista atual. Tamanhos fora da nova grade, com suas marcações e quantidades, serão descartados.`
        : '';

    const initialVariants: VariantFormItem[] =
        product && product.variants.length > 0
            ? product.variants.map(({ size, is_active, quantity }) => ({
                  size,
                  is_active: is_active ?? false,
                  quantity: is_active ? (quantity ?? null) : null,
              }))
            : (sizePresets
                  .find((preset) => preset.id === initialPreset)
                  ?.sizes.map((size) => ({
                      size,
                      is_active: false,
                      quantity: null,
                  })) ?? []);

    const initialTotalQuantity = hasVariantQuantities(initialVariants)
        ? sumVariantQuantities(initialVariants)
        : (product?.total_quantity ?? null);

    const form = useForm<ProductFormData>({
        name: product?.name ?? '',
        model: product?.model ?? '',
        notes: product?.notes ?? '',
        is_active: product?.is_active ?? true,
        has_stock_offer: product?.has_stock_offer ?? false,
        stock_offer_type: product?.stock_offer_type ?? 'new_grade',
        total_quantity: initialTotalQuantity,
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
        const removeBeforeVisitListener = router.on('before', (event) => {
            if (event.detail.visit.prefetch) {
                return;
            }

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

    const updateStockData = (
        updater: (previousData: ProductFormData) => ProductFormData,
    ) => {
        form.setData((previousData) => {
            const nextData = updater(previousData);
            const nextHasVariantQuantities = hasVariantQuantities(
                nextData.variants,
            );

            return {
                ...nextData,
                total_quantity: nextHasVariantQuantities
                    ? sumVariantQuantities(nextData.variants)
                    : nextData.total_quantity,
                has_stock_offer: hasStockOfferData(nextData),
            };
        });
    };

    const applyPreset = (nextPreset: SizePreset) => {
        const currentVariants = new Map(
            form.data.variants.map((variant) => [variant.size, variant]),
        );

        setSelectedPreset(nextPreset.id);

        updateStockData((previousData) => ({
            ...previousData,
            variants: nextPreset.sizes.map((size) => ({
                size,
                is_active: currentVariants.get(size)?.is_active ?? false,
                quantity: currentVariants.get(size)?.quantity ?? null,
            })),
        }));
    };

    const handlePresetChange = (presetId: string) => {
        const nextPreset = sizePresets.find((p) => p.id === presetId);

        if (!nextPreset) {
            return;
        }

        if (nextPreset.id === 'custom') {
            setPendingPresetId(null);
            setSelectedPreset(nextPreset.id);

            return;
        }

        const wouldDiscardData = form.data.variants.some(
            (variant) =>
                !nextPreset.sizes.includes(variant.size) &&
                (variant.is_active ||
                    variant.quantity !== null ||
                    (selectedPreset === 'custom' &&
                        variant.size.trim() !== '')),
        );

        if (wouldDiscardData) {
            setPendingPresetId(nextPreset.id);

            return;
        }

        applyPreset(nextPreset);
    };

    const cancelPresetChange = () => {
        setPendingPresetId(null);
    };

    const confirmPresetChange = () => {
        if (!pendingPreset) {
            return;
        }

        applyPreset(pendingPreset);
        setPendingPresetId(null);
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
        const variant = form.data.variants[index];

        if (
            variant &&
            (variant.is_active ||
                (variant.quantity !== null && variant.quantity !== '')) &&
            !window.confirm(
                `Remover o tamanho ${variant.size || 'informado'}? A presença e a quantidade serão apagadas.`,
            )
        ) {
            return;
        }

        updateStockData((previousData) => ({
            ...previousData,
            variants: previousData.variants.filter(
                (_, variantIndex) => variantIndex !== index,
            ),
        }));
    };

    const selectStockOfferType = (value: string) => {
        const type = value as StockOfferType;

        if (
            !stockOfferRequiresVolumes(type) &&
            form.data.volumes !== null &&
            form.data.volumes !== '' &&
            !window.confirm(
                'Este tipo de estoque não usa sacos. O número informado será apagado. Deseja continuar?',
            )
        ) {
            return;
        }

        updateStockData((previousData) => ({
            ...previousData,
            stock_offer_type: type,
            volumes: stockOfferRequiresVolumes(type)
                ? previousData.volumes
                : null,
        }));
    };

    const toggleProductActive = (isActive: boolean) => {
        form.setData('is_active', isActive);
    };

    const updateVariantActive = (index: number, isActive: boolean) => {
        const variant = form.data.variants[index];

        if (
            variant &&
            !isActive &&
            variant.quantity !== null &&
            variant.quantity !== '' &&
            !window.confirm(
                `Desativar o tamanho ${variant.size}? A quantidade informada será apagada.`,
            )
        ) {
            return;
        }

        updateStockData((previousData) => ({
            ...previousData,
            variants: previousData.variants.map((variant, variantIndex) =>
                variantIndex === index
                    ? {
                          ...variant,
                          is_active: isActive,
                          quantity: isActive ? variant.quantity : null,
                      }
                    : variant,
            ),
        }));
    };

    const setAllVariantsActive = (isActive: boolean) => {
        if (
            !isActive &&
            form.data.variants.some(
                (variant) =>
                    variant.quantity !== null && variant.quantity !== '',
            ) &&
            !window.confirm(
                'Desmarcar todos os tamanhos apagará as quantidades informadas. Deseja continuar?',
            )
        ) {
            return;
        }

        updateStockData((previousData) => ({
            ...previousData,
            variants: previousData.variants.map((variant) => ({
                ...variant,
                is_active: isActive,
                quantity: isActive ? variant.quantity : null,
            })),
        }));
    };

    const updateVariantQuantity = (index: number, rawValue: string) => {
        const sanitized =
            rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10) || 0);

        updateStockData((previousData) => ({
            ...previousData,
            variants: previousData.variants.map((variant, variantIndex) =>
                variantIndex === index
                    ? { ...variant, quantity: sanitized }
                    : variant,
            ),
        }));
    };

    const hasFilledVariantQuantities = hasVariantQuantities(form.data.variants);
    const sumOfVariantQuantities = sumVariantQuantities(form.data.variants);

    const hasCurrentStockData = hasStockOfferData(form.data);
    const hasPositiveTotal = Number(form.data.total_quantity) > 0;
    const hasAvailableVolumes =
        !stockOfferRequiresVolumes(form.data.stock_offer_type) ||
        Number(form.data.volumes) > 0;
    const distributionStatus = !form.data.is_active
        ? 'Não aparece para as vendedoras: produto oculto.'
        : !form.data.has_stock_offer
          ? 'Não aparece para as vendedoras: sem estoque disponível.'
          : !hasPositiveTotal
            ? 'Não aparece para as vendedoras: estoque zerado.'
            : !hasAvailableVolumes
              ? 'Não aparece para as vendedoras: sem sacos disponíveis.'
              : 'Aparece para as vendedoras.';

    const clearCurrentStock = () => {
        const confirmed = window.confirm(
            'Isso retirará a oferta de estoque do catálogo, zerará o estoque e os sacos disponíveis e limpará as quantidades deste lote. Deseja continuar?',
        );

        if (!confirmed) {
            return;
        }

        form.setData((previousData) => ({
            ...previousData,
            has_stock_offer: false,
            total_quantity: 0,
            volumes: stockOfferRequiresVolumes(previousData.stock_offer_type)
                ? 0
                : null,
            variants: previousData.variants.map((variant) => ({
                ...variant,
                is_active: false,
                quantity: null,
            })),
        }));
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

            <Card className="gap-0 rounded-[1.75rem] border-border/80 p-0 shadow-sm">
                <label
                    htmlFor="is-active"
                    className="flex min-h-12 cursor-pointer items-center justify-between gap-4 p-5 select-none sm:p-6"
                >
                    <div className="grid gap-1">
                        <p className="text-sm font-semibold text-foreground">
                            Produto ativo
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {form.data.is_active
                                ? 'O produto poderá aparecer no catálogo quando houver estoque disponível.'
                                : 'O produto ficará oculto do catálogo, sem alterar o estoque.'}
                        </p>
                    </div>
                    <Switch
                        id="is-active"
                        checked={form.data.is_active}
                        onCheckedChange={toggleProductActive}
                        aria-label={
                            form.data.is_active
                                ? 'Desativar produto'
                                : 'Ativar produto'
                        }
                    />
                </label>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
                {/* 1. Identidade da peça */}
                <Card className="gap-0 rounded-[1.75rem] border-border/80 p-0 shadow-sm">
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
                                Observações{' '}
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
                                placeholder="Cor, lavagem ou algum detalhe importante..."
                                rows={3}
                                className="text-base sm:text-sm"
                            />
                            <InputError message={error('notes')} />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Referência visual */}
                <Card className="gap-0 rounded-[1.75rem] border-border/80 p-0 shadow-sm">
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
            <Card className="gap-0 rounded-[1.75rem] border-border/80 p-0 shadow-sm">
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
            <Card className="gap-0 rounded-[1.75rem] border-border/80 p-0 shadow-sm">
                <CardHeader className="p-5 sm:p-6">
                    <div className="grid gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Package className="size-4" />
                            </span>
                            <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                Disponibilidade em estoque
                            </p>
                        </div>
                        <h2 className="text-xl tracking-tight sm:text-2xl">
                            Estoque disponível
                        </h2>
                        <CardDescription className="text-xs sm:text-sm">
                            Informe o tipo e as quantidades do estoque atual.
                            O produto aparece para as vendedoras quando há
                            estoque disponível.
                        </CardDescription>
                        <p className="text-sm font-medium text-foreground">
                            {distributionStatus}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-7 p-5 pt-0 sm:p-6 sm:pt-0">
                    <fieldset className="grid gap-3">
                        <legend className="text-sm font-semibold text-foreground">
                            Tipo do estoque
                        </legend>
                        <p className="text-xs text-muted-foreground">
                            Escolha como este lote será oferecido.
                        </p>
                        <RadioGroup
                            value={form.data.stock_offer_type}
                            onValueChange={selectStockOfferType}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                            aria-invalid={
                                error('stock_offer_type') ? true : undefined
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
                                            form.data.stock_offer_type ===
                                                offerType.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                : 'border-border hover:bg-muted/30',
                                        )}
                                    >
                                        <RadioGroupItem
                                            id={optionId}
                                            value={offerType.id}
                                        />
                                        <span className="grid gap-0.5">
                                            <span>{offerType.label}</span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {offerType.description}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </RadioGroup>
                        <InputError message={error('stock_offer_type')} />
                    </fieldset>

                    <div className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid max-w-xs gap-2">
                                <Label
                                    htmlFor="total-quantity"
                                    className="text-sm font-semibold text-foreground"
                                >
                                    Estoque total{' '}
                                    {form.data.has_stock_offer && (
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    )}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {hasFilledVariantQuantities
                                        ? 'Calculado pela soma das quantidades informadas nos tamanhos.'
                                        : 'Quantidade total de peças disponíveis neste lote.'}
                                </p>
                                <Input
                                    id="total-quantity"
                                    name="total_quantity"
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    readOnly={hasFilledVariantQuantities}
                                    aria-readonly={
                                        hasFilledVariantQuantities
                                            ? true
                                            : undefined
                                    }
                                    value={form.data.total_quantity ?? ''}
                                    onChange={(event) =>
                                        updateStockData((previousData) => ({
                                            ...previousData,
                                            total_quantity:
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
                                        }))
                                    }
                                    placeholder="Ex.: 30"
                                    className={cn(
                                        'h-11 text-base sm:h-10 sm:text-sm',
                                        hasFilledVariantQuantities &&
                                            'cursor-not-allowed bg-muted/40 text-muted-foreground',
                                    )}
                                    required={
                                        form.data.has_stock_offer &&
                                        !hasFilledVariantQuantities
                                    }
                                    aria-invalid={
                                        error('total_quantity')
                                            ? true
                                            : undefined
                                    }
                                />
                                <InputError message={error('total_quantity')} />
                                <Alert className="border-primary/25 bg-primary/5 p-3 [&>svg]:text-primary">
                                    <Info />
                                    <AlertTitle>
                                        Regra do estoque total
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        <p>
                                            Informe o total quando quiser controlar
                                            apenas o estoque do lote. Ao preencher
                                            uma quantidade por tamanho, o total
                                            será somado automaticamente e não
                                            poderá ser editado.
                                        </p>
                                    </AlertDescription>
                                </Alert>
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
                                        {form.data.has_stock_offer && (
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Quantidade de sacos que ainda podem ser
                                        solicitados. Ao chegar a zero, o produto
                                        sai do catálogo.
                                    </p>
                                    <Input
                                        id="volumes"
                                        name="volumes"
                                        type="number"
                                        min={form.data.has_stock_offer ? 1 : 0}
                                        step="1"
                                        inputMode="numeric"
                                        value={form.data.volumes ?? ''}
                                        onChange={(event) =>
                                            updateStockData((previousData) => ({
                                                ...previousData,
                                                volumes:
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
                                            }))
                                        }
                                        placeholder="Ex.: 12"
                                        className="h-11 text-base sm:h-10 sm:text-sm"
                                        required={form.data.has_stock_offer}
                                        aria-invalid={
                                            error('volumes') ? true : undefined
                                        }
                                    />
                                    <InputError message={error('volumes')} />
                                </div>
                            ) : null}
                        </div>

                        {hasFilledVariantQuantities ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                                    <Sparkles className="size-3 text-primary" />
                                    Estoque por tamanho · total calculado:{' '}
                                    {sumOfVariantQuantities}
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <Separator className="bg-border/70" />

                    <div className="grid gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Tamanhos presentes no lote{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (opcional)
                                    </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Marque os tamanhos que existem neste lote.
                                    Informe a quantidade somente quando quiser
                                    controlar o estoque por tamanho; deixe em
                                    branco se não souber.
                                </p>
                            </div>

                            {form.data.variants.length > 1 && (
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            setAllVariantsActive(true)
                                        }
                                        variant="secondary"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                    >
                                        <ListCheck />
                                        Marcar todos
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            setAllVariantsActive(false)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                    >
                                        <ListX />
                                        Desmarcar todos
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                            {form.data.variants.map((variant, index) => {
                                const activeId = `variant-active-${index}`;
                                const quantityId = `variant-qty-${index}`;
                                const quantityError = error(
                                    `variants.${index}.quantity`,
                                );

                                return (
                                    <div
                                        key={variant.size}
                                        className={cn(
                                            'group relative flex flex-row items-center justify-between rounded-2xl border p-3 transition-all duration-200 select-none sm:h-28 sm:flex-col sm:items-stretch sm:justify-between sm:p-3',
                                            variant.is_active
                                                ? 'border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/15'
                                                : 'border-border/70 bg-card hover:border-border',
                                            quantityError &&
                                                'border-destructive ring-1 ring-destructive/30',
                                        )}
                                    >
                                        <div className="flex items-center gap-3 sm:justify-between">
                                            <label
                                                htmlFor={activeId}
                                                className="cursor-pointer font-mono text-base font-bold text-foreground"
                                            >
                                                {variant.size}
                                            </label>
                                            <Switch
                                                id={activeId}
                                                checked={variant.is_active}
                                                onCheckedChange={(isActive) => {
                                                    updateVariantActive(
                                                        index,
                                                        isActive,
                                                    );

                                                    if (isActive) {
                                                        window.requestAnimationFrame(
                                                            () => {
                                                                document
                                                                    .getElementById(
                                                                        quantityId,
                                                                    )
                                                                    ?.focus();
                                                            },
                                                        );
                                                    }
                                                }}
                                                aria-label={`${variant.is_active ? 'Desativar' : 'Ativar'} tamanho ${variant.size}`}
                                            />
                                        </div>

                                        <div className="relative flex items-center justify-end sm:w-full">
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
                                                disabled={!variant.is_active}
                                                value={
                                                    variant.is_active
                                                        ? (variant.quantity ??
                                                          '')
                                                        : ''
                                                }
                                                onChange={(event) =>
                                                    updateVariantQuantity(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder={
                                                    variant.is_active
                                                        ? 'Qtd'
                                                        : '—'
                                                }
                                                aria-invalid={
                                                    quantityError
                                                        ? true
                                                        : undefined
                                                }
                                                className={cn(
                                                    'h-10 w-24 text-center font-mono text-sm transition-all duration-200 sm:h-9 sm:w-full',
                                                    variant.is_active
                                                        ? 'border-input bg-background text-foreground shadow-xs'
                                                        : 'pointer-events-none cursor-not-allowed border-transparent bg-muted/40 text-muted-foreground/30 shadow-none',
                                                )}
                                            />
                                        </div>

                                        {quantityError && (
                                            <div className="mt-1 sm:mt-0">
                                                <InputError
                                                    message={quantityError}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <InputError message={error('variants')} />
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Encerrar estoque atual
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Encerra a oferta atual e limpa as quantidades
                                deste lote ao salvar.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={clearCurrentStock}
                            disabled={!hasCurrentStockData}
                            className="h-11 shrink-0"
                        >
                            <PackageX />
                            Encerrar estoque
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 5. Ações inferiores (Mobile-First) */}
            <div
                onFocusCapture={showFooter}
                className={cn(
                    'fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/90 p-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[left,translate] duration-200 ease-in-out will-change-[translate] sm:p-4',
                    !isMobile &&
                        (sidebarState === 'collapsed'
                            ? 'md:left-[calc(var(--sidebar-width-icon)+1rem)]'
                            : 'md:left-(--sidebar-width)'),
                    isFooterVisible ? 'translate-y-0' : 'translate-y-full',
                )}
            >
                <div className="mx-auto flex w-full max-w-7xl justify-center sm:justify-end">
                    <Button
                        type="submit"
                        disabled={form.processing || processingImages}
                        className="h-12 w-full min-w-44 text-base font-semibold sm:w-auto sm:text-sm"
                    >
                        {form.processing || processingImages ? (
                            <Spinner />
                        ) : (
                            <Save />
                        )}
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

            {pendingPreset && (
                <>
                    <Dialog
                        open={!isMobile}
                        onOpenChange={(open) => {
                            if (!open) {
                                cancelPresetChange();
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <div className="flex items-start gap-3 text-left">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <TriangleAlert className="size-5" />
                                    </span>
                                    <div className="grid gap-1.5">
                                        <DialogTitle>
                                            Trocar grade de tamanhos?
                                        </DialogTitle>
                                        <DialogDescription>
                                            {pendingPresetDescription}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={cancelPresetChange}
                                >
                                    Manter grade atual
                                </Button>
                                <Button
                                    type="button"
                                    onClick={confirmPresetChange}
                                >
                                    Trocar grade
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Drawer
                        open={isMobile}
                        onOpenChange={(open) => {
                            if (!open) {
                                cancelPresetChange();
                            }
                        }}
                    >
                        <DrawerContent>
                            <DrawerHeader>
                                <div className="flex items-start gap-3 text-left">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <TriangleAlert className="size-5" />
                                    </span>
                                    <div className="grid gap-1.5">
                                        <DrawerTitle>
                                            Trocar grade de tamanhos?
                                        </DrawerTitle>
                                        <DrawerDescription>
                                            {pendingPresetDescription}
                                        </DrawerDescription>
                                    </div>
                                </div>
                            </DrawerHeader>
                            <DrawerFooter>
                                <Button
                                    type="button"
                                    onClick={confirmPresetChange}
                                >
                                    Trocar grade
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={cancelPresetChange}
                                >
                                    Manter grade atual
                                </Button>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </>
            )}
        </form>
    );
}
