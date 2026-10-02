import {
    MagnifyingGlassIcon,
    FunnelIcon,
    PlusCircleIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import { Label } from '@/components/ui/label';
import { RadioCardGroup } from '@/components/ui/radio-card-group';
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
    defaultValue?: string;
    allLabel: string;
    /** Rótulo curto da opção "todos" nos cartões, onde o título do grupo já dá o contexto. */
    allCardLabel?: string;
    allIcon?: FilterIcon;
    options: FilterOption[];
    /** `cards` só afeta o drawer mobile com até três escolhas; no desktop vira select. */
    onAdd?: () => void;
    addLabel?: string;
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

const searchPlaceholder = 'Nome, modelo ou código';
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
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
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
                    <XIcon weight="bold" />
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
    const combobox = (
        <div className="flex min-w-0">
            <SearchableSelect
                id={id}
                label={field.label}
                value={field.value}
                options={[
                    { value: 'all', label: field.allLabel },
                    ...field.options,
                ]}
                onValueChange={onChange}
                className={cn(
                    filterTriggerClassName,
                    'min-w-0 flex-1',
                    field.onAdd && 'rounded-r-none focus-visible:z-10',
                    labelled && filterTriggerLabelledClassName,
                )}
            />
            {field.onAdd && (
                <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                        'size-10 shrink-0 rounded-l-none rounded-r-xl border border-l-0 border-input focus-visible:z-10',
                        labelled && 'size-11',
                    )}
                    aria-label={field.addLabel}
                    onClick={field.onAdd}
                >
                    <PlusCircleIcon />
                </Button>
            )}
        </div>
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
        {
            value: 'all',
            label: field.allCardLabel ?? field.allLabel,
            icon: field.allIcon,
        },
        ...field.options,
    ];

    return (
        <div className="grid gap-2">
            <Label id={`${id}-label`}>{field.label}</Label>
            <RadioCardGroup
                idPrefix={id}
                value={field.value}
                onValueChange={onChange}
                aria-labelledby={`${id}-label`}
                options={options}
            />
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
    const activeCount = fields.filter(
        (field) => field.value !== (field.defaultValue ?? 'all'),
    ).length;
    const hasFilters = search !== '' || activeCount > 0;
    const drawerId = `${idPrefix}-filter-drawer`;
    const controlFields = fields.map((field) => ({
        ...field,
        onAdd: field.onAdd
            ? () => {
                  setDrawerOpen(false);
                  field.onAdd?.();
              }
            : undefined,
    }));
    const desktopStyle = {
        '--filter-columns': `minmax(0,1.4fr) repeat(${fields.length}, minmax(9rem,1fr))`,
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
                        <FunnelIcon />
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
                className={cn(
                    'hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3',
                    fields.length > 4
                        ? 'xl:grid-cols-4'
                        : 'xl:[grid-template-columns:var(--filter-columns)]',
                )}
            >
                <SearchField
                    id={`${idPrefix}-search`}
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onClear={() => onSearchChange('')}
                />
                {controlFields.map((field) => {
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
            </div>
            <div className="mt-3 hidden min-h-9 items-center justify-between gap-3 border-t border-border/60 pt-3 md:flex">
                <p role="status" className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{resultCount}</strong>{' '}
                    {resultCount === 1
                        ? 'produto encontrado'
                        : 'produtos encontrados'}
                    {activeCount > 0 &&
                        ` · ${activeCount} ${activeCount === 1 ? 'filtro aplicado' : 'filtros aplicados'}`}
                </p>
                {hasFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                    >
                        <XIcon weight="bold" />
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
                                <XIcon weight="bold" />
                            </Button>
                        </DrawerClose>
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
                        <div className="grid gap-4">
                            {controlFields.map((field) => {
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
