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
