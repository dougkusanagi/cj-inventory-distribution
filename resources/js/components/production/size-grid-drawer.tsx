import { useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { updateSizes } from '@/actions/App/Http/Controllers/ProductionBatchController';
import InputError from '@/components/input-error';
import { keepFocusedInputVisible } from '@/components/production/scroll-focused-input';
import {
    SizeGridEditor,
    type BatchSize,
} from '@/components/production/size-grid-editor';
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

export function SizeGridDrawer({
    batch,
    maxQuantity,
    onClose,
}: {
    batch: {
        id: number;
        code: string;
        quantity: number;
        version: number;
        sizes: BatchSize[];
    };
    maxQuantity: number;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const { errors } = usePage().props;
    const form = useForm({
        version: batch.version,
        sizes: batch.sizes.map((item) => ({
            size: item.size,
            quantity: String(item.quantity),
        })),
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.put(updateSizes.url(batch.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }
    return (
        <Drawer
            open
            direction={mobile ? 'bottom' : 'right'}
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <DrawerContent side={mobile ? 'bottom' : 'right'}>
                <DrawerHeader>
                    <DrawerTitle>Grade de {batch.code}</DrawerTitle>
                    <DrawerDescription>
                        Informe os tamanhos de {batch.quantity} peças. Para
                        limpar a grade, remova todos os tamanhos.
                    </DrawerDescription>
                </DrawerHeader>
                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div
                        className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-6 pb-6"
                        onFocusCapture={keepFocusedInputVisible}
                    >
                        <SizeGridEditor
                            value={form.data.sizes}
                            onChange={(sizes) => form.setData('sizes', sizes)}
                            errors={errors}
                            disabled={form.processing}
                            maxQuantity={maxQuantity}
                        />
                        <InputError
                            message={form.errors.version ?? errors.batch}
                        />
                    </div>
                    <DrawerFooter className="shrink-0 border-t bg-background pt-4">
                        <Button
                            type="submit"
                            className="h-11"
                            disabled={form.processing}
                        >
                            {form.processing ? 'Salvando...' : 'Salvar grade'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11"
                            onClick={onClose}
                            disabled={form.processing}
                        >
                            Cancelar
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
