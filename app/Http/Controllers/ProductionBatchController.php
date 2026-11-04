<?php

namespace App\Http\Controllers;

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\ProductionBatchEvent;
use App\Models\Workshop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductionBatchController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ProductionBatch::class);
        $user = $request->user();
        $allowedStages = $user->isAdmin()
            ? array_column(ProductionStage::cases(), 'value')
            : $user->productionStages()->pluck('stage')->all();
        $filters = $request->validate([
            'product' => ['nullable', 'integer'],
            'stage' => ['nullable', Rule::enum(ProductionStage::class)],
        ]);
        $query = ProductionBatch::query()->whereNull('split_at')->whereIn('stage', $allowedStages)
            ->with(['product:id,name,code,model,deleted_at', 'workshop:id,name,deleted_at', 'items', 'events.actor:id,name,deleted_at', 'parent.events.actor:id,name,deleted_at']);
        $summary = (clone $query)->selectRaw('stage, count(*) as batches, sum(quantity) as pieces')->groupBy('stage')->toBase()->get()->keyBy('stage');
        $awaiting = (clone $query)->whereNull('received_at')->selectRaw('stage, count(*) as batches, sum(quantity) as pieces')->groupBy('stage')->toBase()->get()->keyBy('stage');
        $visibleProductIds = (clone $query)->select('product_id')->distinct()->pluck('product_id');
        $filterProducts = Product::withTrashed()->whereIn('id', $visibleProductIds)->orderBy('name')->get(['id', 'name']);
        $batches = $query->when($filters['product'] ?? null, fn ($query, $product) => $query->where('product_id', $product))
            ->when($filters['stage'] ?? null, fn ($query, $stage) => $query->where('stage', $stage))
            ->orderBy('stage_entered_at')->orderBy('id')->get();

        return Inertia::render('production/index', [
            'stages' => collect(ProductionStage::cases())->filter(fn (ProductionStage $stage): bool => in_array($stage->value, $allowedStages, true))
                ->map(fn (ProductionStage $stage): array => [
                    'value' => $stage->value,
                    'label' => $stage->label(),
                    'batches' => (int) ($summary->get($stage->value)->batches ?? 0),
                    'pieces' => (int) ($summary->get($stage->value)->pieces ?? 0),
                    'awaiting_batches' => (int) ($awaiting->get($stage->value)->batches ?? 0),
                    'awaiting_pieces' => (int) ($awaiting->get($stage->value)->pieces ?? 0),
                ])->values(),
            'batches' => $batches->map(fn (ProductionBatch $batch): array => [
                'id' => $batch->id,
                'code' => $batch->code,
                'product_id' => $batch->product_id,
                'product_name' => $batch->product->name,
                'quantity' => $batch->quantity,
                'stage' => $batch->stage->value,
                'version' => $batch->version,
                'stage_entered_at' => $batch->stage_entered_at->toISOString(),
                'awaiting_receipt' => $batch->received_at === null,
                'workshop' => $batch->workshop?->name,
                'parent_code' => $batch->parent?->code,
                'parent_events' => $batch->parent?->events->toBase()->map(fn (ProductionBatchEvent $event): array => $this->eventProps($event)) ?? [],
                'notes' => $batch->notes,
                'sizes' => $batch->items->toBase()->map(fn ($item): array => ['size' => $item->size, 'quantity' => $item->quantity]),
                'can_delete' => $batch->parent_id === null && $batch->events->every(fn ($event): bool => $event->from_stage === null),
                'can_undo' => ($last = $batch->events->last(fn ($event): bool => $event->from_stage !== $event->to_stage)) && $last->from_stage !== null && $last->from_stage->canMoveTo($last->to_stage),
                'events' => $batch->events->toBase()->map(fn (ProductionBatchEvent $event): array => $this->eventProps($event)),
            ]),
            'filterProducts' => $filterProducts,
            'products' => Gate::allows('create', ProductionBatch::class)
                ? Product::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'model'])
                : [],
            'filters' => ['product' => $filters['product'] ?? null, 'stage' => $filters['stage'] ?? null],
            'maxQuantity' => ProductionBatch::MAX_QUANTITY,
            'canCreate' => Gate::allows('create', ProductionBatch::class),
            'isAdmin' => $user->isAdmin(),
            'workshops' => Workshop::query()->orderBy('name')->get(['id', 'name', 'type', 'is_active']),
        ]);
    }

    /** @return array<string, mixed> */
    private function eventProps(ProductionBatchEvent $event): array
    {
        return [
            'id' => $event->id, 'from' => $event->from_stage?->label(), 'to' => $event->to_stage->label(),
            'actor' => $event->actor->name, 'notes' => $event->notes, 'workshop' => $event->to_workshop_name,
            'kind' => $event->kind, 'occurred_at' => $event->occurred_at->toISOString(),
            'sizes_before' => $event->sizes_before, 'sizes_after' => $event->sizes_after,
        ];
    }

    public function store(Request $request, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('create', ProductionBatch::class);
        $data = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->whereNull('deleted_at')],
            'quantity' => ['required', 'integer', 'min:1', 'max:'.ProductionBatch::MAX_QUANTITY],
            'notes' => ['nullable', 'string', 'max:2000'],
            ...$this->sizeRules('sizes'),
        ], [], ['product_id' => 'produto', 'quantity' => 'quantidade de peças', 'notes' => 'observações']);
        $action->create(Product::query()->whereKey($data['product_id'])->firstOrFail(), (int) $data['quantity'], $data['notes'] ?? null, $request->user(), $this->sizeData($request->input('sizes', [])));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lote criado no Corte.']);

        return back();
    }

    public function advance(Request $request, ProductionBatch $batch, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('viewAny', ProductionBatch::class);
        $data = $request->validate([
            'stage' => ['required', Rule::enum(ProductionStage::class)],
            'target' => ['required', Rule::enum(ProductionStage::class)],
            'version' => ['required', 'integer', 'min:1'],
            'workshop_id' => ['nullable', 'integer'],
        ], [], ['stage' => 'etapa atual', 'target' => 'próxima etapa', 'version' => 'lote']);
        $action->advance($batch, ProductionStage::from($data['stage']), ProductionStage::from($data['target']), (int) $data['version'], $request->user(), isset($data['workshop_id']) ? (int) $data['workshop_id'] : null);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lote enviado para a próxima etapa.']);

        return back();
    }

    public function split(Request $request, ProductionBatch $batch, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('viewAny', ProductionBatch::class);
        $data = $request->validate([
            'stage' => ['required', Rule::enum(ProductionStage::class)],
            'target' => ['required', Rule::enum(ProductionStage::class)],
            'version' => ['required', 'integer', 'min:1'],
            'allocations' => ['required', 'array', 'min:2'],
            'allocations.*.workshop_id' => ['required', 'integer', 'distinct'],
            'allocations.*.quantity' => ['required', 'integer', 'min:1', 'max:'.ProductionBatch::MAX_QUANTITY],
            ...$this->sizeRules('allocations.*.sizes'),
        ], [], ['allocations' => 'distribuição', 'allocations.*.workshop_id' => 'oficina', 'allocations.*.quantity' => 'quantidade']);
        $allocations = [];
        foreach ($request->array('allocations') as $row) {
            if (! is_array($row)) {
                throw ValidationException::withMessages(['allocations' => 'Informe uma distribuição válida.']);
            }
            $allocations[] = ['workshop_id' => (int) $row['workshop_id'], 'quantity' => (int) $row['quantity'], 'sizes' => $this->sizeData($row['sizes'] ?? [])];
        }
        $action->split($batch, ProductionStage::from($data['stage']), ProductionStage::from($data['target']), (int) $data['version'], $request->user(), $allocations);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lote dividido e enviado às oficinas.']);

        return back();
    }

    public function updateSizes(Request $request, ProductionBatch $batch, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('advance', $batch);
        $data = $request->validate([
            'version' => ['required', 'integer', 'min:1'],
            ...$this->sizeRules('sizes'),
            'sizes' => ['present', 'array'],
        ], [], ['sizes' => 'grade', 'sizes.*.size' => 'tamanho', 'sizes.*.quantity' => 'quantidade']);
        $action->updateSizes($batch, $this->sizeData($request->input('sizes', [])), (int) $data['version'], $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Grade do lote atualizada.']);

        return back();
    }

    /** @return array<string, array<int, string>> */
    private function sizeRules(string $prefix): array
    {
        return [
            $prefix => ['sometimes', 'array'],
            $prefix.'.*' => ['required', 'array'],
            $prefix.'.*.size' => ['required', 'string', 'max:30'],
            $prefix.'.*.quantity' => ['required', 'integer', 'min:0', 'max:'.ProductionBatch::MAX_QUANTITY],
        ];
    }

    /** @return array<int, array{size: string, quantity: int}> */
    private function sizeData(mixed $rows): array
    {
        if (! is_array($rows)) {
            throw ValidationException::withMessages(['sizes' => 'Informe uma grade válida.']);
        }
        $sizes = [];
        foreach ($rows as $row) {
            if (! is_array($row) || ! isset($row['size'], $row['quantity'])) {
                throw ValidationException::withMessages(['sizes' => 'Informe uma grade válida.']);
            }
            $sizes[] = ['size' => (string) $row['size'], 'quantity' => (int) $row['quantity']];
        }

        return $sizes;
    }

    public function undo(Request $request, ProductionBatch $batch, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('undo', $batch);
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000'], 'version' => ['required', 'integer', 'min:1']], [], ['reason' => 'motivo', 'version' => 'lote']);
        $action->undo($batch, $data['reason'], (int) $data['version'], $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Último avanço desfeito.']);

        return back();
    }

    public function receive(Request $request, ProductionBatch $batch, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('viewAny', ProductionBatch::class);
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']], [], ['version' => 'lote']);
        $action->receive($batch, (int) $data['version'], $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Recebimento do lote confirmado.']);

        return back();
    }

    public function destroy(Request $request, ProductionBatch $batch, ManageProductionBatch $action): RedirectResponse
    {
        Gate::authorize('delete', $batch);
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']], [], ['version' => 'lote']);
        $action->delete($batch, (int) $data['version'], $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Lote excluído.']);

        return back();
    }
}
