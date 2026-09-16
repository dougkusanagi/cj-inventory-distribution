<?php

namespace App\Actions\Orders;

use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Models\Order;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateOrder
{
    public function __construct(
        private readonly RecordOrderEvent $recordOrderEvent,
    ) {}

    /** @param array<string, mixed> $data */
    public function handle(array $data, ?User $actor = null): Order
    {
        $idempotencyKey = $this->idempotencyKey($data);
        $payloadHash = $this->payloadHash($data);

        try {
            return DB::transaction(function () use ($data, $actor, $idempotencyKey, $payloadHash): Order {
                if ($idempotencyKey !== null) {
                    $existingOrder = Order::query()
                        ->where('idempotency_key', $idempotencyKey)
                        ->lockForUpdate()
                        ->first();

                    if ($existingOrder !== null) {
                        return $this->resolveExistingOrder($existingOrder, $payloadHash);
                    }
                }

                $volumeIds = $this->volumeIds($data);

                if ($volumeIds->isEmpty()) {
                    throw ValidationException::withMessages([
                        'volume_ids' => 'Selecione pelo menos um saco.',
                    ]);
                }

                $volumes = StockOfferVolume::query()
                    ->whereKey($volumeIds)
                    ->with(['items', 'offer.product.category'])
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                // A concurrent request with the same key may have committed while
                // this request waited for one of the physical sacks.
                if ($idempotencyKey !== null) {
                    $existingOrder = Order::query()
                        ->where('idempotency_key', $idempotencyKey)
                        ->lockForUpdate()
                        ->first();

                    if ($existingOrder !== null) {
                        return $this->resolveExistingOrder($existingOrder, $payloadHash);
                    }
                }

                if ($volumes->count() !== $volumeIds->count() || $volumes->contains(fn (StockOfferVolume $volume): bool => ! $this->isAvailable($volume))) {
                    throw ValidationException::withMessages([
                        'volume_ids' => 'Um ou mais sacos não estão mais disponíveis. Atualize a seleção.',
                    ]);
                }

                $order = Order::create([
                    'code' => 'P-'.Str::random(18),
                    'store_name' => $data['store_name'],
                    'requester_name' => $data['requester_name'],
                    'whatsapp' => $data['whatsapp'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'status' => OrderStatus::Pending,
                    'submitted_at' => now(),
                    'idempotency_key' => $idempotencyKey,
                    'idempotency_payload_hash' => $payloadHash,
                ]);
                $order->updateQuietly(['code' => 'PED-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);

                foreach ($volumes as $volume) {
                    $volumeCode = $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT);
                    $volume->update(['code' => $volumeCode, 'current_order_id' => $order->id]);
                    $product = $volume->offer->product;

                    $order->items()->create([
                        'stock_offer_volume_id' => $volume->id,
                        'product_id' => $product->id,
                        'product_code_snapshot' => $product->code,
                        'product_name_snapshot' => $product->name,
                        'product_model_snapshot' => $product->model,
                        'category_snapshot' => $product->category?->name,
                        'line_snapshot' => $product->line?->value,
                        'offer_type_snapshot' => $volume->offer->type->value,
                        'volume_code_snapshot' => $volumeCode,
                        'total_quantity' => $volume->total_quantity,
                        'size_grid' => $volume->items->where('is_active', true)->map(fn ($item): array => [
                            'size' => $item->size,
                            'quantity' => $item->quantity,
                        ])->values()->all(),
                    ]);
                }

                $this->recordOrderEvent->handle(
                    $order,
                    OrderEventType::Created,
                    $actor,
                    null,
                    ['volume_ids' => $volumeIds->all()],
                );

                return $order->load('items');
            });
        } catch (QueryException $exception) {
            if ($idempotencyKey === null || ! $this->isIdempotencyUniqueViolation($exception)) {
                throw $exception;
            }

            $existingOrder = Order::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingOrder === null) {
                throw $exception;
            }

            return $this->resolveExistingOrder($existingOrder, $payloadHash);
        }
    }

    private function isAvailable(StockOfferVolume $volume): bool
    {
        return $volume->current_order_id === null
            && $volume->consumed_at === null
            && $volume->total_quantity > 0
            && $volume->offer->type !== StockOfferType::NewGrade
            && $volume->offer->product->is_active;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return Collection<int, int>
     */
    private function volumeIds(array $data): Collection
    {
        $volumeIds = $data['volume_ids'] ?? [];

        if (! is_array($volumeIds)) {
            throw ValidationException::withMessages([
                'volume_ids' => 'Selecione pelo menos um saco.',
            ]);
        }

        return collect($volumeIds)
            ->filter(fn (mixed $id): bool => is_numeric($id))
            ->map(fn (mixed $id): int => (int) $id)
            ->unique()
            ->sort()
            ->values();
    }

    /** @param array<string, mixed> $data */
    private function idempotencyKey(array $data): ?string
    {
        $key = $data['idempotency_key'] ?? null;

        return is_string($key) && trim($key) !== '' ? trim($key) : null;
    }

    /** @param array<string, mixed> $data */
    private function payloadHash(array $data): string
    {
        return hash('sha256', json_encode([
            'store_name' => $data['store_name'] ?? null,
            'requester_name' => $data['requester_name'] ?? null,
            'whatsapp' => $data['whatsapp'] ?? null,
            'notes' => $data['notes'] ?? null,
            'volume_ids' => $this->volumeIds($data)->all(),
        ], JSON_THROW_ON_ERROR));
    }

    private function resolveExistingOrder(Order $order, string $payloadHash): Order
    {
        if ($order->idempotency_payload_hash !== $payloadHash) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'A chave de idempotência já foi usada com outro pedido.',
            ]);
        }

        return $order->load('items');
    }

    private function isIdempotencyUniqueViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['23000', '23505'], true)
            && str_contains(strtolower($exception->getMessage()), 'idempotency');
    }
}
