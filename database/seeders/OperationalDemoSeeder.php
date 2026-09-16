<?php

namespace Database\Seeders;

use App\Enums\AuditAction;
use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\AuditLog;
use App\Models\CatalogSetting;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Database\Seeder;

class OperationalDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $actor = User::query()->where('email', 'test@example.com')->firstOrFail();
        $product = Product::query()->where('code', 'DEMO-CJ-0001')->firstOrFail();
        $volume = StockOfferVolume::query()->with(['items', 'offer'])->firstOrFail();

        CatalogSetting::query()->updateOrCreate(['id' => 1], ['whatsapp_number' => '5511999999999']);

        $orders = collect(OrderStatus::cases())->mapWithKeys(function (OrderStatus $status) use ($actor): array {
            $order = Order::query()->firstOrCreate(
                ['code' => 'DEMO-PED-'.strtoupper($status->value)],
                [
                    'store_name' => 'Loja demonstração '.ucfirst($status->value),
                    'requester_name' => 'Equipe CJ',
                    'whatsapp' => '5511999999999',
                    'status' => $status,
                    'submitted_at' => now()->subDays(3),
                    'completed_at' => $status === OrderStatus::Completed ? now()->subDay() : null,
                    'canceled_at' => $status === OrderStatus::Canceled ? now()->subDay() : null,
                    'cancellation_reason' => $status === OrderStatus::Canceled ? 'Cancelamento de demonstração.' : null,
                ],
            );

            foreach (OrderEventType::cases() as $event) {
                OrderEvent::query()->firstOrCreate(
                    ['order_id' => $order->getKey(), 'event' => $event],
                    ['actor_id' => $actor->getKey(), 'reason' => 'Evento de demonstração.', 'metadata' => []],
                );
            }

            return [$status->value => $order];
        });

        foreach ([
            [StockMovementType::In, StockMovementSource::Opening, null],
            [StockMovementType::In, StockMovementSource::Manual, null],
            [StockMovementType::Out, StockMovementSource::Manual, null],
            [StockMovementType::Out, StockMovementSource::Order, $orders->get(OrderStatus::Completed->value)],
        ] as [$type, $source, $order]) {
            $movement = StockMovement::query()->firstOrCreate(
                ['idempotency_key' => 'demo-'.$source->value.'-'.$type->value],
                [
                    'type' => $type,
                    'source' => $source,
                    'actor_id' => $actor->getKey(),
                    'order_id' => $order?->getKey(),
                    'reason' => 'Movimentação de demonstração.',
                    'payload_hash' => hash('sha256', $source->value.$type->value),
                    'occurred_at' => now(),
                ],
            );

            StockMovementItem::query()->firstOrCreate(
                ['stock_movement_id' => $movement->getKey(), 'stock_offer_volume_id' => $volume->getKey()],
                [
                    'product_id' => $product->getKey(),
                    'stock_offer_id' => $volume->stock_offer_id,
                    'volume_code_snapshot' => $volume->code ?? 'SC-'.str_pad((string) $volume->getKey(), 6, '0', STR_PAD_LEFT),
                    'product_code_snapshot' => $product->code,
                    'product_name_snapshot' => $product->name,
                    'product_model_snapshot' => $product->model,
                    'offer_type_snapshot' => $volume->offer->type->value,
                    'total_quantity' => $volume->total_quantity,
                    'size_grid_snapshot' => $volume->items->map(fn ($item): array => ['size' => $item->size, 'quantity' => $item->quantity])->all(),
                ],
            );
        }

        foreach (AuditAction::cases() as $action) {
            AuditLog::query()->firstOrCreate(
                ['auditable_type' => $product->getMorphClass(), 'auditable_id' => $product->getKey(), 'action' => $action],
                ['actor_id' => $actor->getKey(), 'after' => ['name' => $product->name], 'context' => ['seed' => true], 'occurred_at' => now()],
            );
        }
    }
}
