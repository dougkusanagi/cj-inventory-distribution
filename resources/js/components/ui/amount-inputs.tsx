import { usePage } from '@inertiajs/react';
import { NumberFormatBase, NumericFormat } from 'react-number-format';
import { Input } from '@/components/ui/input';

type AmountInputProps = {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    required?: boolean;
    'aria-invalid'?: boolean;
};

export function MoneyInput({
    value,
    onValueChange,
    precision = 2,
    ...props
}: AmountInputProps & { precision?: 2 | 4 }) {
    const { locale } = usePage().props;
    const [units, fraction = ''] = value.split('.');
    const digits = value === '' ? '' : units + fraction.padEnd(precision, '0');
    const maxDigits = 12;

    return (
        <NumberFormatBase
            {...props}
            customInput={Input}
            value={digits}
            valueIsNumericString
            inputMode="numeric"
            placeholder={formatMoney('0', locale, precision)}
            isAllowed={({ value: candidate }) => candidate.length <= maxDigits}
            format={(rawDigits) => rawDigits ? formatMoney(minorUnitsToDecimal(rawDigits, precision), locale, precision) : ''}
            removeFormatting={(formatted) => formatted.replace(/\D/g, '').replace(/^0+(?=\d)/, '')}
            onValueChange={({ value: rawDigits }, { source }) => {
                if (source === 'event') {
                    onValueChange(rawDigits ? minorUnitsToDecimal(rawDigits, precision) : '');
                }
            }}
        />
    );
}

export function QuantityInput({ onValueChange, ...props }: AmountInputProps) {
    const { locale } = usePage().props;
    return (
        <NumericFormat
            {...props}
            customInput={Input}
            valueIsNumericString
            decimalSeparator={new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? ','}
            allowedDecimalSeparators={[',', '.']}
            decimalScale={3}
            allowNegative={false}
            inputMode="decimal"
            onValueChange={({ value }, { source }) => {
                if (source === 'event') onValueChange(value);
            }}
        />
    );
}

export function PercentInput({ onValueChange, ...props }: AmountInputProps) {
    const { locale } = usePage().props;
    return (
        <NumericFormat
            {...props}
            customInput={Input}
            valueIsNumericString
            suffix="%"
            decimalSeparator={new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? ','}
            allowedDecimalSeparators={[',', '.']}
            decimalScale={2}
            allowNegative={false}
            inputMode="decimal"
            onValueChange={({ value }, { source }) => {
                if (source === 'event') onValueChange(value);
            }}
        />
    );
}

function minorUnitsToDecimal(digits: string, precision: number): string {
    const padded = digits.padStart(precision + 1, '0');
    return `${padded.slice(0, -precision)}.${padded.slice(-precision)}`;
}

export function formatMoney(value: string, locale: string, precision = 2): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    }).format(Number(value));
}
