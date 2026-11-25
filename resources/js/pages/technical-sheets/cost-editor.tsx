import { useForm } from '@inertiajs/react';
import { MinusCircleIcon } from '@phosphor-icons/react';
import InputError from '@/components/input-error';
import { MoneyInput, PercentInput } from '@/components/ui/amount-inputs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { update } from '@/routes/technical-sheets/costs';
import type { CostLine, Costs, MaterialLine, Sheet } from './data';
import { RevisionDrawer } from './revision-drawer';

export function CostEditor({
    sheet,
    costs,
    materials,
    onClose,
}: {
    sheet: Sheet;
    costs: Costs;
    materials: MaterialLine[];
    onClose: () => void;
}) {
    const options = materials.filter((line) => line.role === 'fabric_option');
    const form = useForm({
        version: sheet.version,
        costs: costs.items,
        sale_prices: options.map((option) => ({
            id: option.id,
            sale_price:
                costs.summary.lines.find((line) => line.id === option.id)
                    ?.sale_price ?? '',
        })),
    });

    const remainingCosts = costs.options.filter(
        (option) =>
            !form.data.costs.some((item) => item.cost_item_id === option.id),
    );

    function editCost(index: number, change: Partial<CostLine>) {
        form.setData(
            'costs',
            form.data.costs.map((item, position) =>
                position === index ? { ...item, ...change } : item,
            ),
        );
    }

    return (
        <RevisionDrawer
            title="Editar custos"
            description="Os totais são calculados com os valores salvos."
            onClose={onClose}
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    ...data,
                    costs: data.costs.map(
                        ({
                            cost_item_id,
                            amount,
                            surcharge_type,
                            surcharge_value,
                        }) => ({
                            cost_item_id,
                            amount,
                            surcharge_type,
                            surcharge_value,
                        }),
                    ),
                }));
                form.submit(update(sheet.id), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
            submitLabel="Salvar custos"
            processing={form.processing}
            error={form.errors.version}
        >
            <fieldset className="grid gap-3">
                <legend className="mb-2 font-semibold">Custos-base</legend>
                {form.data.costs.map((line, index) => {
                    const SurchargeInput =
                        line.surcharge_type === 'percent'
                            ? PercentInput
                            : MoneyInput;

                    return (
                        <Card
                            key={line.cost_item_id}
                            className="grid gap-3 p-3"
                        >
                            <h3 className="font-semibold break-words">
                                {line.cost_name}
                            </h3>
                            <InputError
                                message={
                                    form.errors[`costs.${index}.cost_item_id`]
                                }
                            />
                            <Label htmlFor={`sheet-amount-${index}`}>
                                Valor
                            </Label>
                            <MoneyInput
                                id={`sheet-amount-${index}`}
                                required
                                value={line.amount}
                                onValueChange={(value) =>
                                    editCost(index, { amount: value })
                                }
                            />
                            <InputError
                                message={form.errors[`costs.${index}.amount`]}
                            />
                            <Label htmlFor={`sheet-surcharge-type-${index}`}>
                                Acréscimo
                            </Label>
                            <Select
                                value={line.surcharge_type ?? 'none'}
                                onValueChange={(value) => {
                                    editCost(index, {
                                        surcharge_type:
                                            value === 'percent' ||
                                            value === 'fixed'
                                                ? value
                                                : null,
                                        surcharge_value: null,
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id={`sheet-surcharge-type-${index}`}
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Sem acréscimo
                                    </SelectItem>
                                    <SelectItem value="percent">
                                        Porcentagem
                                    </SelectItem>
                                    <SelectItem value="fixed">
                                        Valor fixo
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={
                                    form.errors[`costs.${index}.surcharge_type`]
                                }
                            />
                            {line.surcharge_type && (
                                <>
                                    <Label htmlFor={`sheet-surcharge-${index}`}>
                                        Valor do acréscimo
                                    </Label>
                                    <SurchargeInput
                                        id={`sheet-surcharge-${index}`}
                                        value={line.surcharge_value ?? ''}
                                        required
                                        onValueChange={(value) =>
                                            editCost(index, {
                                                surcharge_value: value,
                                            })
                                        }
                                    />
                                    <InputError
                                        message={
                                            form.errors[
                                                `costs.${index}.surcharge_value`
                                            ]
                                        }
                                    />
                                </>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 justify-self-start"
                                onClick={() =>
                                    form.setData(
                                        'costs',
                                        form.data.costs.filter(
                                            (item) =>
                                                item.cost_item_id !==
                                                line.cost_item_id,
                                        ),
                                    )
                                }
                            >
                                <MinusCircleIcon /> Remover custo
                            </Button>
                        </Card>
                    );
                })}
                <InputError message={form.errors.costs} />
                {remainingCosts.length > 0 && form.data.costs.length < 100 && (
                    <SearchableSelect
                        id="sheet-add-cost"
                        label="Adicionar custo-base"
                        value=""
                        options={remainingCosts.map((item) => ({
                            value: String(item.id),
                            label: item.name,
                        }))}
                        onValueChange={(value) => {
                            const option = remainingCosts.find(
                                (item) => String(item.id) === value,
                            );
                            if (option)
                                form.setData('costs', [
                                    ...form.data.costs,
                                    {
                                        cost_item_id: option.id,
                                        cost_name: option.name,
                                        amount: option.default_amount ?? '',
                                        surcharge_type: option.surcharge_type,
                                        surcharge_value: option.surcharge_value,
                                    },
                                ]);
                        }}
                    />
                )}
            </fieldset>
            {options.length > 0 && (
                <fieldset className="grid gap-3">
                    <legend className="mb-2 font-semibold">
                        Preços de venda
                    </legend>
                    {options.map((option, index) => (
                        <div className="grid gap-2" key={option.id}>
                            <Label htmlFor={`sheet-sale-${index}`}>
                                {option.material_name}
                            </Label>
                            <MoneyInput
                                id={`sheet-sale-${index}`}
                                value={form.data.sale_prices[index].sale_price}
                                onValueChange={(value) =>
                                    form.setData(
                                        'sale_prices',
                                        form.data.sale_prices.map((sale) =>
                                            sale.id === option.id
                                                ? { ...sale, sale_price: value }
                                                : sale,
                                        ),
                                    )
                                }
                            />
                            <InputError
                                message={
                                    form.errors[
                                        `sale_prices.${index}.sale_price`
                                    ]
                                }
                            />
                        </div>
                    ))}
                </fieldset>
            )}
        </RevisionDrawer>
    );
}
