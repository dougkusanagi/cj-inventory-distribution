export type ProductImage = {
    id: number;
    url: string;
    thumb_url: string | null;
    name: string;
};

export type StockOfferType = 'replenishment' | 'new_grade' | 'broken_grade';

export type StockOfferVolumeItem = {
    id: number;
    size: string;
    sort_order: number;
    is_active: boolean;
    quantity: number | null;
};

export type StockOfferVolume = {
    id: number;
    sort_order: number;
    total_quantity: number;
    items: StockOfferVolumeItem[];
};

export type Product = {
    id: number;
    code: string;
    model: string | null;
    name: string;
    category_id: number | null;
    category: Category | null;
    line: ProductLine | null;
    is_active: boolean;
    images: ProductImage[];
    notes: string | null;
    has_stock_offer?: boolean;
    available_for_distribution?: boolean;
    distribution_status?: string;
    stock_offer_type?: StockOfferType | null;
    total_quantity?: number | null;
    stock_volume_count: number;
    stock_volumes: StockOfferVolume[];
    created_at: string | null;
    updated_at: string | null;
};

export type ProductLine = 'slim' | 'plus';

export type Category = {
    id: number;
    name: string;
    is_active: boolean;
    slug?: string;
    products_count?: number;
};

export type OrderStatus = 'pending' | 'completed' | 'canceled';

export type OrderItem = {
    id: number;
    product_code: string;
    product_name: string;
    product_model: string | null;
    category: string | null;
    line: ProductLine | null;
    offer_type: StockOfferType;
    volume_code: string;
    total_quantity: number;
    sizes: Array<{ size: string; quantity: number | null }>;
};

export type Order = {
    id: number;
    code: string;
    store_name: string;
    requester_name: string;
    whatsapp?: string | null;
    notes?: string | null;
    cancellation_reason?: string | null;
    status: OrderStatus;
    status_label: string;
    items_count: number;
    total_quantity: number;
    submitted_at: string;
    completed_at?: string | null;
    canceled_at?: string | null;
    items?: OrderItem[];
};

export type AvailableOrderVolume = {
    id: number;
    code: string;
    total_quantity: number;
    product: {
        code: string;
        name: string;
        model: string | null;
        category: string | null;
    };
    sizes: Array<{ size: string; quantity: number | null }>;
};

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginated<T> = {
    data: T[];
    links: PaginationLink[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
    };
};

export type DashboardStats = {
    total: number;
    withPhotos: number;
    withSizes: number;
    activeOffers: number;
    stockUnits: number;
};
