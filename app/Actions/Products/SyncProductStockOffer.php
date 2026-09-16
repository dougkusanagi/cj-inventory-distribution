<?php

namespace App\Actions\Products;

use App\Actions\Stock\CreateStockEntry;
use App\Actions\Stock\StockMutation;
use App\Models\Product;
use App\Models\StockOffer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SyncProductStockOffer
{
    /** @param array<string, mixed> $data */
    public function handle(Product $product, array $data): ?StockOffer
    {
        return StockMutation::run(function () use ($product, $data): ?StockOffer {
            $offer = $product->offers()->latest('id')->first();
            if (! array_key_exists('stock_volumes', $data)) {
                return $offer;
            }
            $submitted = $data['stock_volumes'] ?? [];
            if ($product->wasRecentlyCreated) {
                if ($submitted === []) {
                    return null;
                }
                $movement = app(CreateStockEntry::class)->handle($product, [
                    ...$data, 'notes' => null, 'reason' => 'Estoque inicial confirmado no cadastro do produto',
                    'idempotency_key' => 'product-opening:'.Str::uuid(),
                ], Auth::user(), allowZero: true);

                return $product->offers()->find($movement->items->first()->stock_offer_id);
            }
            // A product can have physical sacks from more than one offer. The
            // product form renders all of them in read-only mode, so compare
            // against the complete persisted set instead of only the latest
            // offer. Otherwise merely editing product information would reject
            // older sacks as if they had been created in the form.
            $stored = $product->offers()
                ->with('stockVolumes.items')
                ->get()
                ->flatMap(fn (StockOffer $stockOffer) => $stockOffer->stockVolumes)
                ->keyBy('id');
            if ($submitted === [] && $stored->isNotEmpty()) {
                if ($stored->contains(fn ($volume) => $volume->orderItems()->exists())) {
                    throw ValidationException::withMessages(['stock_volumes' => 'Sacos vinculados a pedidos não podem ser removidos.']);
                }
                throw ValidationException::withMessages(['stock_volumes' => 'Sacos com estoque disponível ou reservado não podem ser removidos. Registre a saída ou zere o estoque do saco antes de removê-lo.']);
            }
            foreach ($submitted as $raw) {
                if (! is_array($raw)) {
                    throw ValidationException::withMessages(['stock_volumes' => 'Envie os sacos em uma lista válida.']);
                }

                $volume = $stored->get($raw['id'] ?? null);
                if ($volume === null) {
                    throw ValidationException::withMessages(['stock_volumes' => 'Registre novos sacos pela entrada de estoque.']);
                }
                $rawItems = $raw['items'] ?? [];
                if (! is_array($rawItems)) {
                    throw ValidationException::withMessages(['stock_volumes' => 'Envie os tamanhos do saco em uma lista válida.']);
                }
                $items = [];
                foreach ($rawItems as $rawItem) {
                    if (! is_array($rawItem)) {
                        throw ValidationException::withMessages(['stock_volumes' => 'Envie os tamanhos do saco em uma lista válida.']);
                    }
                    $isActive = (bool) ($rawItem['is_active'] ?? false);
                    $items[] = [
                        'size' => trim((string) ($rawItem['size'] ?? '')),
                        'is_active' => $isActive,
                        'quantity' => $isActive && isset($rawItem['quantity']) ? (int) $rawItem['quantity'] : null,
                    ];
                }
                $items = collect($items);
                $known = $items->filter(fn (array $item): bool => $item['is_active'] && $item['quantity'] !== null);
                $total = $known->isEmpty() ? (int) ($raw['total_quantity'] ?? 0) : (int) $known->sum('quantity');
                $original = $volume->items->map(fn ($item): array => $item->only(['size', 'is_active', 'quantity']))->values();
                if ($volume->total_quantity !== $total || $original->all() !== $items->all()) {
                    throw ValidationException::withMessages(['stock_volumes' => $volume->stockMovementItems()->exists()
                        ? 'Sacos já confirmados em movimentações não podem ser alterados pelo cadastro do produto.'
                        : 'Use a recontagem para alterar o conteúdo dos sacos.']);
                }
            }
            if (count($submitted) !== $stored->count()) {
                throw ValidationException::withMessages(['stock_volumes' => 'Use a saída ou a recontagem para alterar o estoque.']);
            }
            if ($offer && isset($data['stock_offer_type']) && $offer->type->value !== $data['stock_offer_type']) {
                throw ValidationException::withMessages(['stock_offer_type' => 'A classificação do estoque é definida na entrada.']);
            }

            return $offer;
        });
    }
}
