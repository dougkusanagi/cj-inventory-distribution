<?php

use App\Models\CatalogSetting;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('redirects guests away from catalog settings', function () {
    $this->get(route('catalog-settings.edit'))->assertRedirect(route('login'));
});

it('stores the normalized WhatsApp destination for catalog orders', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->put(route('catalog-settings.update'), [
        'whatsapp_number' => '(11) 99999-9999',
    ]);

    $response->assertRedirect(route('catalog-settings.edit'));
    expect(CatalogSetting::query()->sole()->whatsapp_number)->toBe('5511999999999');
});

it('shows the current WhatsApp destination', function () {
    $setting = CatalogSetting::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('catalog-settings.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/catalog')
            ->where('whatsappNumber', $setting->whatsapp_number));
});

it('rejects a WhatsApp destination without country and area codes', function () {
    $this->actingAs(User::factory()->create())
        ->from(route('catalog-settings.edit'))
        ->put(route('catalog-settings.update'), ['whatsapp_number' => '9999-9999'])
        ->assertInvalid(['whatsapp_number' => 'Informe um número brasileiro com DDI 55, DDD e telefone.']);

    $this->assertDatabaseEmpty('catalog_settings');
});
