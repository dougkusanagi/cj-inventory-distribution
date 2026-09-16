<?php

use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CatalogOrderController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryCountController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductStockAdjustmentController;
use App\Http\Controllers\StockEntryController;
use App\Http\Controllers\StockExitController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\StockMovementReversalController;
use Illuminate\Support\Facades\Route;

Route::get('/', CatalogController::class)->name('home');
Route::get('catalog', CatalogController::class)->name('catalog');
Route::post('catalog/pedidos', CatalogOrderController::class)
    ->middleware('throttle:10,1')
    ->name('catalog-orders.store');
Route::inertia('design-system', 'design-system')->name('design-system');

Route::middleware(['auth', 'verified', 'staff'])->prefix('painel')->group(function () {
    Route::get('estoque/balancos', [InventoryCountController::class, 'index'])->name('inventory.index');
    Route::post('estoque/balancos', [InventoryCountController::class, 'store'])->name('inventory.store');
    Route::get('estoque/balancos/{inventory}', [InventoryCountController::class, 'show'])->name('inventory.show');
    Route::put('estoque/balancos/{inventory}/sacos/{item}', [InventoryCountController::class, 'update'])->name('inventory.update');
    Route::post('estoque/balancos/{inventory}/sacos/{item}/atualizar', [InventoryCountController::class, 'refreshItem'])->name('inventory.refresh-item');
    Route::post('estoque/balancos/{inventory}/confirmar', [InventoryCountController::class, 'confirm'])->name('inventory.confirm');
    Route::post('estoque/balancos/{inventory}/cancelar', [InventoryCountController::class, 'cancel'])->name('inventory.cancel');
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::resource('produtos', ProductController::class)
        ->names('products')
        ->parameters(['produtos' => 'product'])
        ->except('show');
    Route::post('produtos/{product}/ajustes-estoque', ProductStockAdjustmentController::class)
        ->name('products.stock-adjustments.store');
    Route::resource('categorias', CategoryController::class)
        ->names('categories')
        ->parameters(['categorias' => 'category'])
        ->except('show');
    Route::resource('pedidos', OrderController::class)
        ->names('orders')
        ->parameters(['pedidos' => 'order'])
        ->except('destroy');
    Route::post('pedidos/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::post('pedidos/{order}/complete', [OrderController::class, 'complete'])->name('orders.complete');
    Route::post('pedidos/{order}/itens/{item}/separate', [OrderController::class, 'separate'])
        ->scopeBindings()
        ->name('orders.items.separate');
    Route::post('pedidos/{order}/itens/{item}/undo-separation', [OrderController::class, 'undoSeparation'])
        ->scopeBindings()
        ->name('orders.items.undo-separation');
    Route::post('pedidos/{order}/itens/{item}/check', [OrderController::class, 'check'])
        ->scopeBindings()
        ->name('orders.items.check');
    Route::post('pedidos/{order}/itens/{item}/undo-check', [OrderController::class, 'undoCheck'])
        ->scopeBindings()
        ->name('orders.items.undo-check');
    Route::post('pedidos/{order}/itens/{item}/divergence', [OrderController::class, 'reportDivergence'])
        ->scopeBindings()
        ->name('orders.items.report-divergence');
    Route::post('pedidos/{order}/itens/{item}/resolve-divergence', [OrderController::class, 'resolveDivergence'])
        ->scopeBindings()
        ->name('orders.items.resolve-divergence');
    Route::get('movimentacoes', [StockMovementController::class, 'index'])->name('stock-movements.index');
    Route::get('movimentacoes/{movement}', [StockMovementController::class, 'show'])->name('stock-movements.show');
    Route::get('estoque/entradas/nova', [StockEntryController::class, 'create'])->name('stock-entries.create');
    Route::post('estoque/entradas', [StockEntryController::class, 'store'])->name('stock-entries.store');
    Route::get('estoque/saidas/nova', [StockExitController::class, 'create'])->name('stock-exits.create');
    Route::post('estoque/saidas', [StockExitController::class, 'store'])->name('stock-exits.store');
    Route::post('movimentacoes/{movement}/estornar', [StockMovementReversalController::class, 'store'])
        ->name('stock-movements.reverse');
});

require __DIR__.'/settings.php';
