<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveCostItemRequest;
use App\Models\CostItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CostItemController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('cost-items/index', [
            'costItems' => CostItem::query()->orderBy('name')->orderBy('id')
                ->paginate(20, ['id', 'name', 'default_amount', 'surcharge_type', 'surcharge_value', 'is_active']),
        ]);
    }

    public function store(SaveCostItemRequest $request): RedirectResponse
    {
        DB::transaction(fn () => CostItem::query()->create($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Custo-base cadastrado.']);

        return back();
    }

    public function update(SaveCostItemRequest $request, CostItem $costItem): RedirectResponse
    {
        $data = $request->validated();
        if (array_key_exists('surcharge_type', $data) || array_key_exists('surcharge_value', $data)) {
            $data += ['surcharge_type' => null, 'surcharge_value' => null];
        }
        DB::transaction(fn () => $costItem->update($data));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Custo-base atualizado.']);

        return back();
    }
}
