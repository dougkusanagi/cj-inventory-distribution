import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { MoneyInput, PercentInput } from '@/components/ui/amount-inputs';
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
import { store, update } from '@/routes/cost-items';

export type CostItem = {
    id: number;
    name: string;
    default_amount: string | null;
    surcharge_type: 'percent' | 'fixed' | null;
    surcharge_value: string | null;
    is_active: boolean;
};

export function CostItemForm({
    item,
    onClose,
}: {
    item: CostItem | null;
    onClose: () => void;
}) {
    const side = useIsMobile() ? 'bottom' : 'right';
    const form = useForm({
        name: item?.name ?? '',
        default_amount: item?.default_amount ?? '',
        surcharge_type: item?.surcharge_type ?? '',
        surcharge_value: item?.surcharge_value ?? '',
        is_active: item?.is_active ?? true,
    });
    const SurchargeInput =
        form.data.surcharge_type === 'percent' ? PercentInput : MoneyInput;
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.submit(item ? update(item.id) : store(), {
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
                        {item ? 'Editar custo-base' : 'Novo custo-base'}
                    </DrawerTitle>
                    <DrawerDescription>
                        O valor e o acréscimo servem como sugestão na ficha
                        técnica.
                    </DrawerDescription>
                </DrawerHeader>
                <form onSubmit={submit} className="flex min-h-0 flex-col gap-6">
                    <div className="grid gap-4 overflow-y-auto px-6">
                        <div className="grid gap-2">
                            <Label htmlFor="cost-name">Nome</Label>
                            <Input
                                id="cost-name"
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
                        <div className="grid gap-2">
                            <Label htmlFor="cost-amount">
                                Valor padrão (opcional)
                            </Label>
                            <MoneyInput
                                id="cost-amount"
                                value={form.data.default_amount}
                                onValueChange={(value) =>
                                    form.setData('default_amount', value)
                                }
                                aria-invalid={!!form.errors.default_amount}
                            />
                            <InputError message={form.errors.default_amount} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cost-surcharge-type">
                                Acréscimo padrão
                            </Label>
                            <Select
                                value={form.data.surcharge_type || 'none'}
                                onValueChange={(value) =>
                                    form.setData((data) => ({
                                        ...data,
                                        surcharge_type:
                                            value === 'none' ? '' : value,
                                        surcharge_value: '',
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="cost-surcharge-type"
                                    className="h-11 w-full"
                                    aria-invalid={!!form.errors.surcharge_type}
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
                            <InputError message={form.errors.surcharge_type} />
                        </div>
                        {form.data.surcharge_type && (
                            <div className="grid gap-2">
                                <Label htmlFor="cost-surcharge">
                                    Valor do acréscimo
                                </Label>
                                <SurchargeInput
                                    id="cost-surcharge"
                                    required
                                    value={form.data.surcharge_value}
                                    onValueChange={(value) =>
                                        form.setData('surcharge_value', value)
                                    }
                                    aria-invalid={!!form.errors.surcharge_value}
                                />
                                <InputError
                                    message={form.errors.surcharge_value}
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="cost-active">Custo ativo</Label>
                            <Switch
                                id="cost-active"
                                checked={form.data.is_active}
                                onCheckedChange={(value) =>
                                    form.setData('is_active', value)
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
                                ? 'Salvando custo-base…'
                                : 'Salvar custo-base'}
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
