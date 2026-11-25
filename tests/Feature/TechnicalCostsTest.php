<?php

use App\Enums\UserRole;
use App\Models\CostItem;
use App\Models\Material;
use App\Models\MaterialPrice;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('admin can schedule prices and same-day corrections without losing the history', function () {
    $this->travelTo(now()->setDate(2026, 11, 25));
    $material = Material::factory()->create();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    foreach (['2026-11-24' => '1.2345', '2026-11-25' => '2.3456', '2026-11-26' => '3.4567'] as $date => $amount) {
        $this->post(route('material-prices.store', $material), ['unit_price' => $amount, 'effective_from' => $date])
            ->assertRedirect(route('material-prices.index', $material))->assertSessionHasNoErrors();
    }

    $this->post(route('material-prices.store', $material), ['unit_price' => '2.6280', 'effective_from' => '2026-11-25'])
        ->assertSessionHasNoErrors();

    $current = $material->currentPrice();
    expect($current?->unit_price)->toBe('2.6280');
    $this->assertDatabaseHas('material_prices', ['id' => $current?->id, 'created_by' => $admin->id]);
    $this->get(route('material-prices.index', $material))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('prices.data', 4)->where('currentPriceId', $current?->id));
});

test('the price amount and effective date are validated', function () {
    $material = Material::factory()->create();
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('material-prices.index', $material))
        ->post(route('material-prices.store', $material), ['unit_price' => '0.00001', 'effective_from' => '2026-02-30'])
        ->assertSessionHasErrors(['unit_price', 'effective_from']);

    expect(MaterialPrice::query()->count())->toBe(0);
});

test('modeling receives no financial data and cannot reach any financial route', function () {
    $price = MaterialPrice::factory()->create();
    $material = Material::query()->sole();
    $item = CostItem::factory()->create();

    $this->actingAs(User::factory()->create(['role' => UserRole::Modeling]));
    $this->get(route('materials.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('canManageCosts', false)
        ->missing('materials.data.0.prices')
        ->missing('materials.data.0.unit_price'));

    $this->get(route('material-prices.index', $material))->assertForbidden();
    $this->post(route('material-prices.store', $material))->assertForbidden();
    $this->get(route('cost-items.index'))->assertForbidden();
    $this->post(route('cost-items.store'))->assertForbidden();
    $this->patch(route('cost-items.update', $item))->assertForbidden();

    expect($price->fresh())->not->toBeNull();
});

test('admin can save and clear optional cost defaults', function () {
    $this->actingAs(User::factory()->admin()->create());
    $data = ['name' => 'Mão de obra', 'default_amount' => '8.20', 'surcharge_type' => 'percent', 'surcharge_value' => '10', 'is_active' => true];
    $this->from(route('cost-items.index'))->post(route('cost-items.store'), $data)
        ->assertRedirect(route('cost-items.index'))->assertSessionHasNoErrors();

    $item = CostItem::query()->sole();
    $this->get(route('cost-items.index'))->assertInertia(fn (Assert $page) => $page
        ->where('costItems.data.0.default_amount', '8.20')->where('costItems.data.0.surcharge_value', '10.00'));

    $this->patch(route('cost-items.update', $item), [
        ...$data, 'default_amount' => '', 'surcharge_type' => '', 'surcharge_value' => '', 'is_active' => false,
    ])->assertSessionHasNoErrors();

    expect($item->fresh())->default_amount->toBeNull()->surcharge_type->toBeNull()
        ->surcharge_value->toBeNull()->is_active->toBeFalse();
});

test('default surcharges require value and kind and a percent cannot exceed one hundred', function (array $data, string $field) {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('cost-items.index'))
        ->post(route('cost-items.store'), $data + ['name' => 'Passadoria', 'is_active' => true])
        ->assertSessionHasErrors($field);

    expect(CostItem::query()->count())->toBe(0);
})->with([
    [['surcharge_type' => 'fixed'], 'surcharge_value'],
    [['surcharge_value' => '12'], 'surcharge_type'],
    [['surcharge_type' => 'percent', 'surcharge_value' => '100.01'], 'surcharge_value'],
]);
