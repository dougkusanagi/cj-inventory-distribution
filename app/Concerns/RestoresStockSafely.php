<?php

namespace App\Concerns;

use App\Actions\Stock\StockMutation;
use App\Models\StockOfferVolume;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

trait RestoresStockSafely
{
    use SoftDeletes { restore as private restoreRecord; }

    public function restore(): bool
    {
        try {
            return StockMutation::run(function (): bool {
                $this->refresh();
                if ($this instanceof StockOfferVolume && ($this->current_order_id !== null
                    || ($this->consumed_at === null && $this->total_quantity > 0))) {
                    throw ValidationException::withMessages(['stock' => 'Regularize o estoque antes de restaurar este saco.']);
                }

                return (bool) $this->restoreRecord();
            });
        } catch (QueryException $exception) {
            if (! in_array((string) $exception->getCode(), ['23000', '23505'], true)) {
                throw $exception;
            }
            throw ValidationException::withMessages(['stock' => 'A restauração conflita com um registro ativo. Revise os tamanhos antes de restaurar.']);
        }
    }
}
