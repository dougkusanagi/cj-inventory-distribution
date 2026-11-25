<?php

namespace App\Http\Controllers;

use App\Actions\TechnicalSheets\CalculateTechnicalSheetCost;
use App\Actions\TechnicalSheets\ManageTechnicalSheet;
use App\Enums\TechnicalSheetStatus as Status;
use App\Http\Requests\SaveTechnicalSheetCostsRequest;
use App\Http\Requests\SaveTechnicalSheetRequest;
use App\Http\Requests\TransitionTechnicalSheetRequest;
use App\Http\Resources\ProductImageResource;
use App\Models\CostItem;
use App\Models\Material;
use App\Models\Product;
use App\Models\TechnicalSheet;
use App\Models\TechnicalSheetCost;
use App\Models\TechnicalSheetMaterial;
use App\Support\NormalizedSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TechnicalSheetController extends Controller
{
    public function __construct(
        private readonly ManageTechnicalSheet $sheets,
        private readonly CalculateTechnicalSheetCost $calculator,
    ) {}

    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());

        return Inertia::render('technical-sheets/index', [
            'products' => Product::query()
                ->when($search !== '', fn (Builder $query) => NormalizedSearch::apply($query, $search, ['name', 'model', 'code']))
                ->orderBy('name')->orderBy('id')
                ->paginate(20, ['id', 'code', 'name', 'model'])
                ->withQueryString(),
            'search' => $search,
        ]);
    }

    public function product(Product $product): Response
    {
        $history = TechnicalSheet::query()->where('product_id', $product->id)->orderByDesc('revision')
            ->get(['id', 'revision', 'status', 'version', 'created_at']);

        return Inertia::render('technical-sheets/product', [
            'product' => $product->only(['id', 'code', 'name', 'model']),
            'history' => $history,
            'approved' => $history->firstWhere('status', Status::Approved),
            'openRevision' => $history->first(fn (TechnicalSheet $sheet) => $sheet->isOpen()),
        ]);
    }

    public function show(TechnicalSheet $technicalSheet): Response
    {
        $technicalSheet->load(['product.washType', 'product.media', 'materials']);
        $product = $technicalSheet->product;
        $props = [
            'product' => [
                ...$product->only(['id', 'code', 'name', 'model']),
                'wash_type' => $product->washType?->name,
                'images' => ProductImageResource::collection($product->getMedia(Product::MEDIA_COLLECTION))->resolve(),
                'archived' => $product->trashed(),
            ],
            'sheet' => $technicalSheet->only(['id', 'revision', 'version', 'status', 'instructions', 'review_note', 'approved_at', 'obsoleted_at']),
            'materials' => $technicalSheet->materials->map(fn (TechnicalSheetMaterial $line): array => [
                ...$line->only(['id', 'material_id', 'material_name', 'role', 'quantity']),
                'unit' => $line->unit->label(),
            ]),
        ];

        $editable = ! $product->trashed() && $technicalSheet->status === Status::Draft;
        if ($editable) {
            $props['materialOptions'] = Material::query()->where('is_active', true)
                ->orderBy('name')->orderBy('id')->get(['id', 'code', 'name', 'type', 'unit'])
                ->map(fn (Material $material): array => [
                    ...$material->only(['id', 'code', 'name', 'type']),
                    'unit' => $material->unit->label(),
                ]);
        }
        if (Gate::allows('manageTechnicalCosts')) {
            $props['costs'] = [
                'items' => $technicalSheet->costs->map(fn (TechnicalSheetCost $cost): array => $cost->only(['cost_item_id', 'cost_name', 'amount', 'surcharge_type', 'surcharge_value'])),
                'summary' => $this->calculator->handle($technicalSheet),
                'options' => ! $product->trashed() && $technicalSheet->isOpen()
                    ? CostItem::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'default_amount', 'surcharge_type', 'surcharge_value'])
                    : [],
            ];
        }

        return Inertia::render('technical-sheets/show', $props);
    }

    public function store(Request $request, Product $product): RedirectResponse
    {
        $sheet = $this->sheets->start($product, $request->user());

        return to_route('technical-sheets.show', $sheet);
    }

    public function revise(Request $request, TechnicalSheet $technicalSheet): RedirectResponse
    {
        $request->validate(['version' => ['required', 'integer', 'min:1']]);
        $sheet = $this->sheets->start($technicalSheet->product, $request->user(), $technicalSheet, $request->integer('version'));

        return to_route('technical-sheets.show', $sheet);
    }

    public function update(SaveTechnicalSheetRequest $request, TechnicalSheet $technicalSheet): RedirectResponse
    {
        $this->sheets->save($technicalSheet, $request->integer('version'), $request->validated('instructions'), $request->validated('materials'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Ficha técnica salva.']);

        return to_route('technical-sheets.show', $technicalSheet);
    }

    public function updateCosts(SaveTechnicalSheetCostsRequest $request, TechnicalSheet $technicalSheet): RedirectResponse
    {
        $this->sheets->saveCosts($technicalSheet, $request->integer('version'), $request->validated('costs'), $request->validated('sale_prices'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Custos salvos.']);

        return to_route('technical-sheets.show', $technicalSheet);
    }

    public function transition(TransitionTechnicalSheetRequest $request, TechnicalSheet $technicalSheet): RedirectResponse
    {
        $target = Status::from($request->validated('status'));
        if ($target !== Status::InReview) {
            Gate::authorize('manageTechnicalCosts');
        }
        $this->sheets->transition($technicalSheet, $request->integer('version'), $target, $request->user(), $request->validated('reason'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Situação da ficha atualizada.']);

        return to_route('technical-sheets.show', $technicalSheet);
    }
}
