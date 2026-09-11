<?php

namespace App\Http\Controllers;

use App\Actions\Orders\BuildOrderWhatsAppUrl;
use App\Actions\Orders\CancelOrder;
use App\Actions\Orders\CompleteOrder;
use App\Actions\Orders\CreateOrder;
use App\Actions\Orders\UpdateOrder;
use App\Actions\Orders\UpdateOrderItemProgress;
use App\Enums\OrderItemProgress;
use App\Enums\OrderStatus;
use App\Enums\StockOfferType;
use App\Http\Requests\Orders\CancelOrderRequest;
use App\Http\Requests\Orders\CompleteOrderRequest;
use App\Http\Requests\Orders\OrderItemProgressRequest;
use App\Http\Requests\Orders\ReportOrderItemDivergenceRequest;
use App\Http\Requests\Orders\ResolveOrderItemDivergenceRequest;
use App\Http\Requests\Orders\StoreOrderRequest;
use App\Http\Requests\Orders\UpdateOrderRequest;
use App\Models\CatalogSetting;
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
        private readonly BuildOrderWhatsAppUrl $buildOrderWhatsAppUrl,
        private readonly UpdateOrderItemProgress $updateOrderItemProgress,
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Order::class);
        $search = trim($request->string('search')->toString());
        $status = $request->string('status')->toString();

        $orders = Order::query()
            ->withCount('items')
            ->withCount([
                'items as separated_items_count' => fn (Builder $query) => $query->whereNotNull('separated_at'),
                'items as checked_items_count' => fn (Builder $query) => $query->whereNotNull('checked_at'),
                'items as open_divergences_count' => fn (Builder $query) => $query
                    ->whereNotNull('divergence_note')
                    ->whereNull('divergence_resolved_at'),
            ])
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
        $order = $this->createOrder->handle($request->validated(), $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pedido {$order->code} registrado."]);

        return to_route('orders.show', $order);
    }

    public function show(Order $order): Response
    {
        Gate::authorize('view', $order);
        $order->load(['items', 'events.actor']);

        return Inertia::render('orders/show', [
            'order' => $this->orderDetails($order),
        ]);
    }

    public function edit(Order $order): Response
    {
        Gate::authorize('update', $order);
        $order->load(['items', 'events.actor']);

        return Inertia::render('orders/edit', [
            'order' => $this->orderDetails($order),
        ]);
    }

    public function update(UpdateOrderRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $this->updateOrder->handle($order, $request->validated(), $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pedido atualizado.']);

        return to_route('orders.show', $order);
    }

    public function cancel(CancelOrderRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $this->cancelOrder->handle($order, $request->string('reason')->toString(), $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pedido cancelado e sacos liberados.']);

        return to_route('orders.show', $order);
    }

    public function complete(CompleteOrderRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $this->completeOrder->handle($order, $request->boolean('whatsapp_opened'), $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pedido finalizado.']);

        return to_route('orders.show', $order);
    }

    public function separate(
        OrderItemProgressRequest $request,
        Order $order,
        OrderItem $item,
    ): RedirectResponse {
        return $this->updateProgress($request, $order, $item, OrderItemProgress::Separate);
    }

    public function undoSeparation(
        OrderItemProgressRequest $request,
        Order $order,
        OrderItem $item,
    ): RedirectResponse {
        return $this->updateProgress($request, $order, $item, OrderItemProgress::UndoSeparation);
    }

    public function check(
        OrderItemProgressRequest $request,
        Order $order,
        OrderItem $item,
    ): RedirectResponse {
        return $this->updateProgress($request, $order, $item, OrderItemProgress::Check);
    }

    public function undoCheck(
        OrderItemProgressRequest $request,
        Order $order,
        OrderItem $item,
    ): RedirectResponse {
        return $this->updateProgress($request, $order, $item, OrderItemProgress::UndoCheck);
    }

    public function reportDivergence(
        ReportOrderItemDivergenceRequest $request,
        Order $order,
        OrderItem $item,
    ): RedirectResponse {
        return $this->updateProgress(
            $request,
            $order,
            $item,
            OrderItemProgress::ReportDivergence,
            $request->string('reason')->toString(),
        );
    }

    public function resolveDivergence(
        ResolveOrderItemDivergenceRequest $request,
        Order $order,
        OrderItem $item,
    ): RedirectResponse {
        return $this->updateProgress(
            $request,
            $order,
            $item,
            OrderItemProgress::ResolveDivergence,
            $request->string('reason')->toString(),
        );
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
        $items = $order->relationLoaded('items') ? $order->items : null;

        return [
            'id' => $order->id,
            'code' => $order->code,
            'store_name' => $order->store_name,
            'requester_name' => $order->requester_name,
            'status' => $order->status->value,
            'status_label' => $order->status->label(),
            'items_count' => $order->items_count,
            'total_quantity' => (int) ($order->items_sum_total_quantity ?? 0),
            'progress' => [
                'separated' => $items !== null
                    ? $items->whereNotNull('separated_at')->count()
                    : (int) ($order->separated_items_count ?? 0),
                'checked' => $items !== null
                    ? $items->whereNotNull('checked_at')->count()
                    : (int) ($order->checked_items_count ?? 0),
                'divergences' => $items !== null
                    ? $items->filter(fn (OrderItem $item): bool => $item->divergence_note !== null
                        && $item->divergence_resolved_at === null)->count()
                    : (int) ($order->open_divergences_count ?? 0),
            ],
            'submitted_at' => $order->submitted_at->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function orderDetails(Order $order): array
    {
        $destination = CatalogSetting::query()->value('whatsapp_number');

        return [
            ...$this->orderSummary($order->loadCount('items')->loadSum('items', 'total_quantity')),
            'whatsapp' => $order->whatsapp,
            'whatsapp_url' => is_string($destination) && $destination !== ''
                ? $this->buildOrderWhatsAppUrl->handle($order, $destination)
                : null,
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
                'separated_at' => $item->separated_at?->toISOString(),
                'checked_at' => $item->checked_at?->toISOString(),
                'divergence_note' => $item->divergence_note,
                'divergence_resolved_at' => $item->divergence_resolved_at?->toISOString(),
            ])->values()->all(),
            'events' => $order->events->map(fn ($event): array => [
                'id' => $event->id,
                'event' => $event->event->value,
                'event_label' => $event->event->label(),
                'reason' => $event->reason,
                'actor' => $event->actor?->name,
                'created_at' => $event->created_at->toISOString(),
            ])->values()->all(),
        ];
    }

    private function updateProgress(
        OrderItemProgressRequest|ReportOrderItemDivergenceRequest|ResolveOrderItemDivergenceRequest $request,
        Order $order,
        OrderItem $item,
        OrderItemProgress $progress,
        ?string $reason = null,
    ): RedirectResponse {
        Gate::authorize('update', $order);
        $this->updateOrderItemProgress->handle($order, $item, $progress, $request->user(), $reason);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Progresso do pedido atualizado.']);

        return back();
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
