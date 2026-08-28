import { Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { index as productsIndex } from '@/routes/products';
import type { Product } from '@/types';

type ProductFormData = {
    name: string;
    model: string;
    notes: string;
    variants: Array<{ size: string }>;
    image: File | null;
    remove_image: boolean;
    _method?: 'PUT';
};

type ProductFormProps = {
    product?: Product;
};

type ProductErrorField = keyof ProductFormData | `variants.${number}.size`;

type SizePreset = {
    id: string;
    label: string;
    sizes: string[];
};

const sizePresets: SizePreset[] = [
    {
        id: 'womens-numeric',
        label: 'Numérica feminina',
        sizes: ['34', '36', '38', '40', '42', '44', '46'],
    },
    {
        id: 'mens-numeric',
        label: 'Numérica masculina',
        sizes: ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54'],
    },
    {
        id: 'letters',
        label: 'Letras',
        sizes: ['PP', 'P', 'M', 'G', 'GG'],
    },
    {
        id: 'single',
        label: 'Tamanho único',
        sizes: ['U'],
    },
];

const maximumVariants = 50;

export function ProductForm({ product }: ProductFormProps) {
    const isEditing = product !== undefined;
    const [presetToApply, setPresetToApply] = useState<SizePreset | null>(null);
    const [selectedPreset, setSelectedPreset] = useState('');
    const form = useForm<ProductFormData>({
        name: product?.name ?? '',
        model: product?.model ?? '',
        notes: product?.notes ?? '',
        variants: product?.variants.map(({ size }) => ({ size })) ?? [],
        image: null,
        remove_image: false,
        ...(isEditing ? { _method: 'PUT' as const } : {}),
    });

    const error = (field: ProductErrorField): string | undefined =>
        form.errors[field] as string | undefined;

    const addVariant = () => {
        form.setData('variants', [...form.data.variants, { size: '' }]);
    };

    const updateVariant = (index: number, size: string) => {
        form.setData(
            'variants',
            form.data.variants.map((variant, variantIndex) =>
                variantIndex === index ? { size } : variant,
            ),
        );
    };

    const removeVariant = (index: number) => {
        form.setData(
            'variants',
            form.data.variants.filter(
                (_, variantIndex) => variantIndex !== index,
            ),
        );
    };

    const applyPreset = (preset: SizePreset) => {
        form.setData(
            'variants',
            preset.sizes.map((size) => ({ size })),
        );
    };

    const handlePresetChange = (presetId: string) => {
        const preset = sizePresets.find(({ id }) => id === presetId);

        setSelectedPreset('');

        if (!preset) {
            return;
        }

        if (form.data.variants.length > 0) {
            setPresetToApply(preset);

            return;
        }

        applyPreset(preset);
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
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader>
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Identidade da peça
                        </p>
                        <CardTitle className="text-2xl tracking-tight">
                            Como a equipe vai encontrar este produto?
                        </CardTitle>
                        <CardDescription>
                            O código interno é gerado automaticamente ao salvar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5">
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
                            <Label htmlFor="product-name">
                                Nome do produto
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
                                autoFocus
                                required
                            />
                            <InputError message={error('name')} />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="product-model">
                                    Modelo{' '}
                                    <span className="text-muted-foreground">
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
                                    placeholder="Ex.: 2451"
                                />
                                <InputError message={error('model')} />
                            </div>

                            <div className="flex flex-col justify-end rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">
                                    Modelo não é obrigatório
                                </span>
                                <span>
                                    O código CJ identifica a peça mesmo sem
                                    modelo.
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="product-notes">
                                Observação{' '}
                                <span className="text-muted-foreground">
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
                                rows={5}
                            />
                            <InputError message={error('notes')} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader>
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Referência visual
                        </p>
                        <CardTitle className="text-2xl tracking-tight">
                            Foto do produto
                        </CardTitle>
                        <CardDescription>
                            Use um arquivo ou abra a câmera no celular. Você
                            pode cortar, girar e espelhar antes de salvar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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

            <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                <CardHeader className="flex-row items-start justify-between gap-4">
                    <div className="grid gap-1.5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-highlight uppercase">
                            Grade disponível
                        </p>
                        <CardTitle className="text-2xl tracking-tight">
                            Tamanhos
                        </CardTitle>
                        <CardDescription>
                            Adicione a grade na ordem em que deve aparecer no
                            catálogo.
                        </CardDescription>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={addVariant}
                        disabled={form.data.variants.length >= maximumVariants}
                    >
                        <Plus />
                        Adicionar
                    </Button>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <div className="grid gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="grid gap-1.5">
                            <Label htmlFor="size-preset">
                                Preencher com preset
                            </Label>
                            <p className="text-xs leading-5 text-muted-foreground">
                                Atalho para grades comuns. Para uma grade
                                personalizada, use Adicionar.
                            </p>
                        </div>
                        <Select
                            value={selectedPreset}
                            onValueChange={handlePresetChange}
                        >
                            <SelectTrigger
                                id="size-preset"
                                className="w-full sm:w-56"
                            >
                                <SelectValue placeholder="Escolher preset" />
                            </SelectTrigger>
                            <SelectContent>
                                {sizePresets.map((preset) => (
                                    <SelectItem
                                        key={preset.id}
                                        value={preset.id}
                                    >
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {form.data.variants.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
                            Nenhum tamanho adicionado. Você pode cadastrar a
                            peça sem uma grade e completar depois.
                        </div>
                    ) : (
                        form.data.variants.map((variant, index) => (
                            <div
                                key={`${index}-${variant.size}`}
                                className="flex items-start gap-3"
                            >
                                <div className="grid flex-1 gap-2">
                                    <Label
                                        htmlFor={`product-variant-${index}`}
                                        className="sr-only"
                                    >
                                        Tamanho {index + 1}
                                    </Label>
                                    <Input
                                        id={`product-variant-${index}`}
                                        value={variant.size}
                                        onChange={(event) =>
                                            updateVariant(
                                                index,
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ex.: 36, M ou U"
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
                                    size="icon"
                                    onClick={() => removeVariant(index)}
                                    aria-label={`Remover tamanho ${index + 1}`}
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))
                    )}
                    <InputError message={error('variants')} />
                </CardContent>
            </Card>

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                <p className="text-sm text-muted-foreground">
                    Campos marcados como opcionais podem ser preenchidos mais
                    tarde.
                </p>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button type="button" variant="ghost" asChild>
                        <Link href={productsIndex()}>Cancelar</Link>
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="min-w-44"
                    >
                        {form.processing
                            ? 'Salvando...'
                            : isEditing
                              ? 'Salvar alterações'
                              : 'Cadastrar produto'}
                    </Button>
                </div>
            </div>

            <Dialog
                open={presetToApply !== null}
                onOpenChange={(open) => !open && setPresetToApply(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Substituir grade atual?</DialogTitle>
                        <DialogDescription>
                            {presetToApply
                                ? `Aplicar “${presetToApply.label}” vai substituir os tamanhos já preenchidos neste formulário. O produto ainda não foi salvo.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancelar</Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={() => {
                                if (presetToApply) {
                                    applyPreset(presetToApply);
                                }

                                setPresetToApply(null);
                            }}
                        >
                            Aplicar preset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
    );
}
