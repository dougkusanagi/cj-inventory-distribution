<?php

namespace App\Actions\Orders;

use App\Enums\OrderEventType;
use App\Enums\OrderItemProgress;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateOrderItemProgress
{
    public function __construct(
        private readonly RecordOrderEvent $recordOrderEvent,
    ) {}

    public function handle(
        Order $order,
        OrderItem $item,
        OrderItemProgress $progress,
        ?User $actor = null,
        ?string $reason = null,
    ): OrderItem {
        return DB::transaction(function () use ($order, $item, $progress, $actor, $reason): OrderItem {
            $lockedOrder = Order::query()
                ->whereKey($order->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->status !== OrderStatus::Pending) {
                throw ValidationException::withMessages([
                    'order' => 'A separação só pode ser alterada enquanto o pedido está pendente.',
                ]);
            }

            $lockedItem = OrderItem::query()
                ->whereKey($item->getKey())
                ->whereBelongsTo($lockedOrder)
                ->lockForUpdate()
                ->firstOrFail();

            $event = null;
            $eventReason = null;

            switch ($progress) {
                case OrderItemProgress::Separate:
                    if ($lockedItem->separated_at === null) {
                        $lockedItem->update([
                            'separated_at' => now(),
                            'separated_by' => $actor?->getKey(),
                        ]);
                        $event = OrderEventType::Separated;
                    }
                    break;

                case OrderItemProgress::UndoSeparation:
                    if ($lockedItem->separated_at !== null || $lockedItem->checked_at !== null) {
                        $lockedItem->update([
                            'separated_at' => null,
                            'separated_by' => null,
                            'checked_at' => null,
                            'checked_by' => null,
                        ]);
                        $event = OrderEventType::SeparationUndone;
                    }
                    break;

                case OrderItemProgress::Check:
                    if ($lockedItem->separated_at === null) {
                        throw ValidationException::withMessages([
                            'order_item' => 'Marque o saco como separado antes de conferi-lo.',
                        ]);
                    }

                    if ($this->hasOpenDivergence($lockedItem)) {
                        throw ValidationException::withMessages([
                            'order_item' => 'Resolva a divergência antes de conferir o saco.',
                        ]);
                    }

                    if ($lockedItem->checked_at === null) {
                        $lockedItem->update([
                            'checked_at' => now(),
                            'checked_by' => $actor?->getKey(),
                        ]);
                        $event = OrderEventType::Checked;
                    }
                    break;

                case OrderItemProgress::UndoCheck:
                    if ($lockedItem->checked_at !== null) {
                        $lockedItem->update([
                            'checked_at' => null,
                            'checked_by' => null,
                        ]);
                        $event = OrderEventType::CheckUndone;
                    }
                    break;

                case OrderItemProgress::ReportDivergence:
                    $eventReason = $this->requiredReason($reason);
                    $lockedItem->update([
                        'checked_at' => null,
                        'checked_by' => null,
                        'divergence_note' => $eventReason,
                        'divergence_reported_at' => now(),
                        'divergence_reported_by' => $actor?->getKey(),
                        'divergence_resolved_at' => null,
                        'divergence_resolved_by' => null,
                    ]);
                    $event = OrderEventType::DivergenceReported;
                    break;

                case OrderItemProgress::ResolveDivergence:
                    if (! $this->hasOpenDivergence($lockedItem)) {
                        throw ValidationException::withMessages([
                            'order_item' => 'Este saco não possui uma divergência aberta.',
                        ]);
                    }

                    $eventReason = $this->requiredReason($reason);
                    $lockedItem->update([
                        'divergence_resolved_at' => now(),
                        'divergence_resolved_by' => $actor?->getKey(),
                    ]);
                    $event = OrderEventType::DivergenceResolved;
                    break;
            }

            if ($event !== null) {
                $this->recordOrderEvent->handle(
                    $lockedOrder,
                    $event,
                    $actor,
                    $eventReason,
                    [
                        'order_item_id' => $lockedItem->getKey(),
                        'volume_code' => $lockedItem->volume_code_snapshot,
                    ],
                );
            }

            return $lockedItem->fresh();
        });
    }

    private function hasOpenDivergence(OrderItem $item): bool
    {
        return $item->divergence_note !== null && $item->divergence_resolved_at === null;
    }

    private function requiredReason(?string $reason): string
    {
        $reason = trim((string) $reason);

        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => 'Informe o motivo da divergência.',
            ]);
        }

        return $reason;
    }
}
