export type StockMovementType = 'in' | 'out';

export type StockMovementSource = 'manual' | 'order' | 'opening';

export type StockMovementSummary = {
    id: number;
    type: StockMovementType;
    type_label: string;
    source: StockMovementSource;
    source_label: string;
    actor: string | null;
    order_id?: number | null;
    order_code: string | null;
    items_count: number;
    total_quantity: number;
    occurred_at: string;
};

export type StockMovementState = {
    volume_id?: number;
    volume_code?: string;
    total_quantity?: number;
    current_order_id?: number | null;
    consumed_at?: string | null;
    sizes?: Array<{ size: string; quantity: number | null }>;
    product_id?: number | null;
    product_code?: string | null;
    offer_id?: number | null;
    offer_type?: string | null;
};

export type StockMovementItem = {
    id: number;
    volume_id: number | null;
    volume_available: boolean;
    product_id: number | null;
    product_available: boolean;
    volume_code: string;
    product_code: string | null;
    product_name: string | null;
    product_model: string | null;
    category: string | null;
    offer_type: string | null;
    total_quantity: number;
    sizes: Array<{ size: string; quantity: number | null }>;
    previous_state: StockMovementState | null;
    resulting_state: StockMovementState | null;
};

export type StockMovement = StockMovementSummary & {
    reason: string | null;
    notes: string | null;
    idempotency_key: string | null;
    occurred_at: string;
    reversal_of_id: number | null;
    reversal_id: number | null;
    order: { id: number; code: string; available: boolean } | null;
    items: StockMovementItem[];
};

export type StockMovementSummaryCards = {
    count: number;
    entries: number;
    exits: number;
    order_exits: number;
    manual_exits: number;
    reversals: number;
    quantity: number;
};

export type StockEntryProduct = {
    id: number;
    code: string;
    name: string;
    model: string | null;
    category: string | null;
};

export type StockExitVolume = {
    id: number;
    code: string;
    total_quantity: number;
    product: {
        code: string;
        name: string;
        model: string | null;
    };
    sizes: Array<{ size: string; quantity: number | null }>;
};
