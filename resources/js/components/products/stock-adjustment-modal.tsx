import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import store from '@/actions/App/Http/Controllers/ProductStockAdjustmentController';
import InputError from '@/components/input-error';
import {
    RecountFields,
    recountTotal,
} from '@/components/products/recount-fields';
import type { RecountItem } from '@/components/products/recount-fields';
import {
    StockMovementReasonField,
    stockAdjustmentReasons,
} from '@/components/stock-movement-reason-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { idempotencyKey } from '@/lib/idempotency-key';
import type { Product } from '@/types';

export function StockAdjustmentModal({
    product,
    open,
    onOpenChange,
}: {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const isMobile = useIsMobile();
    const [key] = useState(idempotencyKey);
    const form = useForm({
        volume_id: 0,
        expected_version: 0,
        total_quantity: '',
        items: [] as RecountItem[],
        reason: '',
        idempotency_key: key,
    });
    const available = product.stock_volumes.filter(
        (volume) => volume.can_recount,
    );
    const volume = available.find(
        (candidate) => candidate.id === form.data.volume_id,
    );
    const select = (id: string) => {
        const selected = available.find(
            (candidate) => candidate.id === Number(id),
        );
        if (!selected) return;
        form.clearErrors();
        form.setData({
            volume_id: selected.id,
            expected_version: selected.stock_version ?? 0,
            total_quantity: String(selected.total_quantity),
            items: selected.items.map((item) => ({
                id: item.id,
                size: item.size,
                is_active: item.is_active,
                quantity: item.quantity === null ? '' : String(item.quantity),
            })),
            reason: '',
            idempotency_key: idempotencyKey(),
        });
    };
    const content = (
        <div className="grid min-h-0 gap-5 overflow-y-auto px-4 pb-4 sm:px-0">
            <div className="grid gap-2">
                <Label>Saco disponível</Label>
                <Select
                    value={
                        form.data.volume_id ? String(form.data.volume_id) : ''
                    }
                    onValueChange={select}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o saco" />
                    </SelectTrigger>
                    <SelectContent>
                        {available.map((candidate) => (
                            <SelectItem
                                key={candidate.id}
                                value={String(candidate.id)}
                            >
                                {candidate.code} · {candidate.total_quantity}{' '}
                                peças
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {available.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Não há sacos disponíveis para recontagem. Sacos reservados
                    ou consumidos não podem ser ajustados.
                </p>
            )}
            {volume && (
                <>
                    <RecountFields
                        items={form.data.items}
                        total={form.data.total_quantity}
                        onItems={(items) => form.setData('items', items)}
                        onTotal={(value) =>
                            form.setData('total_quantity', value)
                        }
                        prefix="recount"
                    />
                    <p className="text-sm font-medium">
                        Registrado: {volume.total_quantity} · Contado:{' '}
                        {recountTotal(
                            form.data.items,
                            form.data.total_quantity,
                        )}{' '}
                        peças
                    </p>
                </>
            )}
            <StockMovementReasonField
                id="recount-reason"
                value={form.data.reason}
                options={stockAdjustmentReasons}
                onChange={(reason) => form.setData('reason', reason)}
                error={form.errors.reason}
            />
            <div role="alert">
                {Object.entries(form.errors).map(([field, message]) => (
                    <InputError key={field} message={message} />
                ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={form.processing}
                >
                    Cancelar
                </Button>
                <Button
                    disabled={!volume || form.processing}
                    onClick={() =>
                        form.post(store.url(product.id), {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.setData({
                                    volume_id: 0,
                                    expected_version: 0,
                                    total_quantity: '',
                                    items: [],
                                    reason: '',
                                    idempotency_key: idempotencyKey(),
                                });
                                onOpenChange(false);
                            },
                        })
                    }
                >
                    {form.processing
                        ? 'Registrando...'
                        : 'Confirmar recontagem'}
                </Button>
            </div>
        </div>
    );
    const description =
        'Confira o conteúdo físico. A confirmação registra a diferença no histórico.';
    if (isMobile)
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[95dvh]">
                    <DrawerHeader>
                        <DrawerTitle>Recontar saco</DrawerTitle>
                        <DrawerDescription>{description}</DrawerDescription>
                    </DrawerHeader>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Recontar saco</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}
