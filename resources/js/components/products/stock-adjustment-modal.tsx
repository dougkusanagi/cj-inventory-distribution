import { useForm } from '@inertiajs/react';
import { Eraser, Save } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import store from '@/actions/App/Http/Controllers/ProductStockAdjustmentController';
import InputError from '@/components/input-error';
import {
    StockMovementReasonField,
    stockAdjustmentReasons,
} from '@/components/stock-movement-reason-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Product } from '@/types';

type RecountItem = { id: number; is_active: boolean; quantity: string };
type RecountData = {
    volume_id: number;
    total_quantity: string;
    items: RecountItem[];
    reason: string;
    notes: string;
    idempotency_key: string;
};

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
    const [volumeId, setVolumeId] = useState('');
    const formId = useId().replace(/[^a-zA-Z0-9]/g, '');
    const form = useForm<RecountData>({
        volume_id: 0,
        total_quantity: '',
        items: [],
        reason: '',
        notes: '',
        idempotency_key: `recount-${formId}`,
    });
    const volume = product.stock_volumes.find(
        (candidate) => String(candidate.id) === volumeId,
    );
    const hasKnownQuantity = form.data.items.some(
        (item) => item.is_active && item.quantity !== '',
    );
    const calculatedTotal = form.data.items.reduce(
        (total, item) =>
            total +
            (item.is_active && item.quantity !== ''
                ? Number(item.quantity) || 0
                : 0),
        0,
    );
    const nextTotal = hasKnownQuantity
        ? calculatedTotal
        : Number(form.data.total_quantity);
    const changed =
        volume !== undefined &&
        Number.isFinite(nextTotal) &&
        (nextTotal !== volume.total_quantity ||
            form.data.items.some((item) => {
                const original = volume.items.find(
                    (candidate) => candidate.id === item.id,
                );
                return (
                    original?.is_active !== item.is_active ||
                    String(original?.quantity ?? '') !== item.quantity
                );
            }));

    useEffect(() => {
        if (!volume) return;
        form.setData((data) => ({
            ...data,
            volume_id: volume.id,
            total_quantity: String(volume.total_quantity),
            items: volume.items.map((item) => ({
                id: item.id,
                is_active: item.is_active,
                quantity: item.quantity === null ? '' : String(item.quantity),
            })),
        }));
        // The selected sack is the deliberate reset point for the recount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volumeId]);

    const updateItem = (id: number, update: Partial<RecountItem>) =>
        form.setData(
            'items',
            form.data.items.map((item) =>
                item.id === id ? { ...item, ...update } : item,
            ),
        );
    const close = () => !form.processing && onOpenChange(false);
    const content = (
        <div className="grid min-h-0 gap-5 overflow-y-auto px-4 pb-4 sm:px-0 sm:pb-0">
            <div className="grid gap-2">
                <Label>Saco</Label>
                <Select value={volumeId} onValueChange={setVolumeId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o saco" />
                    </SelectTrigger>
                    <SelectContent>
                        {product.stock_volumes.map((candidate) => (
                            <SelectItem
                                key={candidate.id}
                                value={String(candidate.id)}
                            >
                                Saco {candidate.sort_order + 1} ·{' '}
                                {candidate.total_quantity} peças
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={form.errors.volume_id} />
            </div>
            {volume && (
                <>
                    <div className="grid gap-2">
                        <div>
                            <Label>Quantidades por tamanho</Label>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Vazio significa contagem desconhecida; zero é
                                uma contagem conhecida.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            {volume.items.map((item) => {
                                const draft = form.data.items.find(
                                    (candidate) => candidate.id === item.id,
                                );
                                if (!draft) return null;
                                return (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-[minmax(0,1fr)_auto_7rem_auto] items-center gap-2 rounded-xl border border-border p-3"
                                    >
                                        <span className="font-semibold">
                                            {item.size}
                                        </span>
                                        <Switch
                                            checked={draft.is_active}
                                            onCheckedChange={(isActive) =>
                                                updateItem(item.id, {
                                                    is_active: isActive,
                                                    quantity: isActive
                                                        ? draft.quantity
                                                        : '',
                                                })
                                            }
                                            aria-label={`${draft.is_active ? 'Desativar' : 'Ativar'} tamanho ${item.size}`}
                                        />
                                        <Input
                                            type="number"
                                            min="0"
                                            inputMode="numeric"
                                            disabled={!draft.is_active}
                                            value={draft.quantity}
                                            onChange={(event) =>
                                                updateItem(item.id, {
                                                    quantity:
                                                        event.target.value,
                                                })
                                            }
                                            aria-label={`Quantidade do tamanho ${item.size}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={
                                                !draft.is_active ||
                                                draft.quantity === ''
                                            }
                                            onClick={() =>
                                                updateItem(item.id, {
                                                    quantity: '',
                                                })
                                            }
                                            aria-label={`Limpar quantidade do tamanho ${item.size}`}
                                        >
                                            <Eraser />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="recount-total">Total do saco</Label>
                        <Input
                            id="recount-total"
                            type="number"
                            min="0"
                            inputMode="numeric"
                            readOnly={hasKnownQuantity}
                            value={
                                hasKnownQuantity
                                    ? calculatedTotal
                                    : form.data.total_quantity
                            }
                            onChange={(event) =>
                                form.setData(
                                    'total_quantity',
                                    event.target.value,
                                )
                            }
                            className={
                                hasKnownQuantity
                                    ? 'cursor-not-allowed bg-muted/40'
                                    : ''
                            }
                        />
                        <p className="text-sm text-muted-foreground">
                            {hasKnownQuantity
                                ? 'O total é calculado pelas quantidades informadas nos tamanhos.'
                                : 'Como não há quantidades por tamanho, informe o total manual do saco.'}
                        </p>
                        <InputError message={form.errors.total_quantity} />
                    </div>
                </>
            )}
            <StockMovementReasonField
                id="recount-reason"
                value={form.data.reason}
                options={stockAdjustmentReasons}
                onChange={(reason) => form.setData('reason', reason)}
                error={form.errors.reason}
            />
            <div className="grid gap-2">
                <Label htmlFor="recount-notes">Observação (opcional)</Label>
                <Textarea
                    id="recount-notes"
                    value={form.data.notes}
                    onChange={(event) =>
                        form.setData('notes', event.target.value)
                    }
                />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={close}>
                    Cancelar
                </Button>
                <Button
                    type="button"
                    disabled={form.processing || !changed}
                    onClick={() =>
                        form.post(store.url(product.id), {
                            preserveScroll: true,
                            onSuccess: () => onOpenChange(false),
                        })
                    }
                >
                    <Save />
                    {form.processing
                        ? 'Registrando...'
                        : 'Confirmar recontagem'}
                </Button>
            </div>
        </div>
    );
    const title = 'Recontar saco';
    if (isMobile)
        return (
            <Drawer
                open={open}
                onOpenChange={(nextOpen) => !nextOpen && close()}
            >
                <DrawerContent className="max-h-[90dvh]">
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                        <DrawerDescription>
                            Confira todos os tamanhos antes de salvar.
                        </DrawerDescription>
                    </DrawerHeader>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Confira todos os tamanhos antes de salvar.
                    </DialogDescription>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}
