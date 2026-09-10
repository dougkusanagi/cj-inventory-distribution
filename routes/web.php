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

Route::middleware(['auth', 'verified'])->prefix('painel')->group(function () {
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
});

require __DIR__.'/settings.php';
