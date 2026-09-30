import { useId } from 'react';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { RadioCard } from '@/components/ui/radio-card';
import { RadioGroup } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type RadioCardGroupProps = Omit<ComponentProps<typeof RadioGroup>, 'children'> & {
    idPrefix?: string;
    options: Array<{
        value: string;
        label: ReactNode;
        icon?: ComponentType<{ className?: string }>;
    }>;
};

export function RadioCardGroup({ options, idPrefix, className, ...props }: RadioCardGroupProps) {
    const generatedId = useId();
    const prefix = idPrefix ?? generatedId;
    const stacked = options.length === 3;

    return (
        <RadioGroup className={cn('gap-2', stacked && 'grid-cols-3', className)} {...props}>
            {options.map((option) => (
                <RadioCard
                    key={option.value}
                    id={`${prefix}-${option.value}`}
                    value={option.value}
                    label={option.label}
                    icon={option.icon}
                    layout={stacked ? 'stacked' : 'inline'}
                />
            ))}
        </RadioGroup>
    );
}
