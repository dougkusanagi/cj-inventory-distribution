import { Head, usePage } from '@inertiajs/react';
import { PencilSimpleIcon, PlusCircleIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { Pagination } from '@/components/pagination';
import { formatMoney } from '@/components/ui/amount-inputs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { index } from '@/routes/cost-items';
import type { Paginated } from '@/types';
import { CostItemForm, type CostItem } from './cost-item-form';

export default function CostItemsIndex({
    costItems,
}: {
    costItems: Pick<Paginated<CostItem>, 'data' | 'links'>;
}) {
    const { locale } = usePage().props;
    const percent = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    const [editing, setEditing] = useState<CostItem | null | undefined>();
    const opener = useRef<HTMLButtonElement | null>(null);

    return (
        <>
            <Head title="Custos-base" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Custos-base
                    </h1>
                    <Button
                        className="h-11"
                        onClick={(event) => {
                            opener.current = event.currentTarget;
                            setEditing(null);
                        }}
                    >
                        <PlusCircleIcon /> Novo custo-base
                    </Button>
                </header>
                <div className="grid gap-3">
                    {costItems.data.map((item) => (
                        <Card
                            key={item.id}
                            className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="min-w-0 text-lg font-semibold break-words">
                                        {item.name}
                                    </h2>
                                    {!item.is_active && (
                                        <Badge variant="secondary">
                                            Inativo
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {item.default_amount === null
                                        ? 'Sem valor padrão'
                                        : formatMoney(
                                              item.default_amount,
                                              locale,
                                          )}
                                    {item.surcharge_value !== null &&
                                        ` + ${item.surcharge_type === 'percent' ? percent.format(Number(item.surcharge_value)) + '%' : formatMoney(item.surcharge_value, locale)}`}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="h-11"
                                aria-label={`Editar ${item.name}`}
                                onClick={(event) => {
                                    opener.current = event.currentTarget;
                                    setEditing(item);
                                }}
                            >
                                <PencilSimpleIcon /> Editar
                            </Button>
                        </Card>
                    ))}
                    {costItems.data.length === 0 && (
                        <Card className="p-6 text-center">
                            Ainda não há custos-base cadastrados.
                        </Card>
                    )}
                </div>
                {costItems.links.length > 3 && (
                    <Pagination
                        links={costItems.links}
                        ariaLabel="Paginação de custos-base"
                    />
                )}
            </div>
            {editing !== undefined && (
                <CostItemForm
                    item={editing}
                    onClose={() => {
                        setEditing(undefined);
                        requestAnimationFrame(() => opener.current?.focus());
                    }}
                />
            )}
        </>
    );
}

CostItemsIndex.layout = {
    breadcrumbs: [{ title: 'Custos-base', href: index() }],
};
