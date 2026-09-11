<?php

use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CatalogOrderController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::get('/', CatalogController::class)->name('home');
Route::get('catalog', CatalogController::class)->name('catalog');
Route::post('catalog/pedidos', CatalogOrderController::class)
    ->middleware('throttle:10,1')
    ->name('catalog-orders.store');
Route::inertia('design-system', 'design-system')->name('design-system');

Route::middleware(['auth', 'verified', 'staff'])->prefix('painel')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::resource('produtos', ProductController::class)
        ->names('products')
        ->parameters(['produtos' => 'product'])
        ->except('show');
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
});

require __DIR__.'/settings.php';
