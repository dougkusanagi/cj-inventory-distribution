import { useForm } from '@inertiajs/react';
import { MinusCircleIcon, PlusCircleIcon } from '@phosphor-icons/react';
import InputError from '@/components/input-error';
import { QuantityInput } from '@/components/ui/amount-inputs';
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
import { Textarea } from '@/components/ui/textarea';
import { update } from '@/routes/technical-sheets';
import type {
    MaterialLine,
    MaterialOption,
    MaterialRole,
    Sheet,
    SheetProduct,
} from './data';
import { materialRoleLabels } from './data';
import { PrintSheet } from './print-sheet';
import { RevisionDrawer } from './revision-drawer';

type FormLine = { material_id: string; role: MaterialRole; quantity: string };

export function TechnicalEditor({
    product,
    sheet,
    materials,
    options,
    onClose,
}: {
    product: SheetProduct;
    sheet: Sheet;
    materials: MaterialLine[];
    options: MaterialOption[];
    onClose: () => void;
}) {
    const form = useForm({
        version: sheet.version,
        instructions: sheet.instructions ?? '',
        materials: materials.map((line): FormLine => ({
            material_id: String(line.material_id),
            role: line.role,
            quantity: line.quantity,
        })),
    });

    function updateLine(index: number, changes: Partial<FormLine>) {
        form.setData(
            'materials',
            form.data.materials.map((line, position) =>
                position === index ? { ...line, ...changes } : line,
            ),
        );
    }

    return (
        <RevisionDrawer
            title="Editar dados técnicos"
            description="Informe os insumos, o consumo por peça e as instruções."
            extraAction={
                <PrintSheet
                    product={product}
                    sheet={{ ...sheet, instructions: form.data.instructions }}
                    dirty={form.isDirty}
                    materials={form.data.materials.map((line) => {
                        const id = Number(line.material_id);
                        const original = materials.find(
                            (item) =>
                                item.material_id === id &&
                                item.role === line.role,
                        );
                        const option = options.find((item) => item.id === id);
                        return {
                            ...line,
                            material_name:
                                original?.material_name ?? option?.name ?? '—',
                            unit: original?.unit ?? option?.unit ?? '—',
                        };
                    })}
                />
            }
            onClose={onClose}
            onSubmit={(event) => {
                event.preventDefault();
                form.submit(update(sheet.id), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
            submitLabel="Salvar dados técnicos"
            processing={form.processing}
            error={form.errors.version}
        >
            <div className="grid gap-2">
                <Label htmlFor="sheet-instructions">Instruções</Label>
                <Textarea
                    id="sheet-instructions"
                    maxLength={10000}
                    value={form.data.instructions}
                    onChange={(event) =>
                        form.setData('instructions', event.target.value)
                    }
                />
                <InputError message={form.errors.instructions} />
            </div>
            <fieldset className="grid gap-3">
                <legend className="mb-2 font-semibold">Insumos por peça</legend>
                {form.data.materials.map((line, index) => {
                    const original = materials.find(
                        (item) =>
                            item.material_id === Number(line.material_id) &&
                            item.role === line.role,
                    );
                    const available = options.filter(
                        (option) =>
                            line.role === 'component' ||
                            option.type === 'fabric',
                    );
                    const choices = available.map((item) => ({
                        value: String(item.id),
                        label: `${item.name} · ${item.code}`,
                    }));
                    if (
                        original &&
                        !choices.some((item) => item.value === line.material_id)
                    ) {
                        choices.push({
                            value: line.material_id,
                            label: `${original.material_name} (inativo)`,
                        });
                    }
                    const unit =
                        original?.unit ??
                        available.find(
                            (item) => item.id === Number(line.material_id),
                        )?.unit;
                    return (
                        <Card key={index} className="grid gap-3 p-3">
                            <Label htmlFor={`technical-role-${index}`}>
                                Função
                            </Label>
                            <Select
                                value={line.role}
                                onValueChange={(role) => {
                                    if (
                                        role === 'component' ||
                                        role === 'fabric_option'
                                    )
                                        updateLine(index, {
                                            role,
                                            material_id: '',
                                        });
                                }}
                            >
                                <SelectTrigger
                                    id={`technical-role-${index}`}
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="component">
                                        {materialRoleLabels.component}
                                    </SelectItem>
                                    <SelectItem value="fabric_option">
                                        {materialRoleLabels.fabric_option}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError
                                message={form.errors[`materials.${index}.role`]}
                            />
                            <SearchableSelect
                                id={`technical-material-${index}`}
                                label="Insumo"
                                showLabel
                                value={line.material_id}
                                options={choices}
                                onValueChange={(value) =>
                                    updateLine(index, { material_id: value })
                                }
                            />
                            <InputError
                                message={
                                    form.errors[
                                        `materials.${index}.material_id`
                                    ]
                                }
                            />
                            <Label htmlFor={`technical-quantity-${index}`}>
                                Quantidade{unit && ` · ${unit}`}
                            </Label>
                            <QuantityInput
                                id={`technical-quantity-${index}`}
                                value={line.quantity}
                                required
                                onValueChange={(value) =>
                                    updateLine(index, { quantity: value })
                                }
                            />
                            <InputError
                                message={
                                    form.errors[`materials.${index}.quantity`]
                                }
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 justify-self-start"
                                onClick={() =>
                                    form.setData(
                                        'materials',
                                        form.data.materials.filter(
                                            (_, position) => position !== index,
                                        ),
                                    )
                                }
                            >
                                <MinusCircleIcon /> Remover insumo
                            </Button>
                        </Card>
                    );
                })}
                <InputError message={form.errors.materials} />
                <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={form.data.materials.length >= 100}
                    onClick={() =>
                        form.setData('materials', [
                            ...form.data.materials,
                            {
                                material_id: '',
                                role: 'component',
                                quantity: '',
                            },
                        ])
                    }
                >
                    <PlusCircleIcon /> Adicionar insumo
                </Button>
            </fieldset>
        </RevisionDrawer>
    );
}
