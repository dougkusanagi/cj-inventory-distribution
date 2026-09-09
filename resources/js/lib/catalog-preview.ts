// Dados ilustrativos exclusivos da prévia visual; não representam estoque real.
export type CatalogPreviewProduct = {
    id: number;
    name: string;
    code: string;
    model: string | null;
    category: string;
    line: 'Slim' | 'Plus';
    type: 'Reposição' | 'Grade Nova' | 'Grade Furada';
    volumes: { id: number; name: string; pieces: number; sizes: string[] }[];
};

export const catalogPreviewProducts: CatalogPreviewProduct[] = [
    {
        id: 1,
        name: 'Calça Wide Leg',
        code: 'CJ-000001',
        model: '2451',
        category: 'Calça',
        line: 'Slim',
        type: 'Reposição',
        volumes: [
            {
                id: 11,
                name: 'Saco 01',
                pieces: 20,
                sizes: ['34', '36', '38', '40', '42'],
            },
            {
                id: 12,
                name: 'Saco 02',
                pieces: 18,
                sizes: ['36', '38', '40', '42'],
            },
        ],
    },
    {
        id: 2,
        name: 'Bermuda Jeans',
        code: 'CJ-000002',
        model: '1820',
        category: 'Bermuda',
        line: 'Plus',
        type: 'Reposição',
        volumes: [
            {
                id: 21,
                name: 'Saco 01',
                pieces: 16,
                sizes: ['44', '46', '48', '50'],
            },
        ],
    },
    {
        id: 3,
        name: 'Short Mom',
        code: 'CJ-000003',
        model: '1938',
        category: 'Short',
        line: 'Slim',
        type: 'Grade Furada',
        volumes: [
            { id: 31, name: 'Saco 01', pieces: 12, sizes: ['36', '40', '42'] },
            { id: 32, name: 'Saco 02', pieces: 10, sizes: ['34', '38'] },
        ],
    },
    {
        id: 4,
        name: 'Cropped Jeans',
        code: 'CJ-000004',
        model: null,
        category: 'Cropped',
        line: 'Plus',
        type: 'Grade Furada',
        volumes: [
            { id: 41, name: 'Saco 01', pieces: 15, sizes: ['G', 'GG', '3G'] },
        ],
    },
    {
        id: 5,
        name: 'Calça Reta',
        code: 'CJ-000005',
        model: '3107',
        category: 'Calça',
        line: 'Plus',
        type: 'Reposição',
        volumes: [
            { id: 51, name: 'Saco 01', pieces: 18, sizes: ['44', '46', '48'] },
            { id: 52, name: 'Saco 02', pieces: 12, sizes: ['46', '48', '50'] },
        ],
    },
    {
        id: 6,
        name: 'Bermuda Ciclista',
        code: 'CJ-000006',
        model: '2040',
        category: 'Bermuda',
        line: 'Slim',
        type: 'Reposição',
        volumes: [
            {
                id: 61,
                name: 'Saco 01',
                pieces: 20,
                sizes: ['P', 'M', 'G', 'GG'],
            },
        ],
    },
    {
        id: 7,
        name: 'Produto interno de grade nova',
        code: 'CJ-000007',
        model: null,
        category: 'Calça',
        line: 'Slim',
        type: 'Grade Nova',
        volumes: [
            { id: 71, name: 'Saco 01', pieces: 20, sizes: ['36', '38', '40'] },
        ],
    },
];
