import { useId } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { StockOfferType } from '@/types';

export type StockOfferTypeOption = {
    id: StockOfferType;
    label: string;
    description: string;
};

export const stockOfferTypeOptions: StockOfferTypeOption[] = [
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

type StockOfferTypeSelectorProps = {
    value: StockOfferType | '';
    onChange: (value: StockOfferType) => void;
    error?: string;
    disabled?: boolean;
    idPrefix?: string;
    className?: string;
};

export function StockOfferTypeSelector({
    value,
    onChange,
    error,
    disabled = false,
    idPrefix = 'stock-offer-type',
    className,
}: StockOfferTypeSelectorProps) {
    const legendId = useId();

    return (
        <fieldset
            className={cn('grid gap-3', className)}
            data-testid={`${idPrefix}-selector`}
        >
            <legend
                id={legendId}
                className="text-sm font-semibold text-foreground"
            >
                Tipo de Grade <span className="text-destructive">*</span>
            </legend>
            <p className="text-sm leading-5 text-muted-foreground">
                Todos os tipos usam pelo menos um saco; a diferença está na
                classificação da oferta.
            </p>
            <RadioGroup
                value={value}
                onValueChange={(nextValue) =>
                    onChange(nextValue as StockOfferType)
                }
                disabled={disabled}
                className="grid grid-cols-3 gap-2"
                aria-labelledby={legendId}
                aria-invalid={error ? true : undefined}
            >
                {stockOfferTypeOptions.map((offerType) => {
                    const optionId = `${idPrefix}-${offerType.id}`;
                    const isSelected = value === offerType.id;

                    return (
                        <Label
                            key={offerType.id}
                            htmlFor={optionId}
                            className={cn(
                                'flex min-h-16 min-w-0 cursor-pointer flex-col items-stretch gap-1.5 rounded-xl border px-2.5 py-2.5 text-sm font-medium transition-colors select-none',
                                isSelected
                                    ? 'border-highlight bg-accent/50'
                                    : 'border-border hover:bg-muted/30',
                                disabled && 'cursor-not-allowed opacity-60',
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
                        </Label>
                    );
                })}
            </RadioGroup>
            <InputError message={error} />
        </fieldset>
    );
}
