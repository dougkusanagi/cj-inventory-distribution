<?php

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\User;
use App\Models\WashType;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected when visiting wash-types', function () {
    $this->get(route('wash-types.index'))->assertRedirect(route('login'));
});

test('wash type creation and editing render their matching forms', function () {
    $user = User::factory()->create();
    $washType = WashType::factory()->create();

    $this->actingAs($user)
        ->get(route('wash-types.create'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('wash-types/create'));

    $this->actingAs($user)
        ->get(route('wash-types.edit', $washType))
        ->assertInertia(fn (Assert $page) => $page
            ->component('wash-types/edit')
            ->where('washType.id', $washType->id));
});

test('authenticated users can list and search wash-types', function () {
    WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone']);
    WashType::factory()->create(['name' => 'Black', 'slug' => 'black']);

    $this->actingAs(User::factory()->create())
        ->get(route('wash-types.index', ['search' => 'Sto']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('wash-types/index')
            ->has('washTypes.data', 1)
            ->where('washTypes.data.0.name', 'Stone'));
});

test('authenticated users can create and update a normalized wash type', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('wash-types.store'), [
        'name' => '  Stone   Wash  ',
        'is_active' => true,
    ])->assertRedirect(route('wash-types.index'));

    $washType = WashType::query()->sole();
    expect($washType->name)->toBe('Stone Wash')
        ->and($washType->slug)->toBe('stone-wash');

    $this->actingAs($user)->put(route('wash-types.update', $washType), [
        'name' => 'Lavagem Clara',
        'is_active' => false,
    ])->assertRedirect(route('wash-types.index'));

    expect($washType->refresh()->name)->toBe('Lavagem Clara')
        ->and($washType->slug)->toBe('lavagem-clara')
        ->and($washType->is_active)->toBeFalse();
});

test('wash type names are unique after normalization', function () {
    WashType::factory()->create(['name' => 'Stone Wash', 'slug' => 'stone-wash']);

    $this->actingAs(User::factory()->create())->post(route('wash-types.store'), [
        'name' => '  STONE wash ',
        'is_active' => true,
    ])->assertInvalid(['slug' => 'Já existe um tipo de lavagem com esse nome.']);
});

test('the database rejects duplicate wash slugs even when a wash is inactive', function (bool $active) {
    WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone', 'is_active' => $active]);

    expect(fn () => DB::table('wash_types')->insert([
        'name' => 'Outra Stone',
        'slug' => 'stone',
        'is_active' => true,
    ]))->toThrow(QueryException::class);

    $this->assertDatabaseCount('wash_types', 1);
})->with(['active' => true, 'inactive' => false]);

test('the database allows reusing a deleted wash slug without removing its history', function () {
    $deleted = WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone']);
    $deleted->delete();

    DB::table('wash_types')->insert(['name' => 'Nova Stone', 'slug' => 'stone', 'is_active' => true]);

    $this->assertSoftDeleted($deleted);
    $this->assertDatabaseCount('wash_types', 2);
    $this->assertDatabaseHas('wash_types', ['name' => 'Nova Stone', 'slug' => 'stone', 'deleted_at' => null]);
});

test('editing a wash type audits the actor and changed values', function () {
    $user = User::factory()->create();
    $washType = WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone']);

    $this->actingAs($user)->put(route('wash-types.update', $washType), [
        'name' => 'Stone clara',
        'is_active' => false,
    ])->assertRedirect(route('wash-types.index'));

    $this->assertDatabaseHas('wash_types', ['id' => $washType->id, 'name' => 'Stone clara', 'slug' => 'stone-clara', 'is_active' => false]);
    $audit = AuditLog::query()
        ->where('auditable_type', WashType::class)
        ->where('auditable_id', $washType->id)
        ->where('action', AuditAction::Updated->value)
        ->sole();

    expect($audit->actor_id)->toBe($user->id);
    expect($audit->before)->toMatchArray(['name' => 'Stone', 'slug' => 'stone', 'is_active' => true]);
    expect($audit->after)->toMatchArray(['name' => 'Stone clara', 'slug' => 'stone-clara', 'is_active' => false]);
});

