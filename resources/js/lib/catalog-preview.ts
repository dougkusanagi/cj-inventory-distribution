export type CatalogPreviewProduct = {
    id: number;
    name: string;
    code: string;
    model: string | null;
    image: string | null;
    images: string[];
    category: string;
    line: string;
    type: string;
    volumes: {
        id: number;
        name: string;
        pieces: number;
        sizes: { size: string; quantity: number | null }[];
    }[];
};
