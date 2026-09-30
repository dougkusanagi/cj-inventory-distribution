import { Shirt } from 'lucide-react';
import { PlusShirt, SlimShirt } from '@/components/icons/shirt-fit';
import type { FilterField } from '@/components/search-filter-bar';

export function categoryFilterField(
    value: string,
    categories: Array<{ id: number; name: string }>,
): FilterField {
    return {
        name: 'category',
        label: 'Categoria',
        value,
        allLabel: 'Todas as categorias',
        display: 'combobox',
        options: categories.map((category) => ({
            value: category.id.toString(),
            label: category.name,
        })),
    };
}

export function lineFilterField(
    value: string,
    lines: Array<{ value: string; label: string }>,
): FilterField {
    return {
        name: 'line',
        label: 'Linha comercial',
        value,
        allLabel: 'Slim e Plus',
        allIcon: Shirt,
        display: 'cards',
        options: lines.map((line) => ({
            ...line,
            icon:
                line.value === 'slim'
                    ? SlimShirt
                    : line.value === 'plus'
                      ? PlusShirt
                      : undefined,
        })),
    };
}
