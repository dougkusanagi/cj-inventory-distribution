import { CheckCircleIcon } from '@phosphor-icons/react';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type RadioCardProps = Omit<
    ComponentProps<typeof RadioGroupItem>,
    'children' | 'className'
> & {
    label: ReactNode;
    icon?: ComponentType<{ className?: string }>;
    /**
     * `stacked` mostra o ícone em um tile acima do texto e serve para até três
     * escolhas lado a lado; `inline` mostra ícone, texto e o indicador em uma
     * linha.
     */
    layout?: 'stacked' | 'inline';
    className?: string;
};

/**
 * Escolha única em formato de cartão, para uso dentro de um `RadioGroup`.
 * Padroniza altura, espaçamento, tile do ícone e cores do texto; o estado
 * selecionado aparece na borda, no fundo, no tile e em uma marca no canto.
 */
function RadioCard({
    label,
    icon: Icon,
    layout = 'stacked',
    className,
    id,
    ...props
}: RadioCardProps) {
    const generatedId = useId();
    const itemId = id ?? generatedId;
    const isStacked = layout === 'stacked';

    return (
        <Label
            htmlFor={itemId}
            data-slot="radio-card"
            className={cn(
                'group relative flex cursor-pointer rounded-xl border border-border bg-card text-sm leading-tight font-medium text-foreground/75 transition-colors select-none hover:border-input hover:bg-muted/40 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[[data-state=checked]]:border-primary/70 has-[[data-state=checked]]:bg-primary/[0.07] has-[[data-state=checked]]:text-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
                isStacked
                    ? 'flex-col items-center gap-1.5 px-2 pt-3 pb-2.5 text-center'
                    : 'min-h-12 items-center gap-3 px-3 py-2',
                className,
            )}
        >
            {Icon && (
                <span
                    className={cn(
                        'grid shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-has-[[data-state=checked]]:bg-primary/15 group-has-[[data-state=checked]]:text-highlight',
                        isStacked ? 'size-10' : 'size-9',
                    )}
                >
                    <Icon className={isStacked ? 'size-6' : 'size-5'} />
                </span>
            )}
            <span className={cn('min-w-0 text-balance', !isStacked && 'flex-1')}>
                {label}
            </span>
            {isStacked && (
                <CheckCircleIcon
                    weight="fill"
                    className="absolute top-1.5 right-1.5 size-5 scale-75 text-primary opacity-0 transition group-has-[[data-state=checked]]:scale-100 group-has-[[data-state=checked]]:opacity-100"
                />
            )}
            <RadioGroupItem
                id={itemId}
                className={cn(isStacked && 'sr-only')}
                {...props}
            />
        </Label>
    );
}

export { RadioCard };
