import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps, ComponentType, CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type FilterIcon = ComponentType<{ className?: string }>;

export type FilterOption = { value: string; label: string; icon?: FilterIcon };

export type FilterField = {
    name: string;
    label: string;
    value: string;
    allLabel: string;
    allIcon?: FilterIcon;
    options: FilterOption[];
    /** `cards` só afeta o drawer mobile com até três escolhas; no desktop vira select. */
    display?: 'select' | 'cards' | 'combobox';
};

type SearchFilterBarProps = {
    idPrefix: string;
    search: string;
    onSearchChange: (value: string) => void;
    fields: FilterField[];
    onFieldChange: (name: string, value: string) => void;
    onClear: () => void;
    resultCount: number;
    className?: string;
};

const searchPlaceholder = 'Buscar por nome, modelo ou código';
const filterTriggerClassName =
    'h-10 w-full justify-between rounded-xl border-input bg-background px-3 text-sm font-normal text-foreground shadow-xs hover:bg-background hover:text-foreground dark:bg-background dark:hover:bg-background data-[size=default]:h-10';
const filterTriggerLabelledClassName = 'h-11 data-[size=default]:h-11';

function SearchField({
    className,
    value,
    onClear,
    ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'value'> & {
    value: string;
    onClear: () => void;
}) {
    return (
        <div className="relative min-w-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                value={value}
                placeholder={searchPlaceholder}
                aria-label="Buscar produtos"
                className={cn(
                    'h-11 bg-background pl-10 text-base md:h-10 md:text-sm [&::-webkit-search-cancel-button]:appearance-none',
                    value !== '' && 'pr-11',
                    className,
                )}
                {...props}
            />
            {value !== '' && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Limpar busca"
                    onClick={onClear}
                    className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground"
                >
                    <X />
                </Button>
            )}
        </div>
    );
}

