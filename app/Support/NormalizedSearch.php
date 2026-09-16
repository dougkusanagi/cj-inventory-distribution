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
        $replacements = [
            'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'õ' => 'o', 'ô' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c',
            'Á' => 'a', 'À' => 'a', 'Ã' => 'a', 'Â' => 'a', 'Ä' => 'a',
            'É' => 'e', 'È' => 'e', 'Ê' => 'e', 'Ë' => 'e',
            'Í' => 'i', 'Ì' => 'i', 'Î' => 'i', 'Ï' => 'i',
            'Ó' => 'o', 'Ò' => 'o', 'Õ' => 'o', 'Ô' => 'o', 'Ö' => 'o',
            'Ú' => 'u', 'Ù' => 'u', 'Û' => 'u', 'Ü' => 'u',
            'Ç' => 'c',
        ];

        foreach ($replacements as $from => $to) {
            $expression = "REPLACE({$expression}, '{$from}', '{$to}')";
        }

        return $expression;
    }
}
