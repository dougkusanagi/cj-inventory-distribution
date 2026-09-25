import {
    ArrowDown,
    ArrowUp,
    Copy,
    Ellipsis,
    Eye,
    EyeOff,
    ListCheck,
    ListX,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        description: 'Tamanhos de 34 a 46. Marque os que estão presentes.',
        sizes: ['34', '36', '38', '40', '42', '44', '46'],
    },
    {
        id: 'letters',
        label: 'Por letras',
        description: 'Tamanhos PP a GG. Marque os que estão presentes.',
        sizes: ['PP', 'P', 'M', 'G', 'GG'],
    },
    {
        id: 'custom',
        label: 'Personalizada',
        description: 'Digite os tamanhos que deseja usar.',
        sizes: [],
    },
];

type StockOfferVolumeEditorProps = {
    volumes: StockOfferVolumeFormItem[];
    errors: Record<string, string | undefined>;
    onChange: (volumes: StockOfferVolumeFormItem[]) => void;
    lockedVolumeIds?: number[];
};

type VolumeConfirmation = {
    title: string;
    description: string;
    onConfirm: () => void;
};

function emptyItems(sizes: string[]): StockOfferVolumeItemFormItem[] {
    return sizes.map((size) => ({
        size,
        is_active: false,
        quantity: null,
    }));
}

