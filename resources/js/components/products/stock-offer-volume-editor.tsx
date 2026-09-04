import {
    ArrowDown,
    ArrowUp,
    Copy,
    Eye,
    EyeOff,
    Layers,
    ListCheck,
    ListX,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type StockOfferVolumeItemFormItem = {
    id?: number;
    size: string;
    sort_order?: number;
    is_active: boolean;
    quantity: number | string | null;
};

export type StockOfferVolumeFormItem = {
    id?: number;
    sort_order?: number;
    total_quantity: number | string | null;
    items: StockOfferVolumeItemFormItem[];
};

type SizePresetId = 'numeric-female' | 'letters' | 'custom';

type SizePreset = {
    id: SizePresetId;
    label: string;
    description: string;
    sizes: string[];
};

const sizePresets: SizePreset[] = [
    {
        id: 'numeric-female',
        label: 'Numérica feminina',
        description: '34 a 46, com seleção dos tamanhos presentes.',
        sizes: ['34', '36', '38', '40', '42', '44', '46'],
    },
    {
        id: 'letters',
        label: 'Por letras',
        description: 'PP, P, M, G e GG, com seleção dos tamanhos presentes.',
        sizes: ['PP', 'P', 'M', 'G', 'GG'],
    },
    {
        id: 'custom',
        label: 'Personalizada',
        description: 'Defina os nomes dos tamanhos manualmente.',
        sizes: [],
    },
];

type StockOfferVolumeEditorProps = {
    volumes: StockOfferVolumeFormItem[];
    errors: Record<string, string | undefined>;
    onChange: (volumes: StockOfferVolumeFormItem[]) => void;
};

function emptyItems(): StockOfferVolumeItemFormItem[] {
    return sizePresets[0].sizes.map((size) => ({
        size,
        is_active: false,
        quantity: null,
    }));
}

function emptyVolume(): StockOfferVolumeFormItem {
    return {
        total_quantity: null,
        items: emptyItems(),
    };
}

function hasItemQuantity(item: StockOfferVolumeItemFormItem): boolean {
    return (
        item.is_active &&
        item.quantity !== null &&
        item.quantity !== '' &&
        !Number.isNaN(Number(item.quantity))
    );
}

function hasKnownItemQuantity(volume: StockOfferVolumeFormItem): boolean {
    return volume.items.some(hasItemQuantity);
}

function volumeTotal(volume: StockOfferVolumeFormItem): number {
    if (hasKnownItemQuantity(volume)) {
        return volume.items.reduce(
            (total, item) =>
                hasItemQuantity(item) ? total + Number(item.quantity) : total,
            0,
        );
    }

    return Number(volume.total_quantity) || 0;
}

function detectPreset(items: StockOfferVolumeItemFormItem[]): SizePresetId {
    const sizes = items.map((item) => item.size.trim().toUpperCase());
    const matchingPreset = sizePresets.find(
        (preset) =>
            preset.id !== 'custom' &&
            preset.sizes.length === sizes.length &&
            preset.sizes.every((size, index) => size === sizes[index]),
    );

    return matchingPreset?.id ?? 'custom';
}

function detectSharedPreset(volumes: StockOfferVolumeFormItem[]): SizePresetId {
    const firstPreset = detectPreset(volumes[0]?.items ?? []);

    return volumes.every((volume) => detectPreset(volume.items) === firstPreset)
        ? firstPreset
        : 'custom';
}

function sharedSizes(volumes: StockOfferVolumeFormItem[]): string[] {
    const seen = new Set<string>();

    return volumes
        .flatMap((volume) => volume.items.map((item) => item.size.trim()))
        .filter((size) => {
            const normalizedSize = size.toUpperCase();

            if (seen.has(normalizedSize)) {
                return false;
            }

            seen.add(normalizedSize);

            return true;
        });
}

function synchronizeVolumesToSizes(
    volumes: StockOfferVolumeFormItem[],
    sizes: string[],
): StockOfferVolumeFormItem[] {
    return volumes.map((volume) => {
        const currentItems = new Map(
            volume.items.map((item) => [item.size.trim().toUpperCase(), item]),
        );

        return {
            ...volume,
            items: sizes.map((size, index) => {
                const currentItem = currentItems.get(size.trim().toUpperCase());

                return {
                    ...currentItem,
                    size,
                    sort_order: currentItem?.sort_order ?? index,
                    is_active: currentItem?.is_active ?? false,
                    quantity: currentItem?.quantity ?? null,
                };
            }),
        };
    });
}

function integerValue(rawValue: string): number | null {
    return rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10) || 0);
}

