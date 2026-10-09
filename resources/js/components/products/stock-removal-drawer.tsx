import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { store } from '@/actions/App/Http/Controllers/StockExitController';
import InputError from '@/components/input-error';
import { StockMovementReasonField } from '@/components/stock-movement-reason-field';
import { StockVolumeSelection } from '@/components/stock-volume-selection';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { idempotencyKey } from '@/lib/idempotency-key';
import type { Product } from '@/types';

const removalReasons = [
    'Saco adicionado por engano',
    'Registro duplicado',
    'Produto incorreto',
] as const;

export function StockRemovalDrawer({
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
        volume_ids: [] as number[],
        reason: removalReasons[0] as string,
        idempotency_key: `remove-${key}`,
    });
    const available = product.stock_volumes
        .filter((volume) => volume.can_recount && volume.total_quantity > 0)
        .map((volume) => ({
            id: volume.id,
            code: volume.code ?? `Saco ${volume.sort_order + 1}`,
            total_quantity: volume.total_quantity,
            product,
            sizes: volume.items.filter((item) => item.is_active),
        }));
    const selected = available.filter((volume) =>
        form.data.volume_ids.includes(volume.id),
    );
    const total = selected.reduce(
        (sum, volume) => sum + volume.total_quantity,
        0,
    );

    return (
        <Drawer
            open={open}
            direction={isMobile ? 'bottom' : 'right'}
            onOpenChange={(nextOpen) => {
                if (!form.processing) onOpenChange(nextOpen);
            }}
            dismissible={!form.processing}
        >
            <DrawerContent
                side={isMobile ? 'bottom' : 'right'}
                className="max-h-[95dvh]"
                data-testid="stock-removal-drawer"
            >
                <DrawerHeader>
                    <DrawerTitle>Excluir sacos</DrawerTitle>
                    <DrawerDescription>
                        Sacos de {product.name} cadastrados por engano. Eles
                        saem do estoque e a remoção fica no histórico.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-6 pb-5">
                    <p className="text-xs text-muted-foreground">
                        Reservados ou já baixados não aparecem. Até 50 por vez.
                    </p>
                    <StockVolumeSelection
                        showProduct={false}
                        volumes={available}
                        selectedIds={form.data.volume_ids}
                        disabled={form.processing}
                        onToggle={(id, checked) => {
                            form.clearErrors();
                            form.setData((data) => ({
                                ...data,
                                volume_ids: checked
                                    ? [...data.volume_ids, id]
                                    : data.volume_ids.filter(
                                          (value) => value !== id,
                                      ),
                            }));
                        }}
                    />
                    {available.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Não há sacos disponíveis para remover.
                        </p>
                    )}
                    <StockMovementReasonField
                        id="stock-removal-reason"
                        value={form.data.reason}
                        options={removalReasons}
                        onChange={(reason) => form.setData('reason', reason)}
                    />
                    <div role="alert">
                        {Object.entries(form.errors).map(([field, message]) => (
                            <InputError key={field} message={message} />
                        ))}
                    </div>
                </div>
                <DrawerFooter className="shrink-0 border-t pt-4">
                    <p className="text-sm font-medium" aria-live="polite">
                        {selected.length}{' '}
                        {selected.length === 1 ? 'saco' : 'sacos'}
                        {' · '}
                        {total} peças serão removidas do estoque.
                    </p>
                    <Button
                        disabled={
                            form.processing ||
                            selected.length === 0 ||
                            selected.length > 50 ||
                            !form.data.reason.trim()
                        }
                        onClick={() =>
                            form.post(store.url(), { preserveScroll: true })
                        }
                    >
                        {form.processing ? 'Removendo...' : 'Confirmar remoção'}
                    </Button>
                    <Button
                        variant="outline"
                        disabled={form.processing}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
