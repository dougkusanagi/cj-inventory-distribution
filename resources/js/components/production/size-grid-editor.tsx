import { MinusCircleIcon, PlusCircleIcon } from '@phosphor-icons/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SizeInput = { size: string; quantity: string };
export type BatchSize = { size: string; quantity: number };

export function SizeGridEditor({
    value,
    onChange,
    errors,
    prefix = 'sizes',
    disabled = false,
    maxQuantity,
}: {
    value: SizeInput[];
    onChange: (sizes: SizeInput[]) => void;
    errors: Record<string, string>;
    prefix?: string;
    disabled?: boolean;
    maxQuantity: number;
}) {
    return (
        <fieldset className="grid gap-3">
            <legend className="font-medium">
                Grade por tamanho{' '}
                <span className="font-normal text-muted-foreground">
                    (opcional)
                </span>
            </legend>
            <p className="text-sm text-muted-foreground">
                Se informar a grade, a soma deve ser igual à quantidade de
                peças.
            </p>
            {value.map((item, index) => (
                <div
                    key={index}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                >
                    <div className="grid min-w-0 gap-1">
                        <Label htmlFor={`${prefix}-name-${index}`}>
                            Tamanho
                        </Label>
                        <Input
                            id={`${prefix}-name-${index}`}
                            value={item.size}
                            maxLength={30}
                            required
                            disabled={disabled}
                            onChange={(event) =>
                                onChange(
                                    value.map((row, position) =>
                                        position === index
                                            ? {
                                                  ...row,
                                                  size: event.target.value,
                                              }
                                            : row,
                                    ),
                                )
                            }
                        />
                        <InputError
                            message={errors[`${prefix}.${index}.size`]}
                        />
                    </div>
                    <div className="grid min-w-0 gap-1">
                        <Label htmlFor={`${prefix}-quantity-${index}`}>
                            Peças
                        </Label>
                        <Input
                            id={`${prefix}-quantity-${index}`}
                            type="number"
                            min="0"
                            max={maxQuantity}
                            required
                            disabled={disabled}
                            value={item.quantity}
                            onChange={(event) =>
                                onChange(
                                    value.map((row, position) =>
                                        position === index
                                            ? {
                                                  ...row,
                                                  quantity: event.target.value,
                                              }
                                            : row,
                                    ),
                                )
                            }
                        />
                        <InputError
                            message={errors[`${prefix}.${index}.quantity`]}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11"
                        aria-label={`Remover tamanho ${index + 1}`}
                        disabled={disabled}
                        onClick={() =>
                            onChange(
                                value.filter(
                                    (_, position) => position !== index,
                                ),
                            )
                        }
                    >
                        <MinusCircleIcon />
                    </Button>
                </div>
            ))}
            <InputError message={errors[prefix]} />
            <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => onChange([...value, { size: '', quantity: '' }])}
            >
                <PlusCircleIcon />
                Adicionar tamanho
            </Button>
        </fieldset>
    );
}