test('deleting a wash type audits the actor and soft deletion', function () {
    $user = User::factory()->create();
    $washType = WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone']);

    $this->actingAs($user)->delete(route('wash-types.destroy', $washType))
        ->assertRedirect(route('wash-types.index'));

    $this->assertSoftDeleted($washType);
    $audit = AuditLog::query()
        ->where('auditable_type', WashType::class)
        ->where('auditable_id', $washType->id)
        ->where('action', AuditAction::Deleted->value)
        ->sole();

    expect($audit->actor_id)->toBe($user->id);
    expect($audit->before)->toMatchArray(['name' => 'Stone', 'slug' => 'stone', 'deleted_at' => null]);
    expect($audit->after)->toMatchArray(['name' => 'Stone', 'slug' => 'stone', 'deleted_at' => $washType->refresh()->getRawOriginal('deleted_at')]);
    expect($audit->after['deleted_at'])->not->toBeNull();
});

test('wash-types without products can be deleted', function () {
    $washType = WashType::factory()->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('wash-types.destroy', $washType))
        ->assertRedirect(route('wash-types.index'));

    $this->assertSoftDeleted('wash_types', ['id' => $washType->id]);
});

test('wash-types in use cannot be deleted', function () {
    $washType = WashType::factory()->create();
    Product::factory()->create(['wash_type_id' => $washType->id]);

    $this->actingAs(User::factory()->create())
        ->delete(route('wash-types.destroy', $washType))
        ->assertInvalid(['washType' => 'Tipo de lavagem em uso. Desative ou reclassifique os produtos.']);

    $this->assertModelExists($washType);
});

test('non staff users cannot manage wash types', function () {
    $this->actingAs(User::factory()->create(['is_staff' => false]))
        ->postJson(route('wash-types.store'), ['name' => 'Stone'])
        ->assertForbidden();
    $this->assertDatabaseCount('wash_types', 0);
});

test('quick creation returns the saved wash type and records its audit', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('wash-types.store'), ['name' => '  Acid   Wash '])
        ->assertCreated()
        ->assertJsonPath('name', 'Acid Wash')
        ->assertJsonPath('is_active', true);
    $washType = WashType::query()->sole();
    $this->assertDatabaseHas('audit_logs', ['auditable_type' => WashType::class, 'auditable_id' => $washType->id, 'action' => 'created']);
});

test('a wash type linked to a deleted product cannot be removed', function () {
    $washType = WashType::factory()->create();
    Product::factory()->create(['wash_type_id' => $washType->id])->delete();
    $this->actingAs(User::factory()->create())
        ->delete(route('wash-types.destroy', $washType))
        ->assertInvalid(['washType' => 'Tipo de lavagem em uso. Desative ou reclassifique os produtos.']);
    expect($washType->refresh()->trashed())->toBeFalse();
});

test('a removed wash type name can be reused', function () {
    WashType::factory()->create(['name' => 'Stone', 'slug' => 'stone'])->delete();
    $this->actingAs(User::factory()->create())->postJson(route('wash-types.store'), ['name' => 'Stone'])->assertCreated();
    expect(WashType::query()->count())->toBe(1);
});

test('wash type validation rejects invalid values without saving', function (array $data, array $errors) {
    $this->actingAs(User::factory()->create())->postJson(route('wash-types.store'), $data)->assertUnprocessable()->assertInvalid($errors);
    $this->assertDatabaseCount('wash_types', 0);
})->with([
    'empty name' => [[], ['name' => 'Informe o nome do tipo de lavagem.']],
    'long name' => [['name' => str_repeat('a', 101)], ['name' => 'O nome deve ter no máximo 100 caracteres.']],
    'invalid status' => [['name' => 'Stone', 'is_active' => 'invalid'], ['is_active' => 'Informe se o tipo de lavagem está ativo.']],
]);

