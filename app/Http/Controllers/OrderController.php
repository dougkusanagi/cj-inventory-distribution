<?php

namespace App\Http\Controllers;

use App\Actions\Orders\CancelOrder;
use App\Actions\Orders\CompleteOrder;
use App\Actions\Orders\CreateOrder;
use App\Actions\Orders\UpdateOrder;
use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Http\Requests\Orders\CancelOrderRequest;
use App\Http\Requests\Orders\StoreOrderRequest;
use App\Http\Requests\Orders\UpdateOrderRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function __construct(
        private readonly CreateOrder $createOrder,
        private readonly UpdateOrder $updateOrder,
        private readonly CancelOrder $cancelOrder,
        private readonly CompleteOrder $completeOrder,
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Order::class);
        $search = trim($request->string('search')->toString());
        $status = $request->string('status')->toString();

        $orders = Order::query()
            ->withCount('items')
            ->withSum('items', 'total_quantity')
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('store_name', 'like', "%{$search}%")
                    ->orWhere('requester_name', 'like', "%{$search}%");
            }))
            ->when(in_array($status, array_column(OrderStatus::cases(), 'value'), true), fn (Builder $query) => $query->where('status', $status))
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->latest('submitted_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order): array => $this->orderSummary($order));

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'filters' => ['search' => $search, 'status' => $status],
            'statuses' => $this->statuses(),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Order::class);

        return Inertia::render('orders/create', [
            'availableVolumes' => $this->availableVolumes(),
        ]);
    }

    public function store(StoreOrderRequest $request): RedirectResponse
    {
        Gate::authorize('create', Order::class);
        $order = $this->createOrder->handle($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pedido {$order->code} registrado."]);

        return to_route('orders.show', $order);
    }

    public function show(Order $order): Response
    {
        Gate::authorize('view', $order);
        $order->load('items');

        return Inertia::render('orders/show', [
            'order' => $this->orderDetails($order),
        ]);
    }

    public function edit(Order $order): Response
    {
        Gate::authorize('update', $order);
        $order->load('items');

        return Inertia::render('orders/edit', [
            'order' => $this->orderDetails($order),
        ]);
    }

    public function update(UpdateOrderRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $this->updateOrder->handle($order, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pedido atualizado.']);

        return to_route('orders.show', $order);
    }

    public function cancel(CancelOrderRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $this->cancelOrder->handle($order, $request->validated('reason'));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pedido cancelado e sacos liberados.']);

        return to_route('orders.show', $order);
    }

    public function complete(Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $this->completeOrder->handle($order);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pedido finalizado.']);

        return to_route('orders.show', $order);
    }

    /** @return array<int, array<string, mixed>> */
    private function availableVolumes(): array
    {
        return StockOfferVolume::query()
            ->whereNull('current_order_id')
            ->whereNull('consumed_at')
            ->where('total_quantity', '>', 0)
            ->whereHas('offer', fn (Builder $query) => $query
                ->where('is_active', true)
                ->where('type', '!=', StockOfferType::NewGrade->value)
                ->whereHas('product', fn (Builder $query) => $query->where('is_active', true)))
            ->with(['items', 'offer.product.category'])
            ->orderBy('id')
            ->get()
            ->map(fn (StockOfferVolume $volume): array => [
                'id' => $volume->id,
                'code' => $volume->code ?? 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT),
                'total_quantity' => $volume->total_quantity,
                'product' => [
                    'code' => $volume->offer->product->code,
                    'name' => $volume->offer->product->name,
                    'model' => $volume->offer->product->model,
                    'category' => $volume->offer->product->category?->name,
                ],
                'sizes' => $volume->items->where('is_active', true)->map(fn (StockOfferVolumeItem $item): array => [
                    'size' => $item->size,
                    'quantity' => $item->quantity,
                ])->values()->all(),
            ])->all();
    }

    /** @return array<string, mixed> */
    private function orderSummary(Order $order): array
    {
        return [
            'id' => $order->id,
            'code' => $order->code,
            'store_name' => $order->store_name,
            'requester_name' => $order->requester_name,
            'status' => $order->status->value,
            'status_label' => $order->status->label(),
            'items_count' => $order->items_count,
            'total_quantity' => (int) ($order->items_sum_total_quantity ?? 0),
            'submitted_at' => $order->submitted_at->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function orderDetails(Order $order): array
    {
        return [
            ...$this->orderSummary($order->loadCount('items')->loadSum('items', 'total_quantity')),
            'whatsapp' => $order->whatsapp,
            'notes' => $order->notes,
            'cancellation_reason' => $order->cancellation_reason,
            'completed_at' => $order->completed_at?->toISOString(),
            'canceled_at' => $order->canceled_at?->toISOString(),
            'items' => $order->items->map(fn (OrderItem $item): array => [
                'id' => $item->id,
                'product_code' => $item->product_code_snapshot,
                'product_name' => $item->product_name_snapshot,
                'product_model' => $item->product_model_snapshot,
                'category' => $item->category_snapshot,
                'line' => $item->line_snapshot,
                'offer_type' => $item->offer_type_snapshot,
                'volume_code' => $item->volume_code_snapshot,
                'total_quantity' => $item->total_quantity,
                'sizes' => $item->size_grid,
            ])->values()->all(),
        ];
    }

    /** @return array<int, array{value: string, label: string}> */
    private function statuses(): array
    {
        return array_map(fn (OrderStatus $status): array => [
            'value' => $status->value,
            'label' => $status->label(),
        ], OrderStatus::cases());
    }
}
