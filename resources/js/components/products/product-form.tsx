import { router, useForm } from '@inertiajs/react';
import {
    FileText,
    ImagePlus,
    Images,
    Layers,
    Package,
    PackageX,
    Save,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    update,
    store,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { ProductPhotoManager } from '@/components/products/product-photo-manager';
import type { ProductCoverPreview } from '@/components/products/product-photo-manager';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSidebar } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Category, Product, ProductLine, StockOfferType } from '@/types';

type ProductFormData = {
    name: string;
    model: string;
    category_id: string;
    line: ProductLine | '';
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
    categories: Category[];
};

type ProductFormTab = 'details' | 'photos' | 'stock';

const formTabs = [
    { id: 'details', label: 'Detalhes', icon: FileText },
    { id: 'photos', label: 'Fotos', icon: Images },
    { id: 'stock', label: 'Estoque', icon: Package },
] as const;

function tabForError(field: string): ProductFormTab {
    if (
        field === 'images' ||
        field.startsWith('images.') ||
        field === 'image_order' ||
        field.startsWith('image_order.') ||
        field === 'remove_media_ids' ||
        field.startsWith('remove_media_ids.')
    ) {
        return 'photos';
    }

    return field === 'has_stock_offer' || field.startsWith('stock_')
        ? 'stock'
        : 'details';
}

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
        label: 'Nova',
        description: 'Grade completa.',
    },
    {
        id: 'broken_grade',
        label: 'Furada',
        description: 'Grade incompleta.',
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

export function ProductForm({ product, categories }: ProductFormProps) {
    const isEditing = product !== undefined;
    const [processingImages, setProcessingImages] = useState(false);
    const [activeTab, setActiveTab] = useState<ProductFormTab>('details');
    const [coverPreview, setCoverPreview] =
        useState<ProductCoverPreview | null>(() => {
            const cover = product?.images[0];

            return cover
                ? {
                      url: cover.thumb_url ?? cover.url,
                      name: cover.name,
                      kind: 'existing',
                  }
                : null;
        });
    const radioGroupId = useId();
    const formRef = useRef<HTMLFormElement>(null);
    const submittingRef = useRef(false);
    const { isMobile, state: sidebarState } = useSidebar();

    const form = useForm<ProductFormData>({
        name: product?.name ?? '',
        model: product?.model ?? '',
        category_id: product?.category_id?.toString() ?? '',
        line: product?.line ?? '',
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

    const changeTab = (tab: ProductFormTab) => {
        setActiveTab(tab);
        window.requestAnimationFrame(() => {
            formRef.current?.scrollIntoView({ block: 'start' });
        });
    };

    const handleCoverChange = useCallback(
        (cover: ProductCoverPreview | null) => {
            setCoverPreview(cover);
        },
        [],
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
                    '#product-identity [aria-invalid="true"], [role="tabpanel"]:not([hidden]) [aria-invalid="true"]',
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
          : form.data.stock_offer_type === 'new_grade'
            ? 'Não aparece para as vendedoras: Grade Nova é somente para uso interno.'
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
        const invalidField = formRef.current?.querySelector<HTMLInputElement>(
            'input:invalid, textarea:invalid, select:invalid',
        );

        if (invalidField) {
            setActiveTab(
                invalidField.closest('[data-form-tab="stock"]')
                    ? 'stock'
                    : invalidField.closest('[data-form-tab="photos"]')
                      ? 'photos'
                      : 'details',
            );
            window.requestAnimationFrame(() => {
                invalidField.focus();
                invalidField.reportValidity();
            });

            return;
        }

        submittingRef.current = true;

        form.post(isEditing ? update.url(product.id) : store.url(), {
            forceFormData: form.data.images.length > 0,
            preserveState: true,
            preserveScroll: true,
            onError: (errors) => {
                const firstField = Object.keys(errors)[0];

                if (firstField) {
                    setActiveTab(tabForError(firstField));
                }
            },
            onFinish: () => {
                submittingRef.current = false;
            },
        });
    };

    return (
        <form
            ref={formRef}
            onSubmit={submit}
            noValidate
            className="grid min-w-0 scroll-mt-4 gap-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-28"
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

            <section
                id="product-identity"
                aria-labelledby="product-identity-title"
                className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center sm:gap-5 sm:p-5"
            >
                <div className="grid gap-1.5">
                    <p
                        id="product-identity-title"
                        className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
                    >
                        Capa
                    </p>
                    <button
                        id="product-cover"
                        type="button"
                        onClick={() => changeTab('photos')}
                        className="group relative aspect-[4/5] w-24 overflow-hidden rounded-xl bg-muted text-left transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:w-full"
                        aria-label={
                            coverPreview
                                ? 'Abrir fotos do produto'
                                : 'Adicionar capa nas fotos do produto'
                        }
                    >
                        {coverPreview?.url ? (
                            <img
                                id="product-cover-image"
                                src={coverPreview.url}
                                alt=""
                                className="size-full object-cover"
                                decoding="async"
                            />
                        ) : (
                            <span className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                                <ImagePlus className="size-5" />
                                <span className="text-[10px] font-semibold">
                                    Adicionar
                                </span>
                            </span>
                        )}
                        <span className="absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/10" />
                        {coverPreview && (
                            <span className="absolute inset-x-1 bottom-1 rounded-md bg-background/75 px-1 py-1 text-center text-[9px] font-bold tracking-[0.08em] text-foreground uppercase backdrop-blur-sm">
                                Capa
                            </span>
                        )}
                    </button>
                </div>

                <div className="grid min-w-0 gap-2">
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
            </section>

            <div
                role="tablist"
                aria-label="Seções do cadastro"
                className="sticky top-0 z-20 grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-muted/95 p-1.5 backdrop-blur"
            >
                {formTabs.map(({ id, label, icon: Icon }, index) => {
                    const errorCount = errorEntries.filter(
                        ([field]) => tabForError(field) === id,
                    ).length;

                    return (
                        <button
                            key={id}
                            id={`product-tab-${id}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === id}
                            aria-controls={`product-panel-${id}`}
                            tabIndex={activeTab === id ? 0 : -1}
                            onClick={() => changeTab(id)}
                            onKeyDown={(event) => {
                                if (
                                    ![
                                        'ArrowLeft',
                                        'ArrowRight',
                                        'Home',
                                        'End',
                                    ].includes(event.key)
                                ) {
                                    return;
                                }

                                event.preventDefault();
                                const nextIndex =
                                    event.key === 'Home'
                                        ? 0
                                        : event.key === 'End'
                                          ? formTabs.length - 1
                                          : (index +
                                                (event.key === 'ArrowLeft'
                                                    ? -1
                                                    : 1) +
                                                formTabs.length) %
                                            formTabs.length;
                                const nextTab = formTabs[nextIndex].id;
                                changeTab(nextTab);
                                document
                                    .getElementById(`product-tab-${nextTab}`)
                                    ?.focus();
                            }}
                            className={cn(
                                'flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                                activeTab === id
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                            )}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                            {label}
                            {errorCount > 0 && (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                                    {errorCount}
                                    <span className="sr-only">
                                        {' '}
                                        erros para revisar
                                    </span>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <section
                id="product-panel-details"
                role="tabpanel"
                aria-labelledby="product-tab-details"
                data-form-tab="details"
                hidden={activeTab !== 'details'}
                className={cn(
                    'min-w-0 gap-6',
                    activeTab === 'details' ? 'grid' : 'hidden',
                )}
            >
                <Card className="gap-0 rounded-2xl border-border p-0 shadow-none">
                    <label
                        htmlFor="is-active"
                        className="flex min-h-12 cursor-pointer items-center justify-between gap-4 p-4 select-none sm:px-6"
                    >
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Produto ativo
                            </p>
                            <p className="text-sm leading-5 text-muted-foreground">
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

                <div className="grid items-start gap-6">
                    {/* Informações complementares */}
                    <Card className="gap-0 rounded-2xl border-border p-0 shadow-none">
                        <CardHeader className="p-5 sm:p-6">
                            <h2 className="text-xl font-semibold tracking-tight">
                                Informações do produto
                            </h2>
                            <CardDescription className="text-sm leading-6">
                                Modelo, categoria, linha comercial e observações
                                da peça.
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

                            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
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
                                <div className="grid gap-2">
                                    <Label htmlFor="product-category">
                                        Categoria
                                    </Label>
                                    <Select
                                        value={form.data.category_id || 'none'}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'category_id',
                                                value === 'none' ? '' : value,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="product-category"
                                            className="h-11 w-full text-base sm:h-10 sm:text-sm"
                                            aria-invalid={
                                                error('category_id')
                                                    ? true
                                                    : undefined
                                            }
                                        >
                                            <SelectValue placeholder="Sem categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Sem categoria
                                            </SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={category.id.toString()}
                                                >
                                                    {category.name}
                                                    {!category.is_active
                                                        ? ' (inativa)'
                                                        : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={error('category_id')}
                                    />
                                </div>
                            </div>

                            <fieldset className="min-w-0">
                                <legend className="mb-2 text-sm font-medium">
                                    Linha comercial
                                </legend>
                                <RadioGroup
                                    value={form.data.line || 'none'}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'line',
                                            value === 'none'
                                                ? ''
                                                : (value as ProductLine),
                                        )
                                    }
                                    aria-label="Linha comercial"
                                    aria-invalid={
                                        error('line') ? true : undefined
                                    }
                                    className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3"
                                >
                                    {[
                                        ['none', 'Não informada'],
                                        ['slim', 'Slim'],
                                        ['plus', 'Plus'],
                                    ].map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={cn(
                                                'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                                                (form.data.line || 'none') ===
                                                    value
                                                    ? 'border-highlight bg-accent/50'
                                                    : 'border-border hover:bg-muted/30',
                                            )}
                                        >
                                            <RadioGroupItem value={value} />
                                            {label}
                                        </label>
                                    ))}
                                </RadioGroup>
                                <InputError
                                    message={error('line')}
                                    className="mt-2"
                                />
                            </fieldset>

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
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={
                                        error('notes') ? true : undefined
                                    }
                                    placeholder="Cor, lavagem ou algum detalhe importante..."
                                    rows={3}
                                    className="text-base sm:text-sm"
                                />
                                <InputError message={error('notes')} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section
                id="product-panel-photos"
                role="tabpanel"
                aria-labelledby="product-tab-photos"
                data-form-tab="photos"
                hidden={activeTab !== 'photos'}
                className={cn(
                    'min-w-0 gap-6',
                    activeTab === 'photos' ? 'grid' : 'hidden',
                )}
            >
                <Card className="gap-0 rounded-2xl border-border p-0 shadow-none">
                    <CardHeader className="p-5 sm:p-6">
                        <h2 className="text-xl font-semibold tracking-tight">
                            Galeria de fotos
                        </h2>
                        <CardDescription className="text-sm leading-6">
                            Adicione até 5 fotos, escolha a capa e ajuste a
                            ordem de exibição.
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
                            onCoverChange={handleCoverChange}
                            onProcessingChange={setProcessingImages}
                        />
                    </CardContent>
                </Card>
            </section>

            <section
                id="product-panel-stock"
                role="tabpanel"
                aria-labelledby="product-tab-stock"
                data-form-tab="stock"
                hidden={activeTab !== 'stock'}
                className={cn(
                    'min-w-0 gap-6',
                    activeTab === 'stock' ? 'grid' : 'hidden',
                )}
            >
                {/* 3. Disponibilidade do lote */}
                <Card className="gap-0 rounded-2xl border-border p-0 shadow-none">
                    <CardHeader className="p-5 sm:p-6">
                        <div className="grid gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-highlight">
                                    <Layers className="size-4" />
                                </span>
                                <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                                    Disponibilidade em estoque
                                </p>
                            </div>
                            <h2 className="text-xl font-semibold tracking-tight">
                                Estoque organizado por sacos
                            </h2>
                            <CardDescription className="text-sm leading-6">
                                Cada saco tem sua própria grade e total. O total
                                da oferta é a soma dos sacos e é recalculado no
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
                                    Oferta de estoque ativa
                                </p>
                                <p className="text-sm leading-5 text-muted-foreground">
                                    {form.data.has_stock_offer
                                        ? 'Este lote está disponível para distribuição. A exibição também depende do produto, do tipo da grade e do total em estoque.'
                                        : 'Este lote está pausado, mas os dados dos sacos ficam preservados para uma próxima ativação.'}
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
                                        ? 'Pausar oferta de estoque'
                                        : 'Ativar oferta de estoque'
                                }
                            />
                        </label>
                        <InputError message={error('has_stock_offer')} />

                        <fieldset className="grid gap-3">
                            <legend
                                id={radioGroupId}
                                className="text-sm font-semibold text-foreground"
                            >
                                Tipo de Grade
                            </legend>
                            <p className="text-sm leading-5 text-muted-foreground">
                                Todos os tipos usam pelo menos um saco; a
                                diferença está na classificação da oferta.
                            </p>
                            <RadioGroup
                                value={form.data.stock_offer_type}
                                onValueChange={selectStockOfferType}
                                className="grid grid-cols-3 gap-2"
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
                                                'flex min-h-16 min-w-0 cursor-pointer flex-col items-stretch gap-1.5 rounded-xl border px-2.5 py-2.5 text-sm font-medium transition-colors select-none',
                                                form.data.stock_offer_type ===
                                                    offerType.id
                                                    ? 'border-highlight bg-accent/50'
                                                    : 'border-border hover:bg-muted/30',
                                            )}
                                        >
                                            <RadioGroupItem
                                                id={optionId}
                                                value={offerType.id}
                                                className="shrink-0 self-center"
                                            />
                                            <span className="grid w-full min-w-0 gap-0.5 text-left">
                                                <span className="text-xs leading-4 break-words sm:text-sm">
                                                    {offerType.label}
                                                </span>
                                                <span className="text-xs leading-4 font-normal break-words text-muted-foreground">
                                                    {offerType.description}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </RadioGroup>
                            <InputError message={error('stock_offer_type')} />
                        </fieldset>
                    </CardContent>
                </Card>

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
                        <p className="text-sm leading-5 text-muted-foreground">
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
            </section>

            {/* 5. Ações inferiores (Mobile-First) */}
            <div
                className={cn(
                    'fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] lg:px-8',
                    !isMobile &&
                        (sidebarState === 'collapsed'
                            ? 'md:left-[calc(var(--sidebar-width-icon)+1rem)]'
                            : 'md:left-(--sidebar-width)'),
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
