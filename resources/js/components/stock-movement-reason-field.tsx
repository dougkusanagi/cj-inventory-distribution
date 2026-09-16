import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const otherReason = '__other__';

export const stockEntryReasons = [
    'Recebimento da fábrica',
    'Produção concluída',
    'Reposição de estoque',
    'Devolução de cliente ou lojista',
    'Retorno de consignação',
    'Transferência recebida',
    'Estoque encontrado no inventário',
    'Correção de entrada anterior',
] as const;

export const stockExitReasons = [
    'Avaria',
    'Perda ou extravio',
    'Descarte',
    'Uso interno',
    'Amostra ou mostruário',
    'Doação',
    'Devolução ao fornecedor',
    'Transferência enviada',
    'Estoque faltante no inventário',
    'Correção de saída anterior',
] as const;

export const stockAdjustmentReasons = [
    'Balanço ou inventário',
    'Correção de contagem',
    'Correção de cadastro',
    'Divergência na grade de tamanhos',
    'Peças encontradas',
    'Peças faltantes',
    'Avaria identificada na conferência',
    'Recontagem após separação',
    'Reorganização do saco',
] as const;

export const stockReversalReasons = [
    'Lançamento duplicado',
    'Produto ou saco incorreto',
    'Quantidade incorreta',
    'Grade de tamanhos incorreta',
    'Tipo de movimentação incorreto',
    'Operação cancelada',
    'Erro operacional',
] as const;

type StockMovementReasonFieldProps = {
    id: string;
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
    error?: string;
};

export function StockMovementReasonField({
    id,
    value,
    options,
    onChange,
    error,
}: StockMovementReasonFieldProps) {
    const [usesCustomReason, setUsesCustomReason] = useState(
        () => value !== '' && !options.includes(value),
    );
    const selectedValue = usesCustomReason
        ? otherReason
        : options.includes(value)
          ? value
          : undefined;

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                Motivo <span className="text-destructive">*</span>
            </Label>
            <Select
                value={selectedValue}
                onValueChange={(nextValue) => {
                    const isOtherReason = nextValue === otherReason;

                    setUsesCustomReason(isOtherReason);
                    onChange(isOtherReason ? '' : nextValue);
                }}
            >
                <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-invalid={!!error}
                >
                    <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                    <SelectItem value={otherReason}>Outro motivo</SelectItem>
                </SelectContent>
            </Select>
            {usesCustomReason && (
                <Input
                    id={`${id}-other`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="Descreva o motivo"
                    aria-label="Outro motivo"
                    aria-invalid={!!error}
                    autoFocus
                />
            )}
            <InputError message={error} />
        </div>
    );
}
