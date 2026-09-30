import { PlusTee, SlimPlusTee, SlimTee } from '@/components/icons/shirt-fit';
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
        allIcon: SlimPlusTee,
        display: 'cards',
        options: lines.map((line) => ({
            ...line,
            icon:
                line.value === 'slim'
                    ? SlimTee
                    : line.value === 'plus'
                      ? PlusTee
                      : undefined,
        })),
    };
}
