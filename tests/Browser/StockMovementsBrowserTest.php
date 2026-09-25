<?php

use App\Enums\StockOfferType;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Illuminate\Support\Facades\Vite;

beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

function stockMovementBrowserVolume(string $name, int $quantity, ?string $model = null): StockOfferVolume
{
    $product = Product::factory()->create([
        'name' => $name,
        'model' => $model,
    ]);
    $offer = $product->offers()->create(['type' => StockOfferType::Replenishment]);
    $volume = $offer->stockVolumes()->create(['total_quantity' => $quantity]);
    $volume->items()->create([
        'size' => 'M',
        'sort_order' => 0,
        'is_active' => true,
        'quantity' => $quantity,
    ]);
    $volume->update([
        'code' => 'SC-'.str_pad((string) $volume->id, 6, '0', STR_PAD_LEFT),
    ]);

    return $volume->load('offer.product');
}

test('manual exit keeps selected sacks through search and records both selections', function () {
    $selectedVolume = stockMovementBrowserVolume('Produto já selecionado', 5);
    $searchedVolume = stockMovementBrowserVolume('Produto encontrado', 7, 'MODELO-BUSCADO');
    $this->actingAs(User::factory()->create());

    $page = visit(route('stock-exits.create', [], false))
        ->assertSee('Produto já selecionado')
        ->click('button[aria-label="Selecionar '.$selectedVolume->code.'"]')
        ->assertSee('1 sacos selecionados')
        ->type('#exit-search', 'MODELO-BUSCADO')
        ->click('button:has-text("Buscar")')
        ->assertSee('Produto encontrado')
        ->assertSee('Produto já selecionado')
        ->assertAttribute(
            'button[aria-label="Selecionar '.$selectedVolume->code.'"]',
            'aria-checked',
            'true',
        )
        ->click('button[aria-label="Selecionar '.$searchedVolume->code.'"]')
        ->assertSee('2 sacos selecionados')
        ->click('#exit-reason')
        ->click('[role="option"]:has-text("Avaria")')
        ->click('button[type="submit"]:has-text("Registrar saída")')
        ->assertSee('Saída de estoque registrada.');

    $movement = StockMovement::query()->sole();

    $page
        ->assertRoute('stock-movements.show', [$movement->id])
        ->assertSee('Saída #'.$movement->id)
        ->assertNoJavaScriptErrors();

    expect($movement->items->pluck('stock_offer_volume_id')->sort()->values()->all())
        ->toBe([$selectedVolume->id, $searchedVolume->id])
        ->and($selectedVolume->fresh()->consumed_at)->not->toBeNull()
        ->and($searchedVolume->fresh()->consumed_at)->not->toBeNull();
});

test('manual exit explains when a selected sack becomes reserved before submission', function () {
    $volume = stockMovementBrowserVolume('Produto reservado durante a saída', 5);
    $user = User::factory()->create();

    $this->actingAs($user);

    $page = visit(route('stock-exits.create', [], false))
        ->click('button[aria-label="Selecionar '.$volume->code.'"]');

    $order = Order::factory()->create();
    $volume->update(['current_order_id' => $order->id]);

    $page
        ->click('#exit-reason')
        ->click('[role="option"]:has-text("Avaria")')
        ->click('button[type="submit"]:has-text("Registrar saída")')
        ->assertSee('Selecione apenas sacos disponíveis, sem reserva e sem retirada registrada.')
        ->assertNoJavaScriptErrors();

    expect(StockMovement::query()->count())->toBe(0)
        ->and($volume->fresh()->current_order_id)->toBe($order->id)
        ->and($volume->fresh()->consumed_at)->toBeNull();
});

test('stock history remains usable on mobile and opens movement details', function () {
    $volume = stockMovementBrowserVolume('Produto no histórico móvel', 6);
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Avaria',
        'idempotency_key' => 'exit-mobile-history-001',
    ]);

    $movement = StockMovement::query()->sole();
    $this->actingAs($user);

    visit(route('stock-movements.index', [], false))
        ->resize(390, 844)
        ->assertSee('Histórico de movimentações')
        ->assertVisible('[aria-label="Resumo das movimentações"]')
        ->assertSee('#'.$movement->id.' · Saída')
        ->assertSee('1 saco · 6 peças')
        ->assertSee($user->name)
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->click('a[href="'.route('stock-movements.show', $movement, false).'"]')
        ->assertRoute('stock-movements.show', [$movement->id])
        ->assertSee('Sacos movimentados')
        ->assertSee('Total antes')
        ->assertSee('Total depois')
        ->assertSee($volume->code)
        ->assertNoJavaScriptErrors();
});

test('a manual stock movement can be reversed from its details screen', function () {
    $volume = stockMovementBrowserVolume('Produto com saída estornável', 4);
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('stock-exits.store'), [
        'volume_ids' => [$volume->id],
        'reason' => 'Avaria',
        'idempotency_key' => 'exit-reversal-browser-001',
    ]);

    $movement = StockMovement::query()->sole();
    $this->actingAs($user);

    $page = visit(route('stock-movements.show', $movement, false))
        ->assertSee('Estornar movimentação')
        ->click('button:has-text("Estornar movimentação")')
        ->click('#reverse-reason')
        ->click('[role="option"]:has-text("Operação cancelada")');

    $page
        ->click('button:has-text("Confirmar estorno")')
        ->assertVisible('[role="dialog"]')
        ->click('[role="dialog"] button:has-text("Confirmar estorno")')
        ->assertSee('Estorno registrado.')
        ->assertSee('Estornado por')
        ->assertMissing('button:has-text("Estornar movimentação")')
        ->assertNoJavaScriptErrors();

    $reversal = StockMovement::query()->where('reversal_of_id', $movement->id)->sole();

    expect(StockMovement::query()->count())->toBe(2)
        ->and($reversal->reason)->toBe('Operação cancelada')
        ->and($volume->fresh()->consumed_at)->toBeNull();
});
