<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMaterialPriceRequest;
use App\Models\Material;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MaterialPriceController extends Controller
{
    public function index(Material $material): Response
    {
        return Inertia::render('materials/prices', [
            'material' => $material->only(['id', 'name', 'code']),
            'prices' => $material->prices()->orderByDesc('effective_from')->orderByDesc('id')
                ->paginate(20, ['id', 'unit_price', 'effective_from']),
            'currentPriceId' => $material->currentPrice()?->id,
            'today' => today()->toDateString(),
        ]);
    }

    public function store(StoreMaterialPriceRequest $request, Material $material): RedirectResponse
    {
        DB::transaction(fn () => $material->prices()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Preço registrado.']);

        return to_route('material-prices.index', $material);
    }
}
