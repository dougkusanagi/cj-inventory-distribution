<?php

namespace App\Actions\Stock;

use App\Models\StockOfferVolume;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StockRecount
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{items: array<int, array{id: int|null, size: string, is_active: bool, quantity: int|null}>, total_quantity: int}
     */
    public function normalize(StockOfferVolume $volume, array $items, mixed $total): array
    {
        Validator::make(['items' => $items, 'total_quantity' => $total], [
            'items' => ['present', 'array', 'max:50'],
            'items.*.id' => ['nullable', 'integer', 'min:1'],
            'items.*.size' => ['nullable', 'string', 'max:30'],
            'items.*.is_active' => ['required', 'boolean'],
            'items.*.quantity' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'total_quantity' => ['nullable', 'integer', 'min:0', 'max:50000000'],
        ])->validate();
        $existing = $volume->items->keyBy('id');
        $seenIds = [];
        $seenSizes = [];
        $normalized = [];
        foreach ($items as $item) {
            $id = isset($item['id']) ? (int) $item['id'] : null;
            if ($id !== null && (! $existing->has($id) || isset($seenIds[$id]))) {
                throw ValidationException::withMessages(['items' => 'Os tamanhos informados não pertencem a este saco ou estão repetidos.']);
            }
            $size = $id === null ? Str::squish((string) ($item['size'] ?? '')) : $existing->get($id)->size;
            $key = Str::lower($size);
            if ($size === '' || isset($seenSizes[$key])) {
                throw ValidationException::withMessages(['items' => 'Informe tamanhos diferentes e não vazios.']);
            }
            $seenSizes[$key] = true;
            if ($id !== null) {
                $seenIds[$id] = true;
            }
            $active = filter_var($item['is_active'], FILTER_VALIDATE_BOOLEAN);
            $normalized[] = ['id' => $id, 'size' => $size, 'is_active' => $active,
                'quantity' => $active && isset($item['quantity']) ? (int) $item['quantity'] : null];
        }
        if (count($seenIds) !== $existing->count()) {
            throw ValidationException::withMessages(['items' => 'Envie todos os tamanhos do saco. Desative os que não foram encontrados.']);
        }
        $known = collect($normalized)->filter(fn (array $item): bool => $item['is_active'] && $item['quantity'] !== null);
        if ($known->isEmpty() && $total === null) {
            throw ValidationException::withMessages(['total_quantity' => 'Informe o total quando não houver quantidades por tamanho.']);
        }

        return ['items' => $normalized, 'total_quantity' => $known->isNotEmpty() ? (int) $known->sum('quantity') : (int) $total];
    }
}
