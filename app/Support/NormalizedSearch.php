<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

final class NormalizedSearch
{
    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @param  array<int, string>  $columns
     */
    public static function apply(Builder $query, string $term, array $columns): void
    {
        $needle = '%'.Str::lower(Str::ascii($term)).'%';

        $query->where(function (Builder $query) use ($columns, $needle): void {
            foreach ($columns as $index => $column) {
                $expression = self::normalizedColumn($column).' LIKE ?';

                if ($index === 0) {
                    $query->whereRaw($expression, [$needle]);
                } else {
                    $query->orWhereRaw($expression, [$needle]);
                }
            }
        });
    }

    /**
     * @return literal-string
     */
    private static function normalizedColumn(string $column): string
    {
        if (! in_array($column, ['name', 'model', 'code'], true)) {
            throw new \InvalidArgumentException('The column is not searchable.');
        }

        $expression = "LOWER({$column})";
        // SQLite has a shallow parser stack. Keep this portable expression
        // intentionally short: LOWER handles ASCII, while these pairs cover
        // the Portuguese characters that need an explicit normalization.
        $replacements = [
            'á' => 'a', 'Á' => 'a',
            'ã' => 'a', 'Ã' => 'a',
            'é' => 'e', 'É' => 'e',
            'í' => 'i', 'Í' => 'i',
            'ó' => 'o', 'Ó' => 'o',
            'õ' => 'o', 'Õ' => 'o',
            'ú' => 'u', 'Ú' => 'u',
            'ç' => 'c', 'Ç' => 'c',
        ];

        foreach ($replacements as $from => $to) {
            $expression = "REPLACE({$expression}, '{$from}', '{$to}')";
        }

        return $expression;
    }
}
