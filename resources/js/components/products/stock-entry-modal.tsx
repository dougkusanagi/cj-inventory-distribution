import { XIcon } from '@phosphor-icons/react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Product } from '@/types';
import { StockEntryForm, type BaggingBatch } from './stock-entry-form';

export function StockEntryModal({
    product,
    baggingBatches,
    open,
    onOpenChange,
}: {
    product: Product;
    baggingBatches: BaggingBatch[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const trigger = useRef<HTMLElement | null>(null);
    const side = useIsMobile() ? 'bottom' : 'right';

    return (
        <Drawer
            open={open}
            onOpenChange={onOpenChange}
            direction={side}
            autoFocus
        >
            <DrawerContent
                side={side}
                className={side === 'bottom' ? 'max-h-[95dvh]' : 'max-w-2xl'}
                onOpenAutoFocus={() => {
                    const active = document.activeElement;
                    trigger.current =
                        active instanceof HTMLElement ? active : null;
                }}
                onCloseAutoFocus={(event) => {
                    if (trigger.current?.isConnected) {
                        event.preventDefault();
                        trigger.current.focus();
                    }
                }}
                data-testid="stock-entry-drawer"
            >
                <DrawerClose asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4"
                        aria-label="Fechar entrada"
                    >
                        <XIcon weight="bold" />
                    </Button>
                </DrawerClose>
                <DrawerHeader className="pr-16">
                    <DrawerTitle>Registrar entrada</DrawerTitle>
                    <DrawerDescription>
                        Adicione os sacos recebidos para {product.name}.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-6">
                    <StockEntryForm
                        fixedProduct={product}
                        baggingBatches={baggingBatches}
                        returnToProduct
                        onCancel={() => onOpenChange(false)}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    );
}
