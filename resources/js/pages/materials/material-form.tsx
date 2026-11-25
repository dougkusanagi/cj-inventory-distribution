import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { store, update } from '@/routes/materials';

export type Material = {
    id: number;
    code: string;
    name: string;
    type: string;
    unit: string;
    is_active: boolean;
};

export type MaterialOption = { value: string; label: string };

export function MaterialForm({
    material,
    types,
    units,
    onClose,
}: {
    material: Material | null;
    types: MaterialOption[];
    units: MaterialOption[];
    onClose: () => void;
}) {
    const side = useIsMobile() ? 'bottom' : 'right';
    const form = useForm({
        name: material?.name ?? '',
        type: material?.type ?? '',
        unit: material?.unit ?? '',
        is_active: material?.is_active ?? true,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.submit(material ? update(material.id) : store(), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Drawer
            open
            direction={side}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DrawerContent side={side}>
                <DrawerHeader>
                    <DrawerTitle>
                        {material ? 'Editar insumo' : 'Novo insumo'}
                    </DrawerTitle>
                    <DrawerDescription>
                        Informe como o insumo será identificado na ficha
                        técnica.
                    </DrawerDescription>
                </DrawerHeader>
                <form onSubmit={submit} className="flex min-h-0 flex-col gap-6">
                    <div className="grid gap-4 overflow-y-auto px-6">
                        <div className="grid gap-2">
                            <Label htmlFor="material-name">Nome</Label>
                            <Input
                                id="material-name"
                                required
                                maxLength={120}
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                aria-invalid={!!form.errors.name}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        {(
                            [
                                {
                                    field: 'type',
                                    label: 'Tipo',
                                    options: types,
                                },
                                {
                                    field: 'unit',
                                    label: 'Unidade',
                                    options: units,
                                },
                            ] as const
                        ).map(({ field, label, options }) => (
                            <div className="grid gap-2" key={field}>
                                <Label htmlFor={`material-${field}`}>
                                    {label}
                                </Label>
                                <Select
                                    required
                                    value={form.data[field]}
                                    onValueChange={(value) =>
                                        form.setData(field, value)
                                    }
                                >
                                    <SelectTrigger
                                        id={`material-${field}`}
                                        className="h-11 w-full"
                                        aria-invalid={!!form.errors[field]}
                                    >
                                        <SelectValue
                                            placeholder={`Escolha: ${label.toLowerCase()}`}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors[field]} />
                            </div>
                        ))}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="material-active">
                                Insumo ativo
                            </Label>
                            <Switch
                                id="material-active"
                                checked={form.data.is_active}
                                onCheckedChange={(active) =>
                                    form.setData('is_active', active)
                                }
                            />
                        </div>
                        <InputError message={form.errors.is_active} />
                    </div>
                    <DrawerFooter>
                        <Button
                            type="submit"
                            className="h-11"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Salvando insumo…'
                                : 'Salvar insumo'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
