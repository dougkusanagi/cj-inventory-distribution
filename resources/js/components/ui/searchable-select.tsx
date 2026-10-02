import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { fieldSurfaceClassName } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type SearchableSelectProps = {
    id: string;
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onValueChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
    invalid?: boolean;
    showLabel?: boolean;
};

export function SearchableSelect({
    id,
    label,
    value,
    options,
    onValueChange,
    className,
    disabled,
    invalid,
    showLabel = false,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const selected = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={label}
                    aria-invalid={invalid || undefined}
                    disabled={disabled}
                    className={cn(
                        fieldSurfaceClassName,
                        'group/combobox inline-flex h-12 w-full min-w-0 items-center justify-between gap-3 px-4 text-left text-sm',
                        className,
                    )}
                >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        {showLabel && (
                            <span
                                aria-hidden="true"
                                className="text-xs font-normal leading-4 text-muted-foreground"
                            >
                                {label}
                            </span>
                        )}
                        <span
                            className={cn(
                                'truncate leading-5',
                                showLabel && 'font-medium',
                            )}
                        >
                            {selected?.label}
                        </span>
                    </span>
                    <CaretDownIcon
                        weight="bold"
                        className="size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover/combobox:text-foreground group-aria-expanded/combobox:rotate-180 group-aria-expanded/combobox:text-highlight motion-reduce:transition-none"
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                updatePositionStrategy="always"
                align="start"
                sideOffset={6}
                className="w-(--radix-popover-trigger-width) overflow-hidden rounded-2xl p-0 shadow-xl shadow-black/15"
            >
                <Command className="h-auto">
                    <CommandInput
                        aria-label={`Buscar ${label.toLowerCase()}`}
                        placeholder={`Buscar ${label.toLowerCase()}`}
                        className="caret-highlight"
                    />
                    <CommandList
                        data-vaul-no-drag
                        onWheel={(event) => event.stopPropagation()}
                    >
                        <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                        <CommandGroup className="p-2">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    className={cn(
                                        'min-h-11 rounded-xl px-3',
                                        option.value === value &&
                                            'bg-primary/10 font-medium',
                                    )}
                                    onSelect={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="flex-1">{option.label}</span>
                                    {option.value === value && (
                                        <CheckIcon
                                            weight="bold"
                                            className="size-4 text-highlight"
                                        />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
