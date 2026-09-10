<?php

use App\Models\CatalogSetting;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

it('masks the catalog WhatsApp number while keeping the normalized value', function () {
    $this->actingAs(User::factory()->create());

    visit(route('catalog-settings.edit', [], false))
        ->type('#whatsapp-number', '11999998888')
        ->assertValue('#whatsapp-number', '(11) 99999-8888')
        ->press('Salvar WhatsApp')
        ->assertRoute('catalog-settings.edit')
        ->assertNoJavaScriptErrors();

    $this->assertDatabaseHas(CatalogSetting::class, [
        'whatsapp_number' => '5511999998888',
    ]);
});

it('shows the saved catalog WhatsApp number with a readable mask', function () {
    CatalogSetting::factory()->create([
        'whatsapp_number' => '5511999998888',
    ]);
    $this->actingAs(User::factory()->create());

    visit(route('catalog-settings.edit', [], false))
        ->assertValue('#whatsapp-number', '+55 (11) 99999-8888')
        ->assertNoJavaScriptErrors();
});