function FilterSelect({
    id,
    field,
    labelled,
    onChange,
}: {
    id: string;
    field: FilterField;
    labelled: boolean;
    onChange: (value: string) => void;
}) {
    const select = (
        <Select value={field.value} onValueChange={onChange}>
            <SelectTrigger
                id={id}
                aria-label={field.label}
                className={cn(
                    filterTriggerClassName,
                    labelled && filterTriggerLabelledClassName,
                )}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{field.allLabel}</SelectItem>
                {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    if (!labelled) {
        return select;
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{field.label}</Label>
            {select}
        </div>
    );
}

function FilterCombobox({
    id,
    field,
    labelled,
    onChange,
}: {
    id: string;
    field: FilterField;
    labelled: boolean;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const options: FilterOption[] = [
        { value: 'all', label: field.allLabel },
        ...field.options,
    ];
    const selected = options.find((option) => option.value === field.value);

    const combobox = (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={field.label}
                    className={cn(
                        filterTriggerClassName,
                        labelled && filterTriggerLabelledClassName,
                    )}
                >
                    <span className="truncate">{selected?.label}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-(--radix-popover-trigger-width) p-0"
            >
                <Command>
                    <CommandInput
                        placeholder={`Buscar ${field.label.toLowerCase()}`}
                    />
                    <CommandList
                        data-vaul-no-drag
                        onWheel={(event) => event.stopPropagation()}
                    >
                        <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="flex-1">
                                        {option.label}
                                    </span>
                                    {option.value === field.value && <Check />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );

    if (!labelled) {
        return combobox;
    }

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{field.label}</Label>
            {combobox}
        </div>
    );
}

function FilterCards({
    id,
    field,
    onChange,
}: {
    id: string;
    field: FilterField;
    onChange: (value: string) => void;
}) {
    const options: FilterOption[] = [
        { value: 'all', label: field.allLabel, icon: field.allIcon },
        ...field.options,
    ];

    const columns = options.length === 3;

    return (
        <div className="grid gap-2">
            <Label id={`${id}-label`}>{field.label}</Label>
            <RadioGroup
                value={field.value}
                onValueChange={onChange}
                aria-labelledby={`${id}-label`}
                className={cn('gap-2', columns && 'grid-cols-3')}
            >
                {options.map((option) => {
                    const Icon = option.icon;
                    const optionId = `${id}-${option.value}`;

                    return (
                        <Label
                            key={option.value}
                            htmlFor={optionId}
                            className={cn(
                                'flex cursor-pointer rounded-xl border border-input bg-background text-sm font-medium transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10',
                                columns
                                    ? 'min-h-24 flex-col items-center justify-center gap-2 px-2 py-3 text-center'
                                    : 'min-h-12 items-center gap-3 px-3 py-2',
                            )}
                        >
                            {Icon && (
                                <Icon
                                    className={cn(
                                        'shrink-0 text-muted-foreground',
                                        columns ? 'size-6' : 'size-4',
                                    )}
                                />
                            )}
                            <span className={cn(!columns && 'flex-1')}>
                                {option.label}
                            </span>
                            <RadioGroupItem
                                id={optionId}
                                value={option.value}
                                className={cn(columns && 'sr-only')}
                            />
                        </Label>
                    );
                })}
            </RadioGroup>
        </div>
    );
}

export function SearchFilterBar({
    idPrefix,
    search,
    onSearchChange,
    fields,
    onFieldChange,
    onClear,
    resultCount,
    className,
}: SearchFilterBarProps) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const activeCount = fields.filter((field) => field.value !== 'all').length;
    const hasFilters = search !== '' || activeCount > 0;
    const drawerId = `${idPrefix}-filter-drawer`;
    const desktopStyle = {
        '--filter-columns': `minmax(0,1.4fr) repeat(${fields.length}, minmax(9rem,1fr)) auto`,
    } as CSSProperties;

    return (
        <section
            aria-label="Buscar e filtrar produtos"
            data-testid={`${idPrefix}-filters`}
            className={cn(
                'rounded-[1.25rem] border border-border/80 bg-card p-3 shadow-sm md:rounded-[1.75rem] md:p-4',
                className,
            )}
        >
            <div className="grid gap-3 md:hidden">
                <SearchField
                    id={`mobile-${idPrefix}-search`}
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onClear={() => onSearchChange('')}
                />
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <Button
                        type="button"
                        variant="secondary"
                        className="h-10 shrink-0 gap-2 px-3"
                        aria-expanded={drawerOpen}
                        aria-controls={drawerId}
                        aria-label="Abrir filtros de produtos"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <SlidersHorizontal />
                        <span>Filtros</span>
                        {activeCount > 0 && (
                            <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                                {activeCount}
                            </span>
                        )}
                    </Button>
                    <p role="status" className="text-sm text-muted-foreground">
                        <strong className="text-foreground">
                            {resultCount}
                        </strong>{' '}
                        {resultCount === 1 ? 'encontrado' : 'encontrados'}
                    </p>
                </div>
            </div>

            <div
                style={desktopStyle}
                className="hidden gap-3 md:grid md:[grid-template-columns:var(--filter-columns)]"
            >
                <SearchField
                    id={`${idPrefix}-search`}
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onClear={() => onSearchChange('')}
                />
                {fields.map((field) => {
                    const Control =
                        field.display === 'combobox'
                            ? FilterCombobox
                            : FilterSelect;

                    return (
                        <Control
                            key={field.name}
                            id={`${idPrefix}-${field.name}`}
                            field={field}
                            labelled={false}
                            onChange={(value) =>
                                onFieldChange(field.name, value)
                            }
                        />
                    );
                })}
                {hasFilters && (
                    <Button type="button" variant="ghost" onClick={onClear}>
                        <X />
                        Limpar filtros
                    </Button>
                )}
            </div>

            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent id={drawerId} className="mx-auto max-w-2xl">
                    <DrawerHeader className="relative shrink-0 px-4 pt-5 pr-16 pb-4 text-left sm:px-6">
                        <DrawerTitle>Filtrar produtos</DrawerTitle>
                        <DrawerDescription>
                            A lista é atualizada conforme você escolhe.
                        </DrawerDescription>
                        <DrawerClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 size-11"
                                aria-label="Fechar filtros de produtos"
                            >
                                <X />
                            </Button>
                        </DrawerClose>
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
                        <div className="grid gap-4">
                            {fields.map((field) => {
                                const id = `mobile-${idPrefix}-${field.name}`;
                                const onChange = (value: string) =>
                                    onFieldChange(field.name, value);

                                return field.display === 'cards' &&
                                    field.options.length + 1 <= 3 ? (
                                    <FilterCards
                                        key={field.name}
                                        id={id}
                                        field={field}
                                        onChange={onChange}
                                    />
                                ) : field.display === 'combobox' ? (
                                    <FilterCombobox
                                        key={field.name}
                                        id={id}
                                        field={field}
                                        labelled
                                        onChange={onChange}
                                    />
                                ) : (
                                    <FilterSelect
                                        key={field.name}
                                        id={id}
                                        field={field}
                                        labelled
                                        onChange={onChange}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <DrawerFooter className="shrink-0 border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
                        <DrawerClose asChild>
                            <Button type="button" className="h-11">
                                Ver {resultCount}{' '}
                                {resultCount === 1 ? 'resultado' : 'resultados'}
                            </Button>
                        </DrawerClose>
                        {hasFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11"
                                onClick={onClear}
                            >
                                Limpar filtros
                            </Button>
                        )}
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </section>
    );
}
