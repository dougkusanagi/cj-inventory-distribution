<?php

namespace App\Actions\Stock;

use Closure;
use Illuminate\Support\Facades\DB;

class StockMutation
{
    /**
     * Serialize physical writes before reading stock, including on SQLite where
     * SELECT FOR UPDATE does not acquire a row lock. Nested actions share it.
     *
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public static function run(Closure $callback): mixed
    {
        return DB::transaction(function () use ($callback): mixed {
            DB::table('stock_mutation_lock')->where('id', 1)->update(['version' => 0]);

            return $callback();
        }, 5);
    }
}
