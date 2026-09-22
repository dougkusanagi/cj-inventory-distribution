<?php

namespace Database\Seeders;

use App\Actions\Orders\CancelOrder;
use App\Actions\Orders\CompleteOrder;
use App\Actions\Orders\CreateOrder;
use App\Actions\Orders\RecordOrderEvent;
use App\Actions\Orders\UpdateOrderItemProgress;
use App\Actions\Stock\CreateManualStockOut;
use App\Actions\Stock\OpenInitialStock;
use App\Enums\AuditAction;
use App\Enums\OrderEventType;
use App\Enums\OrderItemProgress;
use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Models\AuditLog;
use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;

class OperationalDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(
        CancelOrder $cancelOrder,
        CompleteOrder $completeOrder,
        CreateManualStockOut $createManualStockOut,
        CreateOrder $createOrder,
        OpenInitialStock $openInitialStock,
        RecordOrderEvent $recordOrderEvent,
        UpdateOrderItemProgress $updateOrderItemProgress,
    ): void {
        $actor = User::query()->where('email', 'test@example.com')->firstOrFail();
        $scenarios = $this->scenarios();
        $volumes = $this->demoVolumes($scenarios);
        $assignedVolumeIds = collect();

        foreach ($scenarios as $scenario) {
            $scenarioVolumes = $this->scenarioVolumes($volumes, $scenario);
            $assignedVolumeIds = $assignedVolumeIds->merge($this->volumeIds($scenarioVolumes));

            $this->seedOrderScenario(
                $scenario,
                $scenarioVolumes,
                $actor,
                $cancelOrder,
                $completeOrder,
                $createOrder,
                $recordOrderEvent,
                $updateOrderItemProgress,
            );
        }

        $this->seedStockMovementHistory(
            $volumes,
            $assignedVolumeIds->unique()->values(),
            $actor,
            $createManualStockOut,
            $openInitialStock,
        );

        $this->seedCatalogSetting();
        $this->seedAuditLog($actor);
    }

    /**
     * @return array<string, array{
     *     code: string,
     *     idempotency_key: string,
     *     store_name: string,
     *     requester_name: string,
     *     notes: string,
     *     status: OrderStatus,
     *     volume_keys: list<string>
     * }>
     */
    private function scenarios(): array
    {
        return [
            'pending' => [
                'code' => 'DEMO-PED-PENDING',
                'idempotency_key' => 'demo-order-pending',
                'store_name' => 'Loja demonstração Pending',
                'requester_name' => 'Equipe CJ',
                'notes' => 'Pedido pendente para testar separação e conferência.',
                'status' => OrderStatus::Pending,
                'volume_keys' => [
                    'DEMO-CJ-0001:0',
                    'DEMO-CJ-0002:0',
                ],
            ],
            'completed' => [
                'code' => 'DEMO-PED-COMPLETED',
                'idempotency_key' => 'demo-order-completed',
                'store_name' => 'Loja demonstração Completed',
                'requester_name' => 'Equipe CJ',
                'notes' => 'Pedido finalizado para testar baixa e histórico.',
                'status' => OrderStatus::Completed,
                'volume_keys' => [
                    'DEMO-CJ-0003:0',
                    'DEMO-CJ-0004:0',
                ],
            ],
            'canceled' => [
                'code' => 'DEMO-PED-CANCELED',
                'idempotency_key' => 'demo-order-canceled',
                'store_name' => 'Loja demonstração Canceled',
                'requester_name' => 'Equipe CJ',
                'notes' => 'Pedido cancelado para testar liberação e histórico.',
                'status' => OrderStatus::Canceled,
                'volume_keys' => [
                    'DEMO-CJ-0005:0',
                ],
            ],
        ];
    }

    /**
     * @param  array<string, array<string, mixed>>  $scenarios
     * @return Collection<string, StockOfferVolume>
     */
    private function demoVolumes(array $scenarios): Collection
    {
        $expectedKeys = collect($scenarios)
            ->flatMap(fn (array $scenario): array => $scenario['volume_keys'])
            ->unique()
            ->values()
            ->all();

        $volumes = StockOfferVolume::query()
            ->with(['items', 'offer.product.category'])
            ->whereHas('offer', fn (Builder $query) => $query->where('type', '!=', StockOfferType::NewGrade->value))
            ->whereHas('offer.product', fn (Builder $query) => $query->where('code', 'like', 'DEMO-CJ-%'))
            ->orderBy('id')
            ->get()
            ->keyBy(fn (StockOfferVolume $volume): string => $this->volumeKey($volume));

        $expectedKeys = collect($expectedKeys);

        if ($volumes->keys()->intersect($expectedKeys)->count() !== $expectedKeys->count()) {
            $missing = $expectedKeys->diff($volumes->keys())->implode(', ');

            throw new LogicException("Sacos demonstrativos ausentes: {$missing}");
        }

        return $volumes;
    }

    /**
     * @param  Collection<string, StockOfferVolume>  $volumes
     * @param  array{volume_keys: list<string>}  $scenario
     * @return Collection<int, StockOfferVolume>
     */
    private function scenarioVolumes(Collection $volumes, array $scenario): Collection
    {
        return collect($scenario['volume_keys'])
            ->map(function (string $key) use ($volumes): StockOfferVolume {
                $volume = $volumes->get($key);

                if ($volume === null) {
                    throw new LogicException("Saco demonstrativo ausente: {$key}");
                }

                return $volume;
            })
            ->values();
    }

    /**
     * @param  array{
     *     code: string,
     *     idempotency_key: string,
     *     store_name: string,
     *     requester_name: string,
     *     notes: string,
     *     status: OrderStatus,
     *     volume_keys: list<string>
     * }  $scenario
     * @param  Collection<int, StockOfferVolume>  $volumes
     */
    private function seedOrderScenario(
        array $scenario,
        Collection $volumes,
        User $actor,
        CancelOrder $cancelOrder,
        CompleteOrder $completeOrder,
        CreateOrder $createOrder,
        RecordOrderEvent $recordOrderEvent,
        UpdateOrderItemProgress $updateOrderItemProgress,
    ): void {
        $order = Order::query()->where('code', $scenario['code'])->first();

        if ($order !== null && $order->items()->exists()) {
            return;
        }

        if ($order === null) {
            $order = $createOrder->handle([
                'store_name' => $scenario['store_name'],
                'requester_name' => $scenario['requester_name'],
                'whatsapp' => '5511999999999',
                'notes' => $scenario['notes'],
                'volume_ids' => $this->volumeIds($volumes),
                'idempotency_key' => $scenario['idempotency_key'],
            ], $actor);

            $order->updateQuietly(['code' => $scenario['code']]);
        } else {
            $order = $this->repairEmptyDemoOrder($order, $scenario, $volumes, $actor, $recordOrderEvent);
        }

        $this->applyScenarioStatus(
            $order,
            $scenario['status'],
            $actor,
            $cancelOrder,
            $completeOrder,
            $updateOrderItemProgress,
        );
    }

    /**
     * Repair orders created by the previous incomplete seeder without changing
     * orders that already contain real items.
     *
     * @param  array{
     *     code: string,
     *     idempotency_key: string,
     *     store_name: string,
     *     requester_name: string,
     *     notes: string,
     *     status: OrderStatus,
     *     volume_keys: list<string>
     * }  $scenario
     * @param  Collection<int, StockOfferVolume>  $volumes
     */
    private function repairEmptyDemoOrder(
        Order $order,
        array $scenario,
        Collection $volumes,
        User $actor,
        RecordOrderEvent $recordOrderEvent,
    ): Order {
        return DB::transaction(function () use ($order, $scenario, $volumes, $actor, $recordOrderEvent): Order {
            $payloadHash = hash('sha256', json_encode([
                'store_name' => $scenario['store_name'],
                'requester_name' => $scenario['requester_name'],
                'whatsapp' => '5511999999999',
                'notes' => $scenario['notes'],
                'volume_ids' => $this->volumeIds($volumes),
            ], JSON_THROW_ON_ERROR));

            $order->forceFill([
                'idempotency_key' => $scenario['idempotency_key'],
                'idempotency_payload_hash' => $payloadHash,
                'store_name' => $scenario['store_name'],
                'requester_name' => $scenario['requester_name'],
                'whatsapp' => '5511999999999',
                'notes' => $scenario['notes'],
                'status' => OrderStatus::Pending,
                'cancellation_reason' => null,
                'submitted_at' => $order->submitted_at ?? now()->subDays(3),
                'completed_at' => null,
                'canceled_at' => null,
            ])->saveQuietly();

            foreach ($volumes as $volume) {
                if (($volume->current_order_id !== null && $volume->current_order_id !== $order->getKey())
                    || $volume->consumed_at !== null) {
                    throw new LogicException("O saco {$this->volumeKey($volume)} não está disponível para reparar o pedido demonstrativo.");
                }

                $volumeCode = $volume->code ?? 'SC-'.str_pad((string) $volume->getKey(), 6, '0', STR_PAD_LEFT);
                $volume->forceFill([
                    'code' => $volumeCode,
                    'current_order_id' => $order->getKey(),
                    'consumed_at' => null,
                ])->saveQuietly();

                $order->items()->create([
                    'stock_offer_volume_id' => $volume->getKey(),
                    'product_id' => $volume->offer->product->getKey(),
                    'product_code_snapshot' => $volume->offer->product->code,
                    'product_name_snapshot' => $volume->offer->product->name,
                    'product_model_snapshot' => $volume->offer->product->model,
                    'category_snapshot' => $volume->offer->product->category?->name,
                    'line_snapshot' => $volume->offer->product->line?->value,
                    'offer_type_snapshot' => $volume->offer->type->value,
                    'volume_code_snapshot' => $volumeCode,
                    'total_quantity' => $volume->total_quantity,
                    'size_grid' => $volume->items
                        ->where('is_active', true)
                        ->map(fn ($item): array => [
                            'size' => $item->size,
                            'quantity' => $item->quantity,
                        ])
                        ->values()
                        ->all(),
                ]);
            }

            if (! $order->events()->where('event', OrderEventType::Created)->exists()) {
                $recordOrderEvent->handle(
                    $order,
                    OrderEventType::Created,
                    $actor,
                    null,
                    ['volume_ids' => $this->volumeIds($volumes), 'seed' => true],
                );
            }

            return $order->fresh(['items']);
        });
    }

    private function applyScenarioStatus(
        Order $order,
        OrderStatus $status,
        User $actor,
        CancelOrder $cancelOrder,
        CompleteOrder $completeOrder,
        UpdateOrderItemProgress $updateOrderItemProgress,
    ): void {
        if ($status === OrderStatus::Pending) {
            return;
        }

        $order->load('items');

        if ($status === OrderStatus::Canceled) {
            $cancelOrder->handle($order, 'Cancelamento de demonstração.', $actor);

            return;
        }

        foreach ($order->items as $item) {
            $updateOrderItemProgress->handle($order, $item, OrderItemProgress::Separate, $actor);
            $updateOrderItemProgress->handle($order, $item, OrderItemProgress::Check, $actor);
        }

        $completeOrder->handle($order, $actor);
    }

    /**
     * Create one opening and one manual exit using the real stock actions so
     * the movement history also points to valid physical sacks.
     *
     * @param  Collection<string, StockOfferVolume>  $volumes
     * @param  Collection<int, int>  $assignedVolumeIds
     */
    private function seedStockMovementHistory(
        Collection $volumes,
        Collection $assignedVolumeIds,
        User $actor,
        CreateManualStockOut $createManualStockOut,
        OpenInitialStock $openInitialStock,
    ): void {
        $openingKey = 'demo-opening-real';
        $manualExitKey = 'demo-manual-exit-real';
        $eligibleVolumeIds = collect($this->volumeIds($volumes));

        if (! StockMovement::query()->where('idempotency_key', $openingKey)->exists()) {
            $openingVolume = $this->availableHistoryVolume($eligibleVolumeIds, $assignedVolumeIds);
            $openInitialStock->handle([$openingVolume->getKey()], $openingKey, $actor);
        }

        if (! StockMovement::query()->where('idempotency_key', $manualExitKey)->exists()) {
            $manualExitVolume = $this->availableHistoryVolume($eligibleVolumeIds, $assignedVolumeIds);
            $createManualStockOut->handle([
                'volume_ids' => [$manualExitVolume->getKey()],
                'reason' => 'Saída manual de demonstração.',
                'idempotency_key' => $manualExitKey,
            ], $actor);
        }
    }

    /**
     * @param  Collection<int, int>  $assignedVolumeIds
     * @param  Collection<int, int>  $eligibleVolumeIds
     */
    private function availableHistoryVolume(Collection $eligibleVolumeIds, Collection $assignedVolumeIds): StockOfferVolume
    {
        $volume = StockOfferVolume::query()
            ->whereIn('id', $eligibleVolumeIds)
            ->whereNotIn('id', $assignedVolumeIds)
            ->where('total_quantity', '>', 0)
            ->whereNull('current_order_id')
            ->whereNull('consumed_at')
            ->whereDoesntHave('stockMovementItems')
            ->orderBy('id')
            ->first();

        if ($volume === null) {
            throw new LogicException('Não há saco demonstrativo livre para o histórico de estoque.');
        }

        return $volume;
    }

    /**
     * @param  iterable<StockOfferVolume>  $volumes
     * @return list<int>
     */
    private function volumeIds(iterable $volumes): array
    {
        $ids = [];

        foreach ($volumes as $volume) {
            $ids[] = (int) $volume->getKey();
        }

        return $ids;
    }

    private function seedCatalogSetting(): void
    {
        CatalogSetting::query()->updateOrCreate(
            ['id' => 1],
            ['whatsapp_number' => '5511999999999'],
        );
    }

    private function seedAuditLog(User $actor): void
    {
        $product = Product::query()->where('code', 'DEMO-CJ-0001')->firstOrFail();

        foreach (AuditAction::cases() as $action) {
            AuditLog::query()->firstOrCreate(
                [
                    'auditable_type' => $product->getMorphClass(),
                    'auditable_id' => $product->getKey(),
                    'action' => $action,
                ],
                [
                    'actor_id' => $actor->getKey(),
                    'after' => ['name' => $product->name],
                    'context' => ['seed' => true],
                    'occurred_at' => now(),
                ],
            );
        }
    }

    private function volumeKey(StockOfferVolume $volume): string
    {
        return $volume->offer->product->code.':'.$volume->sort_order;
    }
}
