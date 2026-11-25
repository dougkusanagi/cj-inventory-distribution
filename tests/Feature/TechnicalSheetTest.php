<?php

use App\Enums\TechnicalSheetStatus as Status;
use App\Enums\UserRole;
use App\Models\CostItem;
use App\Models\Material;
use App\Models\MaterialPrice;
use App\Models\Product;
use App\Models\TechnicalSheet;
use App\Models\User;
use App\Models\WashType;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('modeling can draft a product sheet, view its wash and submit it but cannot read or save costs', function () {
    $product = Product::factory()->create(['wash_type_id' => WashType::factory()->create(['name' => 'Estonada'])->id]);
    $material = Material::factory()->create(['name' => 'Sarja']);
    $user = User::factory()->create(['role' => UserRole::Modeling]);
    $this->actingAs($user)->post(route('technical-sheets.store', $product))->assertSessionHasNoErrors();
    $sheet = TechnicalSheet::query()->sole();

    $this->from(route('technical-sheets.show', $sheet))->patch(route('technical-sheets.update', $sheet), [
        'version' => 1, 'instructions' => 'Reforçar a costura lateral.',
        'materials' => [['material_id' => $material->id, 'role' => 'component', 'quantity' => '1.250']],
    ])->assertRedirect(route('technical-sheets.show', $sheet))->assertSessionHasNoErrors();

    $this->get(route('technical-sheets.show', $sheet))->assertInertia(fn (Assert $page) => $page
        ->where('product.wash_type', 'Estonada')
        ->where('sheet.instructions', 'Reforçar a costura lateral.')
        ->where('materials.0.quantity', '1.250')
        ->missing('materials.0.sale_price')
        ->missing('materials.0.unit_price_snapshot')
        ->missing('costs'));

    $this->patch(route('technical-sheets.costs.update', $sheet))->assertForbidden();
    $this->post(route('technical-sheets.transition', $sheet), ['version' => 2, 'status' => 'in_review'])->assertSessionHasNoErrors();
    $this->post(route('technical-sheets.transition', $sheet), ['version' => 3, 'status' => 'approved'])->assertForbidden();
    expect($sheet->fresh()->status)->toBe(Status::InReview);
    expect($product->fresh()->wash_type_id)->toBe($product->wash_type_id);
});

test('the revision database prevents competing open or approved sheets for a product', function (Status $a, Status $b) {
    $sheet = TechnicalSheet::factory()->create(['status' => $a]);

    expect(fn () => DB::transaction(fn () => TechnicalSheet::factory()->create([
        'product_id' => $sheet->product_id, 'revision' => 2, 'status' => $b,
    ])))->toThrow(QueryException::class);
})->with([[Status::Draft, Status::InReview], [Status::Approved, Status::Approved]]);

test('admin approves with frozen prices and preserves the previous approval until a new one is approved', function () {
    $admin = User::factory()->admin()->create();
    $sheet = TechnicalSheet::factory()->create(['status' => Status::InReview]);
    $fabric = Material::factory()->create();
    $common = Material::factory()->create();
    $option = $sheet->materials()->create([
        'material_id' => $fabric->id, 'material_name' => 'Sarja', 'role' => 'fabric_option', 'unit' => 'm', 'quantity' => '1.125', 'sort_order' => 0,
    ]);
    $sheet->materials()->create([
        'material_id' => $common->id, 'material_name' => 'Forro', 'role' => 'component', 'unit' => 'm', 'quantity' => '1', 'sort_order' => 1,
    ]);
    MaterialPrice::factory()->create(['material_id' => $fabric->id, 'unit_price' => '12.3456']);
    MaterialPrice::factory()->create(['material_id' => $common->id, 'unit_price' => '1.0050']);
    $cost = CostItem::factory()->create(['name' => 'Mão de obra']);
    $this->actingAs($admin);

    $this->post(route('technical-sheets.transition', $sheet), ['version' => 1, 'status' => 'approved'])->assertSessionHasErrors('status');
    expect($option->fresh()->unit_price_snapshot)->toBeNull();

    $this->patch(route('technical-sheets.costs.update', $sheet), [
        'version' => 1,
        'costs' => [['cost_item_id' => $cost->id, 'amount' => '8.20', 'surcharge_type' => 'percent', 'surcharge_value' => 10]],
        'sale_prices' => [['id' => $option->id, 'sale_price' => '40']],
    ])->assertSessionHasNoErrors();

    $this->post(route('technical-sheets.transition', $sheet), ['version' => 2, 'status' => 'approved'])->assertSessionHasNoErrors();
    expect($option->fresh()->unit_price_snapshot)->toBe('12.3456');
    MaterialPrice::factory()->create(['material_id' => $fabric->id, 'unit_price' => '55.0000']);
    $this->get(route('technical-sheets.show', $sheet))->assertInertia(fn (Assert $page) => $page
        ->where('costs.summary.baseTotal', '10.03')
        ->where('costs.summary.lines.0.unit_price', '12.3456')
        ->where('costs.summary.lines.0.total', '23.92')
        ->where('costs.summary.lines.0.margin', '40.20'));

    $this->post(route('technical-sheets.revise', $sheet), ['version' => 3])->assertSessionHasNoErrors();
    $next = TechnicalSheet::query()->where('revision', 2)->sole();
    expect($sheet->fresh()->status)->toBe(Status::Approved)
        ->and($next->materials()->firstOrFail()->unit_price_snapshot)->toBeNull()
        ->and($next->costs()->sole()->amount)->toBe('8.20');

    $this->post(route('technical-sheets.transition', $next), ['version' => 1, 'status' => 'in_review'])->assertSessionHasNoErrors();
    $this->post(route('technical-sheets.transition', $next), ['version' => 2, 'status' => 'approved'])->assertSessionHasNoErrors();
    expect($sheet->fresh()->status)->toBe(Status::Obsolete)
        ->and($next->fresh()->status)->toBe(Status::Approved)
        ->and($next->materials()->firstOrFail()->unit_price_snapshot)->toBe('55.0000');

    $this->post(route('technical-sheets.transition', $sheet), ['version' => 4, 'status' => 'approved'])->assertSessionHasErrors('status');
    $this->get(route('technical-sheets.product', $sheet->product_id))->assertInertia(fn (Assert $page) => $page
        ->where('approved.id', $next->id)->where('openRevision', null)->has('history', 2));
});

