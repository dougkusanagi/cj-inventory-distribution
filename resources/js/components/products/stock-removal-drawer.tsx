import { StockAdjustmentModal } from '@/components/products/stock-adjustment-modal';
import type { Product } from '@/types';

export function StockRemovalDrawer(props: {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return <StockAdjustmentModal {...props} removeInitially />;
}
