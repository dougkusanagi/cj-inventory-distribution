<?php

use App\Http\Controllers\Settings\CatalogSettingsController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->prefix('painel')->group(function () {
    Route::redirect('configuracoes', '/painel/configuracoes/perfil');

    Route::get('configuracoes/perfil', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('configuracoes/perfil', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->prefix('painel')->group(function () {
    Route::delete('configuracoes/perfil', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('configuracoes/seguranca', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('configuracoes/senha', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('configuracoes/aparencia', 'settings/appearance')->name('appearance.edit');

    Route::get('configuracoes/catalogo', [CatalogSettingsController::class, 'edit'])
        ->name('catalog-settings.edit');
    Route::put('configuracoes/catalogo', [CatalogSettingsController::class, 'update'])
        ->name('catalog-settings.update');
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
