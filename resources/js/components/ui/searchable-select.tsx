import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
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
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const selected = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={label}
                    aria-invalid={invalid || undefined}
                    disabled={disabled}
                    className={cn(
                        'h-11 w-full min-w-0 justify-between border-input bg-background px-3 text-sm font-normal text-foreground',
                        className,
                    )}
                >
                    <span className="truncate">{selected?.label}</span>
                    <CaretDownIcon weight="bold" className="size-5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                updatePositionStrategy="always"
                align="start"
                className="w-(--radix-popover-trigger-width) p-0"
            >
                <Command className="h-auto">
                    <CommandInput
                        aria-label={`Buscar ${label.toLowerCase()}`}
                        placeholder={`Buscar ${label.toLowerCase()}`}
                    />
                    <CommandList data-vaul-no-drag onWheel={(event) => event.stopPropagation()}>
                        <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="flex-1">{option.label}</span>
                                    {option.value === value && <CheckIcon weight="bold" />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
