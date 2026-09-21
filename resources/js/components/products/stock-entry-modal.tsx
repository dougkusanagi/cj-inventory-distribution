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
import { useIsMobile } from '@/hooks/use-mobile';
import type { Product } from '@/types';
import { StockEntryForm } from './stock-entry-form';

export function StockEntryModal({
    product,
    open,
    onOpenChange,
}: {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const isMobile = useIsMobile();
    const description = `Adicione os sacos recebidos para ${product.name}.`;
    const form = (
        <StockEntryForm
            key={open ? 'open' : 'closed'}
            fixedProduct={product}
            initialStockOfferType={product.stock_offer_type ?? 'replenishment'}
            returnToProduct
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
        />
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent
                    className="max-h-[95dvh]"
                    data-testid="stock-entry-drawer"
                >
                    <DrawerHeader>
                        <DrawerTitle>Registrar entrada</DrawerTitle>
                        <DrawerDescription>{description}</DrawerDescription>
                    </DrawerHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
                        {form}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-4xl"
                data-testid="stock-entry-dialog"
            >
                <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 sm:px-6 sm:py-5">
                    <DialogTitle>Registrar entrada</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    {form}
                </div>
            </DialogContent>
        </Dialog>
    );
}
