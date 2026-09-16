export type CatalogPreviewProduct = {
    id: number;
    name: string;
    code: string;
    model: string | null;
    image: string | null;
    images: string[];
    category: string;
    category_id: number | null;
    line: string | null;
    type: string;
    volumes: {
        id: number;
        name: string;
        pieces: number;
        sizes: { size: string; quantity: number | null }[];
    }[];
};

export type CatalogPagination = {
    data: CatalogPreviewProduct[];
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    meta: {
        current_page: number;
        last_page: number;
        next_page_url: string | null;
        total: number;
    };
};

export type CatalogBagStatus = {
    unavailable_volume_ids: number[];
    products: CatalogPreviewProduct[];
};