export function StockOfferVolumeEditor({
    volumes,
    errors,
    onChange,
}: StockOfferVolumeEditorProps) {
    const [selectedPreset, setSelectedPreset] = useState<SizePresetId>(() =>
        detectSharedPreset(volumes),
    );
    const [isCustomEditorOpen, setIsCustomEditorOpen] = useState(
        () => detectSharedPreset(volumes) === 'custom',
    );

    const error = (field: string): string | undefined => errors[field];

    const updateVolume = (
        volumeIndex: number,
        updater: (volume: StockOfferVolumeFormItem) => StockOfferVolumeFormItem,
    ) => {
        onChange(
            volumes.map((volume, index) =>
                index === volumeIndex ? updater(volume) : volume,
            ),
        );
    };

    const updateItem = (
        volumeIndex: number,
        itemIndex: number,
        updater: (
            item: StockOfferVolumeItemFormItem,
        ) => StockOfferVolumeItemFormItem,
    ) => {
        updateVolume(volumeIndex, (volume) => ({
            ...volume,
            items: volume.items.map((item, index) =>
                index === itemIndex ? updater(item) : item,
            ),
        }));
    };

    const applyPreset = (presetId: string) => {
        const preset = sizePresets.find(
            (candidate) => candidate.id === presetId,
        );

        if (!preset) {
            return;
        }

        setSelectedPreset(preset.id);

        if (preset.id === 'custom') {
            setIsCustomEditorOpen(true);
            onChange(synchronizeVolumesToSizes(volumes, sharedSizes(volumes)));

            return;
        }

        setIsCustomEditorOpen(false);
        onChange(synchronizeVolumesToSizes(volumes, preset.sizes));
    };

    const addSize = () => {
        setSelectedPreset('custom');
        setIsCustomEditorOpen(true);
        onChange(
            synchronizeVolumesToSizes(volumes, [...sharedSizes(volumes), '']),
        );
    };

    const updateSharedSize = (itemIndex: number, size: string) => {
        const sizes = sharedSizes(volumes);

        sizes[itemIndex] = size;
        onChange(synchronizeVolumesToSizes(volumes, sizes));
    };

    const removeSize = (itemIndex: number) => {
        const sizes = sharedSizes(volumes);
        const sizeToRemove = sizes[itemIndex];
        const hasData = volumes.some((volume) => {
            const item = volume.items.find(
                (volumeItem) =>
                    volumeItem.size.trim().toUpperCase() ===
                    sizeToRemove?.trim().toUpperCase(),
            );

            return (
                item?.is_active ||
                (item?.quantity !== null && item?.quantity !== '')
            );
        });

        if (
            hasData &&
            !window.confirm(
                `Remover o tamanho ${sizeToRemove || 'informado'} de todos os sacos?`,
            )
        ) {
            return;
        }

        onChange(
            synchronizeVolumesToSizes(
                volumes,
                sizes.filter((_, index) => index !== itemIndex),
            ),
        );
    };

    const addVolume = () => {
        const template = volumes[volumes.length - 1];
        const nextVolume = template
            ? {
                  total_quantity: null,
                  items: template.items.map((item) => ({
                      size: item.size,
                      is_active: false,
                      quantity: null,
                  })),
              }
            : emptyVolume();

        onChange([...volumes, nextVolume]);
    };

    const duplicateVolume = (volumeIndex: number) => {
        const source = volumes[volumeIndex];

        if (!source) {
            return;
        }

        onChange([
            ...volumes,
            {
                total_quantity: source.total_quantity,
                items: source.items.map((item) => ({
                    size: item.size,
                    is_active: item.is_active,
                    quantity: item.quantity,
                })),
            },
        ]);
    };

    const removeVolume = (volumeIndex: number) => {
        if (volumes.length <= 1 || !volumes[volumeIndex]) {
            return;
        }

        if (!window.confirm(`Remover o Saco ${volumeIndex + 1} e sua grade?`)) {
            return;
        }

        onChange(volumes.filter((_, index) => index !== volumeIndex));
    };

    const moveVolume = (volumeIndex: number, direction: -1 | 1) => {
        const targetIndex = volumeIndex + direction;

        if (targetIndex < 0 || targetIndex >= volumes.length) {
            return;
        }

        const reorderedVolumes = [...volumes];
        const [movedVolume] = reorderedVolumes.splice(volumeIndex, 1);
        reorderedVolumes.splice(targetIndex, 0, movedVolume);
        onChange(reorderedVolumes);
    };

    const updateItemActive = (
        volumeIndex: number,
        itemIndex: number,
        isActive: boolean,
    ) => {
        const item = volumes[volumeIndex]?.items[itemIndex];

        if (
            item &&
            !isActive &&
            item.quantity !== null &&
            item.quantity !== '' &&
            !window.confirm(
                `Desativar o tamanho ${item.size}? A quantidade será apagada.`,
            )
        ) {
            return;
        }

        updateItem(volumeIndex, itemIndex, (currentItem) => ({
            ...currentItem,
            is_active: isActive,
            quantity: isActive ? currentItem.quantity : null,
        }));
    };

    const setAllItemsActive = (volumeIndex: number, isActive: boolean) => {
        const volume = volumes[volumeIndex];

        if (
            volume &&
            !isActive &&
            volume.items.some(
                (item) => item.quantity !== null && item.quantity !== '',
            ) &&
            !window.confirm(
                'Desmarcar os tamanhos apagará as quantidades informadas. Deseja continuar?',
            )
        ) {
            return;
        }

        updateVolume(volumeIndex, (currentVolume) => ({
            ...currentVolume,
            items: currentVolume.items.map((item) => ({
                ...item,
                is_active: isActive,
                quantity: isActive ? item.quantity : null,
            })),
        }));
    };

    const totalQuantity = volumes.reduce(
        (total, volume) => total + volumeTotal(volume),
        0,
    );
    const customItems = sharedSizes(volumes).map((size) => {
        const item = volumes[0]?.items.find(
            (volumeItem) =>
                volumeItem.size.trim().toUpperCase() ===
                size.trim().toUpperCase(),
        );

        return (
            item ?? {
                size,
                is_active: false,
                quantity: null,
            }
        );
    });
    const customSizeError = (itemIndex: number): string | undefined =>
        Object.entries(errors).find(([field]) =>
            field.endsWith(`.items.${itemIndex}.size`),
        )?.[1];

    return (
        <div className="grid gap-5">
            <Alert className="border-primary/25 bg-primary/5 [&>svg]:text-primary">
                <Layers />
                <AlertTitle>O estoque é organizado por saco</AlertTitle>
                <AlertDescription>
                    Cada saco tem sua própria grade. O total geral é a soma dos
                    totais dos sacos e é recalculado no servidor ao salvar.
                </AlertDescription>
            </Alert>

            <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold text-foreground">
                    Modelo de grade
                </legend>
                <p className="text-xs text-muted-foreground">
                    Escolha o modelo dos tamanhos. A presença e a quantidade
                    continuam sendo definidas separadamente em cada saco.
                </p>
                <RadioGroup
                    value={selectedPreset}
                    onValueChange={applyPreset}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                    aria-label="Modelo de grade"
                >
                    {sizePresets.map((preset) => {
                        const optionId = `stock-size-preset-${preset.id}`;

                        return (
                            <label
                                key={preset.id}
                                htmlFor={optionId}
                                className={cn(
                                    'flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors select-none',
                                    selectedPreset === preset.id
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                        : 'border-border hover:bg-muted/30',
                                )}
                            >
                                <RadioGroupItem
                                    id={optionId}
                                    value={preset.id}
                                />
                                <span className="grid gap-0.5">
                                    <span>{preset.label}</span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {preset.description}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </RadioGroup>
            </fieldset>

            {selectedPreset === 'custom' && (
                <div className="grid gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Nomes dos tamanhos
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Esta lista é compartilhada por todos os sacos; a
                                presença e a quantidade continuam independentes.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                setIsCustomEditorOpen((current) => !current)
                            }
                        >
                            {isCustomEditorOpen ? <EyeOff /> : <Eye />}
                            {isCustomEditorOpen
                                ? 'Ocultar edição'
                                : 'Editar tamanhos'}
                        </Button>
                    </div>

                    {isCustomEditorOpen && (
                        <div className="grid gap-3">
                            {customItems.map((item, itemIndex) => (
                                <div
                                    key={item.id ?? `custom-size-${itemIndex}`}
                                    className="flex items-start gap-2"
                                >
                                    <div className="grid min-w-0 flex-1 gap-1">
                                        <Label
                                            htmlFor={`custom-size-${itemIndex}`}
                                            className="sr-only"
                                        >
                                            Tamanho {itemIndex + 1}
                                        </Label>
                                        <Input
                                            id={`custom-size-${itemIndex}`}
                                            value={item.size}
                                            onChange={(event) =>
                                                updateSharedSize(
                                                    itemIndex,
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Ex.: 3G ou 42"
                                            className="h-10 text-base sm:text-sm"
                                            aria-invalid={
                                                customSizeError(itemIndex)
                                                    ? true
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            message={customSizeError(itemIndex)}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSize(itemIndex)}
                                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Remover tamanho ${itemIndex + 1} de todos os sacos`}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addSize}
                                className="w-full sm:w-fit"
                            >
                                <Plus />
                                Adicionar tamanho
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                    <span className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                        Total da oferta
                    </span>
                    <span className="text-sm text-muted-foreground">
                        Soma dos {volumes.length}{' '}
                        {volumes.length === 1 ? 'saco' : 'sacos'} cadastrados.
                    </span>
                </div>
                <strong className="font-mono text-2xl text-foreground">
                    {totalQuantity} peças
                </strong>
            </div>

            <InputError message={error('stock_volumes')} />

            <div className="grid gap-5">
                {volumes.map((volume, volumeIndex) => {
                    const knownQuantities = hasKnownItemQuantity(volume);
                    const volumeError = error(
                        `stock_volumes.${volumeIndex}.total_quantity`,
                    );

                    return (
                        <section
                            key={volume.id ?? `new-volume-${volumeIndex}`}
                            aria-labelledby={`volume-title-${volumeIndex}`}
                            className={cn(
                                'grid gap-4',
                                volumeIndex > 0 &&
                                    'border-t border-border/70 pt-5',
                                volumeError &&
                                    'border-l-2 border-destructive/60 pl-4',
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="grid gap-1">
                                    <h3
                                        id={`volume-title-${volumeIndex}`}
                                        className="text-lg font-semibold"
                                    >
                                        Saco {volumeIndex + 1}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Escolha os tamanhos encontrados neste
                                        saco.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div className="grid gap-2 sm:max-w-xs">
                                    <Label
                                        htmlFor={`volume-total-${volumeIndex}`}
                                    >
                                        Total do saco{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id={`volume-total-${volumeIndex}`}
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        value={
                                            knownQuantities
                                                ? volumeTotal(volume)
                                                : (volume.total_quantity ?? '')
                                        }
                                        readOnly={knownQuantities}
                                        onChange={(event) =>
                                            updateVolume(
                                                volumeIndex,
                                                (currentVolume) => ({
                                                    ...currentVolume,
                                                    total_quantity:
                                                        integerValue(
                                                            event.target.value,
                                                        ),
                                                }),
                                            )
                                        }
                                        aria-readonly={
                                            knownQuantities ? true : undefined
                                        }
                                        aria-invalid={
                                            volumeError ? true : undefined
                                        }
                                        className={cn(
                                            'h-11 text-base sm:h-10 sm:text-sm',
                                            knownQuantities &&
                                                'cursor-not-allowed bg-muted/40 text-muted-foreground',
                                        )}
                                        placeholder="Ex.: 20"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {knownQuantities
                                            ? 'Calculado pela soma das quantidades conhecidas deste saco.'
                                            : 'Informe o total quando as quantidades por tamanho forem desconhecidas.'}
                                    </p>
                                    <InputError message={volumeError} />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            moveVolume(volumeIndex, -1)
                                        }
                                        disabled={volumeIndex === 0}
                                        aria-label={`Mover Saco ${volumeIndex + 1} para cima`}
                                    >
                                        <ArrowUp />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            moveVolume(volumeIndex, 1)
                                        }
                                        disabled={
                                            volumeIndex === volumes.length - 1
                                        }
                                        aria-label={`Mover Saco ${volumeIndex + 1} para baixo`}
                                    >
                                        <ArrowDown />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            duplicateVolume(volumeIndex)
                                        }
                                        aria-label={`Duplicar Saco ${volumeIndex + 1}`}
                                    >
                                        <Copy />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            removeVolume(volumeIndex)
                                        }
                                        disabled={volumes.length <= 1}
                                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Remover Saco ${volumeIndex + 1}`}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="grid gap-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        Tamanhos presentes
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Ative somente os tamanhos encontrados no
                                        saco.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    {volume.items.length > 1 && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setAllItemsActive(
                                                        volumeIndex,
                                                        true,
                                                    )
                                                }
                                            >
                                                <ListCheck />
                                                Marcar todos
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setAllItemsActive(
                                                        volumeIndex,
                                                        false,
                                                    )
                                                }
                                            >
                                                <ListX />
                                                Desmarcar todos
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-7">
                                {volume.items.map((item, itemIndex) => {
                                    const itemError = error(
                                        `stock_volumes.${volumeIndex}.items.${itemIndex}.quantity`,
                                    );
                                    const activeId = `volume-${volumeIndex}-active-${itemIndex}`;
                                    const quantityId = `volume-${volumeIndex}-quantity-${itemIndex}`;

                                    return (
                                        <div
                                            key={
                                                item.id ??
                                                `new-item-card-${volumeIndex}-${itemIndex}`
                                            }
                                            className={cn(
                                                'flex flex-row items-center justify-between gap-3 rounded-xl border p-3 transition-colors sm:flex-col sm:items-stretch',
                                                item.is_active
                                                    ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/15'
                                                    : 'border-border/70 bg-card',
                                                itemError &&
                                                    'border-destructive ring-1 ring-destructive/30',
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <label
                                                    htmlFor={activeId}
                                                    className="min-w-0 cursor-pointer font-mono text-base font-bold break-words text-foreground"
                                                >
                                                    {item.size || 'Sem tamanho'}
                                                </label>
                                                <Switch
                                                    id={activeId}
                                                    checked={item.is_active}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        updateItemActive(
                                                            volumeIndex,
                                                            itemIndex,
                                                            checked,
                                                        )
                                                    }
                                                    aria-label={`${item.is_active ? 'Desativar' : 'Ativar'} tamanho ${item.size || itemIndex + 1} do Saco ${volumeIndex + 1}`}
                                                />
                                            </div>
                                            <div className="grid gap-1 sm:w-full">
                                                <Label
                                                    htmlFor={quantityId}
                                                    className="sr-only"
                                                >
                                                    Quantidade do tamanho{' '}
                                                    {item.size || itemIndex + 1}
                                                </Label>
                                                <Input
                                                    id={quantityId}
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    disabled={!item.is_active}
                                                    value={
                                                        item.is_active
                                                            ? (item.quantity ??
                                                              '')
                                                            : ''
                                                    }
                                                    onChange={(event) =>
                                                        updateItem(
                                                            volumeIndex,
                                                            itemIndex,
                                                            (currentItem) => ({
                                                                ...currentItem,
                                                                quantity:
                                                                    integerValue(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                            }),
                                                        )
                                                    }
                                                    placeholder={
                                                        item.is_active
                                                            ? 'Qtd'
                                                            : '—'
                                                    }
                                                    aria-invalid={
                                                        itemError
                                                            ? true
                                                            : undefined
                                                    }
                                                    className="h-10 w-24 text-center font-mono text-sm sm:w-full"
                                                />
                                                <InputError
                                                    message={itemError}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={addVolume}
                className="w-full sm:w-fit"
            >
                <Plus />
                Adicionar saco
            </Button>
        </div>
    );
}