function emptyVolume(sizes: string[]): StockOfferVolumeFormItem {
    return {
        total_quantity: null,
        items: emptyItems(sizes),
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
    if (volumes.length === 0) {
        return 'numeric-female';
    }

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
    const digitsOnly = rawValue.replace(/[^0-9]/g, '');

    return digitsOnly === '' ? null : Number(digitsOnly);
}

function preventsNonNumericKey(key: string): boolean {
    return (
        !/[0-9]/.test(key) &&
        ![
            'Backspace',
            'Delete',
            'Tab',
            'ArrowLeft',
            'ArrowRight',
            'Home',
            'End',
        ].includes(key)
    );
}

export function StockOfferVolumeEditor({
    volumes,
    errors,
    onChange,
    lockedVolumeIds = [],
}: StockOfferVolumeEditorProps) {
    const [selectedPreset, setSelectedPreset] = useState<SizePresetId>(() =>
        detectSharedPreset(volumes),
    );
    const [isCustomEditorOpen, setIsCustomEditorOpen] = useState(
        () => detectSharedPreset(volumes) === 'custom',
    );
    const [confirmation, setConfirmation] = useState<VolumeConfirmation | null>(
        null,
    );
    const lockedVolumeIdSet = new Set(lockedVolumeIds);
    const isVolumeLocked = (
        volume: StockOfferVolumeFormItem | undefined,
    ): boolean => volume?.id !== undefined && lockedVolumeIdSet.has(volume.id);
    const hasLockedVolumes = volumes.some(isVolumeLocked);

    const error = (field: string): string | undefined => errors[field];

    const updateVolume = (
        volumeIndex: number,
        updater: (volume: StockOfferVolumeFormItem) => StockOfferVolumeFormItem,
    ) => {
        if (isVolumeLocked(volumes[volumeIndex])) {
            return;
        }

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
        if (hasLockedVolumes) {
            return;
        }

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
        if (hasLockedVolumes) {
            return;
        }

        setSelectedPreset('custom');
        setIsCustomEditorOpen(true);
        onChange(
            synchronizeVolumesToSizes(volumes, [...sharedSizes(volumes), '']),
        );
    };

    const updateSharedSize = (itemIndex: number, size: string) => {
        if (hasLockedVolumes) {
            return;
        }

        const sizes = sharedSizes(volumes);

        sizes[itemIndex] = size;
        onChange(synchronizeVolumesToSizes(volumes, sizes));
    };

    const removeSize = (itemIndex: number) => {
        if (hasLockedVolumes) {
            return;
        }

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

        const remove = () =>
            onChange(
                synchronizeVolumesToSizes(
                    volumes,
                    sizes.filter((_, index) => index !== itemIndex),
                ),
            );

        if (hasData) {
            setConfirmation({
                title: `Remover o tamanho ${sizeToRemove || 'informado'}?`,
                description:
                    'Esse tamanho será removido de todos os sacos e os dados preenchidos nele serão apagados.',
                onConfirm: remove,
            });

            return;
        }

        remove();
    };

    const addVolume = () => {
        const template = volumes[volumes.length - 1];
        const selectedSizes =
            sizePresets.find((preset) => preset.id === selectedPreset)?.sizes ??
            [];
        const nextVolume = template
            ? {
                  total_quantity: null,
                  items: template.items.map((item) => ({
                      size: item.size,
                      is_active: false,
                      quantity: null,
                  })),
              }
            : emptyVolume(selectedSizes);

        onChange([...volumes, nextVolume]);
    };

    const duplicateVolume = (volumeIndex: number) => {
        const source = volumes[volumeIndex];

        if (!source || isVolumeLocked(source)) {
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
        if (
            volumes.length <= 1 ||
            !volumes[volumeIndex] ||
            isVolumeLocked(volumes[volumeIndex])
        ) {
            return;
        }

        setConfirmation({
            title: `Remover o Saco ${volumeIndex + 1}?`,
            description:
                'O saco e todos os tamanhos informados nele serão removidos deste produto.',
            onConfirm: () =>
                onChange(volumes.filter((_, index) => index !== volumeIndex)),
        });
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

        if (isVolumeLocked(volumes[volumeIndex])) {
            return;
        }

        const update = () =>
            updateItem(volumeIndex, itemIndex, (currentItem) => ({
                ...currentItem,
                is_active: isActive,
                quantity: isActive ? currentItem.quantity : null,
            }));

        if (
            item &&
            !isActive &&
            item.quantity !== null &&
            item.quantity !== ''
        ) {
            setConfirmation({
                title: `Desativar o tamanho ${item.size}?`,
                description:
                    'A quantidade preenchida para esse tamanho será apagada.',
                onConfirm: update,
            });

            return;
        }

        update();
    };

    const setAllItemsActive = (volumeIndex: number, isActive: boolean) => {
        const volume = volumes[volumeIndex];

        if (!volume || isVolumeLocked(volume)) {
            return;
        }

        const update = () =>
            updateVolume(volumeIndex, (currentVolume) => ({
                ...currentVolume,
                items: currentVolume.items.map((item) => ({
                    ...item,
                    is_active: isActive,
                    quantity: isActive ? item.quantity : null,
                })),
            }));

        if (
            volume &&
            !isActive &&
            volume.items.some(
                (item) => item.quantity !== null && item.quantity !== '',
            )
        ) {
            setConfirmation({
                title: 'Desmarcar todos os tamanhos?',
                description:
                    'As quantidades informadas serão apagadas de todos os tamanhos deste saco.',
                onConfirm: update,
            });

            return;
        }

        update();
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
            <Card className="grid gap-5 rounded-2xl border-border/80 p-4 shadow-sm sm:p-5">
                <fieldset className="grid gap-3">
                    <legend className="text-sm font-semibold text-foreground">
                        Lista de tamanhos
                    </legend>
                    <p className="text-xs text-muted-foreground">
                        Escolha os tamanhos que serão usados nos sacos.
                    </p>
                    <RadioGroup
                        value={selectedPreset}
                        onValueChange={applyPreset}
                        disabled={hasLockedVolumes}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                        aria-label="Lista de tamanhos"
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
                                    Tamanhos personalizados
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    A lista será usada em todos os sacos. Você
                                    define os tamanhos presentes em cada um.
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
                                        key={
                                            item.id ??
                                            `custom-size-${itemIndex}`
                                        }
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
                                                readOnly={hasLockedVolumes}
                                                placeholder="Ex.: 3G ou 42"
                                                className="h-10 text-base sm:text-sm"
                                                aria-invalid={
                                                    customSizeError(itemIndex)
                                                        ? true
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                message={customSizeError(
                                                    itemIndex,
                                                )}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                removeSize(itemIndex)
                                            }
                                            disabled={hasLockedVolumes}
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
                                    disabled={hasLockedVolumes}
                                    className="w-full sm:w-fit"
                                >
                                    <Plus />
                                    Adicionar tamanho
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid gap-1">
                        <span className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                            Total do estoque
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {volumes.length === 1
                                ? '1 saco cadastrado'
                                : `${volumes.length} sacos cadastrados`}{' '}
                            · total de todos os sacos.
                        </span>
                    </div>
                    <strong className="font-mono text-2xl text-foreground">
                        {totalQuantity} peças
                    </strong>
                </div>

                <InputError message={error('stock_volumes')} />
            </Card>

            <div className="grid gap-5">
                {volumes.map((volume, volumeIndex) => {
                    const knownQuantities = hasKnownItemQuantity(volume);
                    const isLocked = isVolumeLocked(volume);
                    const volumeError = error(
                        `stock_volumes.${volumeIndex}.total_quantity`,
                    );

                    return (
                        <Card
                            key={volume.id ?? `new-volume-${volumeIndex}`}
                            aria-labelledby={`volume-title-${volumeIndex}`}
                            className={cn(
                                'grid gap-5 rounded-2xl border-border/80 p-4 shadow-sm sm:p-5',
                                volumeError && 'border-destructive/60',
                            )}
                        >
                            <div className="grid gap-1">
                                <div className="flex items-start justify-between gap-3">
                                    <h3
                                        id={`volume-title-${volumeIndex}`}
                                        className="text-lg font-semibold"
                                    >
                                        Saco {volumeIndex + 1}
                                    </h3>
                                    <div className="flex shrink-0 gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="!size-11 sm:!size-9"
                                            onClick={() =>
                                                moveVolume(volumeIndex, -1)
                                            }
                                            disabled={
                                                volumeIndex === 0 || isLocked
                                            }
                                            aria-label={`Mover Saco ${volumeIndex + 1} para cima`}
                                        >
                                            <ArrowUp />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="!size-11 sm:!size-9"
                                            onClick={() =>
                                                moveVolume(volumeIndex, 1)
                                            }
                                            disabled={
                                                volumeIndex ===
                                                    volumes.length - 1 ||
                                                isLocked
                                            }
                                            aria-label={`Mover Saco ${volumeIndex + 1} para baixo`}
                                        >
                                            <ArrowDown />
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-9"
                                                    disabled={isLocked}
                                                    aria-label={`Mais ações para o Saco ${volumeIndex + 1}`}
                                                >
                                                    <Ellipsis />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    id={`duplicate-volume-${volumeIndex}`}
                                                    onSelect={() =>
                                                        duplicateVolume(
                                                            volumeIndex,
                                                        )
                                                    }
                                                >
                                                    <Copy />
                                                    Duplicar saco
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    id={`remove-volume-${volumeIndex}`}
                                                    variant="destructive"
                                                    disabled={
                                                        volumes.length <= 1
                                                    }
                                                    onSelect={() =>
                                                        removeVolume(
                                                            volumeIndex,
                                                        )
                                                    }
                                                >
                                                    <Trash2 />
                                                    Remover saco
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {isLocked
                                        ? 'Este saco já foi movimentado. Para alterar suas quantidades, use o histórico de movimentações.'
                                        : 'Marque os tamanhos presentes neste saco.'}
                                </p>
                            </div>

                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div className="grid min-w-0 gap-2 sm:max-w-xs sm:flex-1">
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
                                        pattern="[0-9]*"
                                        value={
                                            knownQuantities
                                                ? volumeTotal(volume)
                                                : (volume.total_quantity ?? '')
                                        }
                                        readOnly={knownQuantities || isLocked}
                                        onKeyDown={(event) => {
                                            if (
                                                preventsNonNumericKey(
                                                    event.key,
                                                ) &&
                                                !event.ctrlKey &&
                                                !event.metaKey
                                            ) {
                                                event.preventDefault();
                                            }
                                        }}
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
                                            knownQuantities || isLocked
                                                ? true
                                                : undefined
                                        }
                                        aria-invalid={
                                            volumeError ? true : undefined
                                        }
                                        className={cn(
                                            'h-11 text-base sm:h-10 sm:text-sm',
                                            knownQuantities &&
                                                'cursor-not-allowed bg-muted/40 text-muted-foreground',
                                            isLocked &&
                                                'cursor-not-allowed bg-muted/40 text-muted-foreground',
                                        )}
                                        placeholder="Ex.: 20"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {knownQuantities
                                            ? 'Calculado pelas quantidades informadas acima.'
                                            : 'Informe o total se não souber a quantidade de cada tamanho.'}
                                    </p>
                                    <InputError message={volumeError} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="grid gap-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        Tamanhos presentes
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Marque somente os tamanhos presentes
                                        neste saco.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-row">
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
                                                disabled={isLocked}
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
                                                disabled={isLocked}
                                            >
                                                <ListX />
                                                Desmarcar todos
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid min-w-0 grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
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
                                                'grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(5.5rem,7rem)] items-center gap-3 rounded-xl border p-3 transition-colors min-[420px]:flex min-[420px]:flex-col min-[420px]:items-stretch',
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
                                                    disabled={isLocked}
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
                                            <div className="grid min-w-0 gap-1 min-[420px]:w-full">
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
                                                    disabled={
                                                        !item.is_active ||
                                                        isLocked
                                                    }
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
                                                    className="h-11 w-full min-w-0 text-center font-mono text-base min-[420px]:h-10 min-[420px]:text-sm"
                                                />
                                                <InputError
                                                    message={itemError}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
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
            <ConfirmationDialog
                open={confirmation !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmation(null);
                    }
                }}
                title={confirmation?.title ?? ''}
                description={confirmation?.description ?? ''}
                confirmLabel="Confirmar"
                destructive
                onConfirm={() => {
                    const action = confirmation?.onConfirm;

                    setConfirmation(null);
                    action?.();
                }}
            />
        </div>
    );
}
