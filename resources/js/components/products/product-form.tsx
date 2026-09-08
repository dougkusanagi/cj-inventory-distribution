import { router, useForm } from '@inertiajs/react';
import { Layers, PackageX, Save } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    update,
    store,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { ProductPhotoManager } from '@/components/products/product-photo-manager';
import { StockOfferVolumeEditor } from '@/components/products/stock-offer-volume-editor';
import type { StockOfferVolumeFormItem } from '@/components/products/stock-offer-volume-editor';
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
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useScrollVisibility } from '@/hooks/use-scroll-visibility';
import { cn } from '@/lib/utils';
import type { Product, StockOfferType } from '@/types';

type ProductFormData = {
    name: string;
    model: string;
    notes: string;
    is_active: boolean;
    has_stock_offer: boolean;
    stock_offer_type: StockOfferType | '';
    stock_volumes: StockOfferVolumeFormItem[];
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
    | `stock_volumes.${number}.total_quantity`
    | `stock_volumes.${number}.items.${number}.size`
    | `stock_volumes.${number}.items.${number}.quantity`;

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
        description: 'Grade completa, organizada por sacos.',
    },
    {
        id: 'broken_grade',
        label: 'Grade Furada',
        description: 'Grade incompleta, organizada por sacos.',
    },
];

const defaultSizes = ['34', '36', '38', '40', '42', '44', '46'];

function initialStockVolumes(product?: Product): StockOfferVolumeFormItem[] {
    if (product?.stock_volumes?.length) {
        return product.stock_volumes.map((volume) => ({
            id: volume.id,
            sort_order: volume.sort_order,
            total_quantity: volume.total_quantity,
            items: volume.items.map((item) => ({
                id: item.id,
                size: item.size,
                sort_order: item.sort_order,
                is_active: item.is_active,
                quantity: item.is_active ? item.quantity : null,
            })),
        }));
    }

    return [
        {
            total_quantity: null,
            items: defaultSizes.map((size) => ({
                size,
                is_active: false,
                quantity: null,
            })),
        },
    ];
}

function hasKnownVolumeQuantity(volume: StockOfferVolumeFormItem): boolean {
    return volume.items.some(
        (item) =>
            item.is_active &&
            item.quantity !== null &&
            item.quantity !== '' &&
            !Number.isNaN(Number(item.quantity)),
    );
}

function volumeTotal(volume: StockOfferVolumeFormItem): number {
    if (hasKnownVolumeQuantity(volume)) {
        return volume.items.reduce(
            (total, item) =>
                item.is_active && item.quantity !== null && item.quantity !== ''
                    ? total + Number(item.quantity)
                    : total,
            0,
        );
    }

    return Number(volume.total_quantity) || 0;
}

export function ProductForm({ product }: ProductFormProps) {
    const isEditing = product !== undefined;
    const [processingImages, setProcessingImages] = useState(false);
    const radioGroupId = useId();
    const formRef = useRef<HTMLFormElement>(null);
    const submittingRef = useRef(false);
    const { isMobile, state: sidebarState } = useSidebar();
    const { isVisible: isFooterVisible, show: showFooter } =
        useScrollVisibility({ showAtDocumentEnd: true });

    const form = useForm<ProductFormData>({
        name: product?.name ?? '',
        model: product?.model ?? '',
        notes: product?.notes ?? '',
        is_active: product?.is_active ?? true,
        has_stock_offer: product?.has_stock_offer ?? false,
        stock_offer_type: product?.stock_offer_type ?? 'new_grade',
        stock_volumes: initialStockVolumes(product),
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

    const selectStockOfferType = (value: string) => {
        form.setData('stock_offer_type', value as StockOfferType);
    };

    const toggleProductActive = (isActive: boolean) => {
        form.setData('is_active', isActive);
    };

    const hasPositiveTotal = form.data.stock_volumes.some(
        (volume) => volumeTotal(volume) > 0,
    );
    const hasAvailableVolumes = form.data.stock_volumes.length > 0;
    const hasCurrentStockData = form.data.stock_volumes.some(
        (volume) =>
            volumeTotal(volume) > 0 ||
            volume.items.some((item) => item.is_active),
    );
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
            stock_volumes: previousData.stock_volumes.map((volume) => ({
                ...volume,
                total_quantity: 0,
                items: volume.items.map((item) => ({
                    ...item,
                    is_active: false,
                    quantity: null,
                })),
            })),
        }));
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submittingRef.current = true;

        form.post(isEditing ? update.url(product.id) : store.url(), {
            forceFormData: form.data.images.length > 0,
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
            {/* 3. Disponibilidade do lote */}
            <Card className="gap-0 rounded-[1.75rem] border-border/80 p-0 shadow-sm">
                <CardHeader className="p-5 sm:p-6">
                    <div className="grid gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Layers className="size-4" />
                            </span>
                            <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                Disponibilidade em estoque
                            </p>
                        </div>
                        <h2 className="text-xl tracking-tight sm:text-2xl">
                            Estoque organizado por sacos
                        </h2>
                        <CardDescription className="text-xs sm:text-sm">
                            Cada saco tem sua própria grade e total. O total da
                            oferta é a soma dos sacos e é recalculado no
                            servidor.
                        </CardDescription>
                        <p className="text-sm font-medium text-foreground">
                            {distributionStatus}
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 p-5 pt-0 sm:p-6 sm:pt-0">
                    <label
                        htmlFor="has-stock-offer"
                        className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/80 bg-muted/20 p-4 select-none"
                    >
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Mostrar oferta no catálogo
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {form.data.has_stock_offer
                                    ? 'A oferta poderá aparecer quando o produto estiver ativo e tiver estoque disponível.'
                                    : 'A oferta ficará oculta, preservando os dados dos sacos para uma próxima ativação.'}
                            </p>
                        </div>
                        <Switch
                            id="has-stock-offer"
                            checked={form.data.has_stock_offer}
                            onCheckedChange={(checked) =>
                                form.setData('has_stock_offer', checked)
                            }
                            aria-label={
                                form.data.has_stock_offer
                                    ? 'Ocultar oferta do catálogo'
                                    : 'Mostrar oferta no catálogo'
                            }
                        />
                    </label>
                    <InputError message={error('has_stock_offer')} />

                    <fieldset className="grid gap-3">
                        <legend
                            id={radioGroupId}
                            className="text-sm font-semibold text-foreground"
                        >
                            Tipo do estoque
                        </legend>
                        <p className="text-xs text-muted-foreground">
                            Todos os tipos usam pelo menos um saco; a diferença
                            está na classificação da oferta.
                        </p>
                        <RadioGroup
                            value={form.data.stock_offer_type}
                            onValueChange={selectStockOfferType}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                            aria-labelledby={radioGroupId}
                            aria-invalid={
                                error('stock_offer_type') ? true : undefined
                            }
                        >
                            {stockOfferTypes.map((offerType) => {
                                const optionId =
                                    'stock-offer-type-' + offerType.id;

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

                    <StockOfferVolumeEditor
                        volumes={form.data.stock_volumes}
                        errors={form.errors as Record<string, string>}
                        onChange={(volumes) =>
                            form.setData('stock_volumes', volumes)
                        }
                    />

                    <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Encerrar estoque atual
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Oculta a oferta, zera os sacos e desativa os
                                tamanhos deste lote ao salvar.
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
        </form>
    );
}