test('products can save, change, and clear their optional wash type', function () {
    $user = User::factory()->create();
    $washType = WashType::factory()->create();
    $other = WashType::factory()->create();
    $this->actingAs($user)->post(route('products.store'), ['name' => 'Calça', 'wash_type_id' => $washType->id])->assertRedirect(route('products.index'));
    $product = Product::query()->sole();
    expect($product->wash_type_id)->toBe($washType->id);
    $this->put(route('products.update', $product), ['name' => 'Calça', 'wash_type_id' => $other->id])->assertRedirect(route('products.index'));
    expect($product->refresh()->wash_type_id)->toBe($other->id);
    $this->put(route('products.update', $product), ['name' => 'Calça', 'wash_type_id' => null])->assertRedirect(route('products.index'));
    expect($product->refresh()->wash_type_id)->toBeNull();
});

test('legacy product updates preserve a wash type omitted from the payload', function () {
    $washType = WashType::factory()->create();
    $product = Product::factory()->create(['wash_type_id' => $washType->id]);
    $this->actingAs(User::factory()->create())->put(route('products.update', $product), ['name' => 'Atualizado'])->assertRedirect(route('products.index'));
    expect($product->refresh()->wash_type_id)->toBe($washType->id);
});

test('inactive and deleted wash types cannot receive new product assignments', function (string $state) {
    $washType = WashType::factory()->create(['is_active' => $state !== 'inactive']);
    if ($state === 'deleted') {
        $washType->delete();
    }
    $this->actingAs(User::factory()->create())->post(route('products.store'), ['name' => 'Calça', 'wash_type_id' => $washType->id])->assertInvalid(['wash_type_id' => 'Selecione um tipo de lavagem ativo.']);
    $this->assertDatabaseCount('products', 0);
})->with(['inactive', 'deleted']);

test('an inactive current wash type remains available when editing its product', function () {
    $current = WashType::factory()->inactive()->create();
    $other = WashType::factory()->inactive()->create();
    $product = Product::factory()->create(['wash_type_id' => $current->id]);
    $this->actingAs(User::factory()->create())->get(route('products.edit', $product))->assertInertia(fn (Assert $page) => $page->has('washTypes', 1)->where('washTypes.0.id', $current->id)->where('product.wash_type.id', $current->id));
    $this->put(route('products.update', $product), ['name' => 'Calça atualizada', 'wash_type_id' => $current->id])->assertRedirect(route('products.index'));
    expect($product->refresh()->wash_type_id)->toBe($current->id);
    $this->put(route('products.update', $product), ['name' => 'Calça', 'wash_type_id' => $other->id])->assertInvalid(['wash_type_id']);
    expect($product->refresh()->wash_type_id)->toBe($current->id);
});

test('product and public catalog filters select matching washes while retaining stock eligibility', function () {
    $washType = WashType::factory()->create();
    $other = WashType::factory()->create();
    $matching = Product::factory()->create(['wash_type_id' => $washType->id]);
    $different = Product::factory()->create(['wash_type_id' => $other->id]);
    foreach ([$matching, $different] as $product) {
        $offer = StockOffer::factory()->replenishment()->for($product)->create();
        StockOfferVolume::factory()->for($offer)->withTotal(8)->create();
    }
    $hidden = Product::factory()->create(['wash_type_id' => $washType->id]);
    $offer = StockOffer::factory()->for($hidden)->create();
    StockOfferVolume::factory()->for($offer)->withTotal(8)->create();

    $this->actingAs(User::factory()->create())->get(route('products.index', ['wash_type' => $washType->id]))->assertInertia(fn (Assert $page) => $page->has('products.data', 2)->where('filters.wash_type', $washType->id));
    $this->get(route('catalog', ['wash_type' => $washType->id]))->assertInertia(fn (Assert $page) => $page->has('products.data', 1)->where('products.data.0.id', $matching->id)->where('products.data.0.wash_type', $washType->name)->where('filters.wash_type', $washType->id));
});
