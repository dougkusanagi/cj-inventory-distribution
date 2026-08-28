export type ProductVariant = {
    id?: number;
    size: string;
    sort_order?: number;
    is_active?: boolean;
    quantity?: number | null;
};

export type ProductImage = {
    id: number;
    url: string;
    thumb_url: string | null;
    name: string;
};

export type Product = {
    id: number;
    code: string;
    model: string | null;
    name: string;
    images: ProductImage[];
    notes: string | null;
    total_quantity?: number | null;
    variants: ProductVariant[];
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
