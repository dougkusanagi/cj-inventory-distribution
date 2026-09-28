import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PaperBag } from '@/components/icons/paper-bag';
import {
    volumeTotal,
    withDefaultSizeGrid,
} from '@/components/products/stock-offer-volume-editor';
import type { StockOfferVolumeFormItem } from '@/components/products/stock-offer-volume-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const maxBagCount = 50;

type StockOfferTotalsFieldsProps = {
    volumes: StockOfferVolumeFormItem[];
    errors: Record<string, string | undefined>;
    onChange: (volumes: StockOfferVolumeFormItem[]) => void;
    idPrefix?: string;
};

function parseCount(rawValue: string): number | null {
    const digitsOnly = rawValue.replace(/[^0-9]/g, '');

    return digitsOnly === '' ? null : Number(digitsOnly);
}

function volumesTotal(volumes: StockOfferVolumeFormItem[]): number | null {
    if (
        volumes.every(
            (volume) =>
                volume.total_quantity === null &&
                volume.items.every((item) => item.quantity === null),
        )
    ) {
        return null;
    }

    return volumes.reduce((total, volume) => total + volumeTotal(volume), 0);
}

/**
 * Splits the pieces across the sacks as evenly as possible, so each sack keeps
 * its own total without asking the user to fill one sack at a time.
 */
export function distributeStockVolumes(
    bagCount: number | null,
    pieceCount: number | null,
): StockOfferVolumeFormItem[] {
    if (!bagCount) {
        return [];
    }

    const basePieces =
        pieceCount === null ? null : Math.floor(pieceCount / bagCount);
    const remainder = pieceCount === null ? 0 : pieceCount % bagCount;

    return Array.from({ length: bagCount }, (_, index) => ({
        total_quantity:
            basePieces === null
                ? null
                : basePieces + (index < remainder ? 1 : 0),
        items: [],
    }));
}

/**
 * Keeps the informed sacks when the offer type changes: totals-only offers get
 * the pieces redistributed and sized offers get the default size grid.
 */
export function volumesForOfferType(
    volumes: StockOfferVolumeFormItem[],
    tracksSizes: boolean,
): StockOfferVolumeFormItem[] {
    if (tracksSizes) {
        return withDefaultSizeGrid(volumes);
    }

    return distributeStockVolumes(
        volumes.length > 0 ? volumes.length : null,
        volumesTotal(volumes),
    );
}

export function StockOfferTotalsFields({
    volumes,
    errors,
    onChange,
    idPrefix = 'stock-totals',
}: StockOfferTotalsFieldsProps) {
    const [bagCount, setBagCount] = useState<number | null>(() =>
        volumes.length > 0 ? volumes.length : null,
    );
    const [pieceCount, setPieceCount] = useState<number | null>(() =>
        volumesTotal(volumes),
    );
    const bagCountId = `${idPrefix}-bag-count`;
    const pieceCountId = `${idPrefix}-piece-count`;

    const update = (
        nextBagCount: number | null,
        nextPieceCount: number | null,
    ) => {
        const boundedBagCount =
            nextBagCount === null ? null : Math.min(nextBagCount, maxBagCount);

        setBagCount(boundedBagCount);
        setPieceCount(nextPieceCount);
        onChange(distributeStockVolumes(boundedBagCount, nextPieceCount));
    };

    const serverError =
        errors.stock_volumes ??
        Object.entries(errors).find(([field]) =>
            field.startsWith('stock_volumes.'),
        )?.[1];
    const hasTooFewPieces =
        bagCount !== null && pieceCount !== null && pieceCount < bagCount;
    const bagError = serverError && bagCount === null ? serverError : undefined;
    const pieceError = hasTooFewPieces
        ? 'Cada saco precisa ter pelo menos uma peça.'
        : serverError && bagCount !== null
          ? serverError
          : undefined;
    const averagePieces =
        bagCount && pieceCount ? Math.round(pieceCount / bagCount) : null;

    return (
        <div className="grid gap-4" data-testid={`${idPrefix}-fields`}>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
                <div className="grid content-start gap-2">
                    <Label htmlFor={bagCountId}>
                        Total de sacos{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-12 shrink-0"
                            onClick={() =>
                                update(
                                    bagCount && bagCount > 1
                                        ? bagCount - 1
                                        : null,
                                    pieceCount,
                                )
                            }
                            disabled={!bagCount}
                            aria-label="Remover um saco"
                        >
                            <Minus />
                        </Button>
                        <Input
                            id={bagCountId}
                            type="number"
                            min="1"
                            max={maxBagCount}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={bagCount ?? ''}
                            onChange={(event) =>
                                update(
                                    parseCount(event.target.value),
                                    pieceCount,
                                )
                            }
                            aria-invalid={bagError ? true : undefined}
                            placeholder="0"
                            className="h-12 min-w-0 [appearance:textfield] text-center font-mono text-lg font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-12 shrink-0"
                            onClick={() =>
                                update((bagCount ?? 0) + 1, pieceCount)
                            }
                            disabled={(bagCount ?? 0) >= maxBagCount}
                            aria-label="Adicionar um saco"
                        >
                            <Plus />
                        </Button>
                    </div>
                    <InputError message={bagError} />
                </div>

                <div className="grid content-start gap-2">
                    <Label htmlFor={pieceCountId}>
                        Total de peças{' '}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id={pieceCountId}
                        type="number"
                        min="1"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pieceCount ?? ''}
                        onChange={(event) =>
                            update(bagCount, parseCount(event.target.value))
                        }
                        aria-invalid={pieceError ? true : undefined}
                        placeholder="0"
                        className="h-12 [appearance:textfield] text-center font-mono text-lg font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <InputError message={pieceError} />
                </div>
            </div>

            <div
                className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
                    bagCount && pieceCount && !hasTooFewPieces
                        ? 'border-primary/25 bg-primary/5'
                        : 'border-dashed border-border text-muted-foreground',
                )}
                aria-live="polite"
            >
                <PaperBag className="size-5 shrink-0 text-highlight" />
                {bagCount && pieceCount && !hasTooFewPieces ? (
                    <p>
                        <strong className="font-semibold text-foreground tabular-nums">
                            {pieceCount} {pieceCount === 1 ? 'peça' : 'peças'}
                        </strong>{' '}
                        em {bagCount} {bagCount === 1 ? 'saco' : 'sacos'}
                        {bagCount > 1 && averagePieces !== null && (
                            <span className="text-muted-foreground">
                                {' '}
                                · cerca de {averagePieces} por saco
                            </span>
                        )}
                    </p>
                ) : (
                    <p>Informe quantos sacos chegaram e o total de peças.</p>
                )}
            </div>
        </div>
    );
}
