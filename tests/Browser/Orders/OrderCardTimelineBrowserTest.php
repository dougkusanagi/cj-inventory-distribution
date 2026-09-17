<?php

use App\Enums\StockOfferType;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));

    $user = User::factory()->create();
    $volumeIds = collect(range(1, 2))->map(function () {
        $product = Product::factory()->create();
        $offer = $product->offers()->create([
            'type' => StockOfferType::Replenishment,
            'is_active' => true,
        ]);
        $volume = $offer->stockVolumes()->create(['total_quantity' => 12]);
        $volume->items()->create(['size' => 'M', 'is_active' => true, 'quantity' => 12]);

        return $volume->id;
    })->all();

    $this->actingAs($user)->post(route('orders.store'), [
        'store_name' => 'Loja Timeline',
        'requester_name' => 'Ana',
        'volume_ids' => $volumeIds,
    ]);

    $this->timelineOrder = Order::query()->sole();
});

test('order cards show the timeline without subtitles on desktop', function () {
    visit(route('orders.index', [], false))
        ->resize(1280, 900)
        ->assertVisible('[data-testid="order-timeline-desktop"]')
        ->assertSee('Pedido criado')
        ->assertSee('Separação')
        ->assertSee('Conferência')
        ->assertSee('Finalizado')
        ->assertDontSee('0/0 sacos')
        ->assertSee('2 sacos')
        ->assertSee('24 peças')
        ->assertScript("(() => { const card = document.querySelector('[data-testid^=\"pedido-\"]'); const track = card.querySelector('[data-testid=\"order-timeline-track\"]'); const cardRect = card.getBoundingClientRect(); const trackRect = track.getBoundingClientRect(); return trackRect.left > cardRect.left && trackRect.right < cardRect.right; })()")
        ->assertScript("(() => { const dot = document.querySelector('[data-testid=\"order-timeline-desktop\"] li span[aria-hidden=\"true\"]'); return dot !== null && getComputedStyle(dot).backgroundColor !== 'rgba(0, 0, 0, 0)'; })()")
        ->assertNoJavaScriptErrors();
});

test('order timeline starts collapsed and expands on mobile', function () {
    $page = visit(route('orders.index', [], false))->resize(390, 844);

    $page
        ->assertVisible('[data-testid="alternar-estados"]')
        ->assertSee('Ver estados')
        ->assertMissing('[data-testid="order-timeline-mobile"]')
        ->click('[data-testid="alternar-estados"]')
        ->assertSee('Ocultar estados')
        ->assertVisible('[data-testid="order-timeline-mobile"]')
        ->assertSee('Pedido criado')
        ->assertSee('Atual')
        ->click('[data-testid="alternar-estados"]')
        ->assertSee('Ver estados')
        ->assertMissing('[data-testid="order-timeline-mobile"]')
        ->assertNoJavaScriptErrors();
});

test('canceled orders render a terminal canceled step', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('orders.cancel', $this->timelineOrder), ['reason' => 'Cliente desistiu.'])
        ->assertRedirect();

    expect($this->timelineOrder->refresh()->status->value)->toBe('canceled');

    visit(route('orders.index', [], false))
        ->resize(1280, 900)
        ->assertSee('Cancelado')
        ->assertSee('Pedido criado')
        ->assertDontSee('Aguardando')
        ->assertNoJavaScriptErrors();
});
