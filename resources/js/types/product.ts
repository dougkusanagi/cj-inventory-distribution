export type ProductVariant = {
    id?: number;
    size: string;
    sort_order?: number;
    is_active?: boolean;
    quantity?: number | null;
};

export type Product = {
    id: number;
    code: string;
    model: string | null;
    name: string;
    image_url: string | null;
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

export type ProductStats = {
    total: number;
    withPhotos: number;
    withSizes: number;
};