test('technical edits reject stale versions inactive materials manual units and derived amounts', function () {
    $sheet = TechnicalSheet::factory()->create();
    $material = Material::factory()->create(['is_active' => false]);
    $this->actingAs(User::factory()->admin()->create());
    $data = ['version' => 1, 'instructions' => null, 'materials' => [['material_id' => $material->id, 'role' => 'component', 'quantity' => '1.250']]];

    $this->patch(route('technical-sheets.update', $sheet), $data)->assertSessionHasErrors('materials.0.material_id');
    $this->patch(route('technical-sheets.update', $sheet), $data + ['costFinal' => '20'])->assertSessionHasErrors('costFinal');
    $line = $data['materials'][0] + ['unit' => 'un'];
    $this->patch(route('technical-sheets.update', $sheet), [...$data, 'materials' => [$line]])->assertSessionHasErrors('materials.0');
    $this->patch(route('technical-sheets.update', $sheet), [])->assertSessionHasErrors(['version', 'materials', 'instructions']);
    $this->patch(route('technical-sheets.update', $sheet), [...$data, 'materials' => [], 'instructions' => 'Primeira edição'])->assertSessionHasNoErrors();
    $this->patch(route('technical-sheets.update', $sheet), [...$data, 'materials' => [], 'instructions' => 'Sobrescrita'])->assertSessionHasErrors('version');
    expect($sheet->fresh()->instructions)->toBe('Primeira edição');

    $this->post(route('technical-sheets.transition', $sheet), ['version' => 2, 'status' => 'in_review'])->assertSessionHasErrors('status');
});

test('returning a sheet requires a reason and restores the ability to edit technical data', function () {
    $sheet = TechnicalSheet::factory()->create(['status' => Status::InReview]);
    $this->actingAs(User::factory()->admin()->create());
    $this->patch(route('technical-sheets.update', $sheet), ['version' => 1, 'instructions' => null, 'materials' => []])->assertSessionHasErrors('version');
    $this->post(route('technical-sheets.transition', $sheet), ['version' => 1, 'status' => 'draft'])->assertSessionHasErrors('reason');
    $this->post(route('technical-sheets.transition', $sheet), ['version' => 1, 'status' => 'draft', 'reason' => 'Revisar consumo.'])->assertSessionHasNoErrors();

    expect($sheet->fresh()->status)->toBe(Status::Draft)
        ->and($sheet->fresh()->review_note)->toBe('Revisar consumo.');
});

test('stock cannot open or alter a technical sheet', function () {
    $sheet = TechnicalSheet::factory()->create();

    $this->actingAs(User::factory()->stock()->create());
    $this->get(route('technical-sheets.show', $sheet))->assertForbidden();
    $this->patch(route('technical-sheets.update', $sheet))->assertForbidden();
});

test('an insumo with a revision line keeps its unit when edited', function () {
    $material = Material::factory()->create();
    $sheet = TechnicalSheet::factory()->create();
    $sheet->materials()->create([
        'material_id' => $material->id, 'material_name' => $material->name,
        'role' => 'component', 'unit' => $material->unit, 'quantity' => '1', 'sort_order' => 0,
    ]);

    $this->actingAs(User::factory()->admin()->create())
        ->patch(route('materials.update', $material), [
            'name' => $material->name, 'type' => $material->type->value, 'unit' => 'un', 'is_active' => true,
        ])->assertSessionHasErrors('unit');

    expect($material->fresh()->unit)->toBe($material->unit);
});
