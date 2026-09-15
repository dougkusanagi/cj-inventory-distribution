<?php

namespace App\Http\Controllers;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockMovementItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', StockMovement::class);

        $type = $request->string('type')->toString();
        $source = $request->string('source')->toString();
        $search = trim($request->string('search')->toString());
        $from = $this->date($request->string('from')->toString());
        $to = $this->date($request->string('to')->toString());
        $actorId = $request->integer('actor');
        $productId = $request->integer('product');
        $sort = in_array($request->string('sort')->toString(), ['oldest', 'newest'], true)
            ? $request->string('sort')->toString()
            : 'newest';
        $query = $this->filteredQuery(
            $type,
            $source,
            $search,
            $from,
            $to,
            $actorId > 0 ? $actorId : null,
            $productId > 0 ? $productId : null,
        );

        $movementIds = (clone $query)
            ->reorder()
            ->select('stock_movements.id');
        $movements = $query
            ->orderBy('occurred_at', $sort === 'oldest' ? 'asc' : 'desc')
            ->orderBy('id', $sort === 'oldest' ? 'asc' : 'desc')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (StockMovement $movement): array => $this->summary($movement));

        return Inertia::render('stock-movements/index', [
            'movements' => $movements,
            'filters' => [
                'type' => $type,
                'source' => $source,
                'search' => $search,
                'from' => $request->string('from')->toString(),
                'to' => $request->string('to')->toString(),
                'actor' => $actorId > 0 ? $actorId : null,
                'product' => $productId > 0 ? $productId : null,
                'sort' => $sort,
                'has_filters' => $type !== ''
                    || $source !== ''
                    || $search !== ''
                    || $request->string('from')->toString() !== ''
                    || $request->string('to')->toString() !== ''
                    || $actorId > 0
                    || $productId > 0,
            ],
            'types' => array_map(fn (StockMovementType $movementType): array => [
                'value' => $movementType->value,
                'label' => $movementType->label(),
            ], StockMovementType::cases()),
            'sources' => array_map(fn (StockMovementSource $movementSource): array => [
                'value' => $movementSource->value,
                'label' => $movementSource->label(),
            ], StockMovementSource::cases()),
            'products' => Product::withTrashed()
                ->whereIn(
                    'id',
                    StockMovementItem::query()
                        ->whereNotNull('product_id')
                        ->select('product_id')
                        ->distinct(),
                )
                ->orderBy('name')
                ->get(['id', 'code', 'name'])
                ->map(fn (Product $product): array => [
                    'id' => $product->id,
                    'label' => $product->code.' · '.$product->name,
                ])
                ->values()
                ->all(),
            'actors' => User::withTrashed()
                ->whereIn(
                    'id',
                    StockMovement::query()
                        ->whereNotNull('actor_id')
                        ->select('actor_id')
                        ->distinct(),
                )
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'label' => $user->name,
                ])
                ->values()
                ->all(),
            'summary' => [
                'count' => (clone $query)->count(),
                'entries' => (clone $query)->where('type', StockMovementType::In->value)->count(),
                'exits' => (clone $query)->where('type', StockMovementType::Out->value)->count(),
                'order_exits' => (clone $query)
                    ->where('type', StockMovementType::Out->value)
                    ->where('source', StockMovementSource::Order->value)
                    ->count(),
                'manual_exits' => (clone $query)
                    ->where('type', StockMovementType::Out->value)
                    ->where('source', StockMovementSource::Manual->value)
                    ->whereNull('reversal_of_id')
                    ->count(),
                'reversals' => (clone $query)->whereNotNull('reversal_of_id')->count(),
                'quantity' => (int) StockMovementItem::query()
                    ->whereIn('stock_movement_id', $movementIds)
                    ->sum('total_quantity'),
            ],
        ]);
    }

    public function show(StockMovement $movement): Response
    {
        Gate::authorize('view', $movement);
        $movement->load([
            'actor',
            'order',
            'reversalOf',
            'reversals',
            'items',
            'items.product',
            'items.volume',
        ]);

        return Inertia::render('stock-movements/show', [
            'movement' => [
                ...$this->summary($movement),
                'reason' => $movement->reason,
                'notes' => $movement->notes,
                'idempotency_key' => $movement->idempotency_key,
                'occurred_at' => $movement->occurred_at->toISOString(),
                'order' => $movement->order === null ? null : [
                    'id' => $movement->order->id,
                    'code' => $movement->order->code,
                    'available' => ! $movement->order->trashed(),
                ],
                'reversal_of_id' => $movement->reversal_of_id,
                'reversal_id' => $movement->reversals->first()?->id,
                'items' => $movement->items->map(fn (StockMovementItem $item): array => [
                    'id' => $item->id,
                    'volume_id' => $item->stock_offer_volume_id,
                    'volume_available' => $item->volume !== null && ! $item->volume->trashed(),
                    'product_id' => $item->product_id,
                    'product_available' => $item->product !== null && ! $item->product->trashed(),
                    'volume_code' => $item->volume_code_snapshot,
                    'product_code' => $item->product_code_snapshot,
                    'product_name' => $item->product_name_snapshot,
                    'product_model' => $item->product_model_snapshot,
                    'category' => $item->category_snapshot,
                    'offer_type' => $item->offer_type_snapshot,
                    'total_quantity' => $item->total_quantity,
                    'sizes' => $item->size_grid_snapshot ?? [],
                    'previous_state' => $item->previous_state,
                    'resulting_state' => $item->resulting_state,
                ])->values()->all(),
            ],
        ]);
    }

    /** @return Builder<StockMovement> */
    private function filteredQuery(
        string $type,
        string $source,
        string $search,
        ?Carbon $from,
        ?Carbon $to,
        ?int $actorId,
        ?int $productId,
    ): Builder {
        return StockMovement::query()
            ->with(['actor:id,name', 'order:id,code'])
            ->withCount('items')
            ->withSum('items', 'total_quantity')
            ->when(in_array($type, array_column(StockMovementType::cases(), 'value'), true), fn (Builder $query) => $query->where('type', $type))
            ->when(in_array($source, array_column(StockMovementSource::cases(), 'value'), true), fn (Builder $query) => $query->where('source', $source))
            ->when($actorId !== null, fn (Builder $query) => $query->where('actor_id', $actorId))
            ->when($productId !== null, fn (Builder $query) => $query->whereHas('items', fn (Builder $query) => $query->where('product_id', $productId)))
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $query->where('reason', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('actor', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('order', fn (Builder $query) => $query->where('code', 'like', "%{$search}%"))
                    ->orWhereHas('items', fn (Builder $query) => $query
                        ->where('volume_code_snapshot', 'like', "%{$search}%")
                        ->orWhere('product_code_snapshot', 'like', "%{$search}%")
                        ->orWhere('product_name_snapshot', 'like', "%{$search}%")
                        ->orWhere('product_model_snapshot', 'like', "%{$search}%"));
            }))
            ->when($from !== null, fn (Builder $query) => $query->where('occurred_at', '>=', $from->startOfDay()))
            ->when($to !== null, fn (Builder $query) => $query->where('occurred_at', '<=', $to->endOfDay()));
    }

    /** @return array<string, mixed> */
    private function summary(StockMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'type' => $movement->type->value,
            'type_label' => $movement->type->label(),
            'source' => $movement->source->value,
            'source_label' => $movement->source->label(),
            'actor' => $movement->actor?->name,
            'order_code' => $movement->order?->code,
            'order_id' => $movement->order_id,
            'items_count' => (int) ($movement->items_count ?? $movement->items->count()),
            'total_quantity' => (int) ($movement->items_sum_total_quantity ?? ($movement->relationLoaded('items') ? $movement->items->sum('total_quantity') : 0)),
            'occurred_at' => $movement->occurred_at->toISOString(),
        ];
    }

    private function date(string $value): ?Carbon
    {
        if ($value === '') {
            return null;
        }

        try {
            return Carbon::createFromFormat('!Y-m-d', $value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
