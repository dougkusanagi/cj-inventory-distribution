<?php

namespace App\Http\Controllers;

use App\Actions\Stock\ReverseStockMovement;
use App\Http\Requests\Stock\ReverseStockMovementRequest;
use App\Models\StockMovement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class StockMovementReversalController extends Controller
{
    public function store(
        ReverseStockMovementRequest $request,
        StockMovement $movement,
        ReverseStockMovement $reverseStockMovement,
    ): RedirectResponse {
        Gate::authorize('reverse', $movement);
        $reverseStockMovement->handle($movement, $request->string('reason')->toString(), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Estorno registrado.']);

        return to_route('stock-movements.show', $movement);
    }
}
