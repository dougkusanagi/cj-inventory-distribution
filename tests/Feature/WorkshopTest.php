<?php

use App\Actions\Production\ManageProductionBatch;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Enums\WorkshopType;
use App\Models\Product;
use App\Models\User;
use App\Models\Workshop;
use Illuminate\Validation\ValidationException;

it('allows production workers to create a workshop and prevents duplicate names for its type', function (): void {
    $worker = User::factory()->create(['role' => UserRole::Production, 'is_active' => true]);
    $this->actingAs($worker)->postJson(route('workshops.store'), ['name' => '  Oficina Horizonte  ', 'type' => 'sewing'])
        ->assertCreated()->assertJsonPath('name', 'Oficina Horizonte');
    $this->postJson(route('workshops.store'), ['name' => 'Oficina Horizonte', 'type' => 'sewing'])
        ->assertUnprocessable()->assertJsonValidationErrors('name');
    $this->postJson(route('workshops.store'), ['name' => 'Oficina Horizonte', 'type' => 'washing'])->assertCreated();
    expect(Workshop::query()->count())->toBe(2);
});

it('restricts workshop maintenance to administrators and validates its type', function (): void {
    $workshop = Workshop::factory()->create();
    $worker = User::factory()->create(['role' => UserRole::Production, 'is_active' => true]);
    $this->actingAs($worker)->patchJson(route('workshops.update', $workshop), ['name' => 'Nova', 'type' => 'sewing', 'is_active' => false])->assertForbidden();
    $this->actingAs(User::factory()->marketing()->create())->postJson(route('workshops.store'), ['name' => 'Teste', 'type' => 'sewing'])->assertForbidden();
    $this->actingAs(User::factory()->admin()->create())->postJson(route('workshops.store'), ['name' => 'Teste', 'type' => 'cutting'])->assertUnprocessable()->assertJsonValidationErrors('type');
    $this->patchJson(route('workshops.update', $workshop), ['name' => 'Nova', 'type' => 'sewing', 'is_active' => false])->assertOk();
    expect($workshop->fresh()->is_active)->toBeFalse();
});

it('assigns an active matching workshop during advancement and restores the previous one when undoing', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 8, null, $admin);
    $sewing = Workshop::factory()->create(['type' => WorkshopType::Sewing]);
    $washing = Workshop::factory()->create(['type' => WorkshopType::Washing]);
    $inactive = Workshop::factory()->create(['type' => WorkshopType::Sewing, 'is_active' => false]);

    expect(fn () => $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $washing->id))->toThrow(ValidationException::class)
        ->and(fn () => $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $inactive->id))->toThrow(ValidationException::class);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin, $sewing->id);
    expect($batch->workshop_id)->toBe($sewing->id)->and($batch->events()->reorder('id', 'desc')->first()->to_workshop_name)->toBe($sewing->name);
    $batch = $action->receive($batch, $batch->version, $admin);
    $batch = $action->advance($batch, $batch->stage, ProductionStage::Washing, $batch->version, $admin, $washing->id);
    $batch = $action->undo($batch, 'Envio incorreto', $batch->version, $admin);
    expect($batch->workshop_id)->toBe($sewing->id)->and($batch->stage)->toBe(ProductionStage::Sewing);
});

it('validates workshop assignments at the endpoint and keeps historical names after a rename', function (): void {
    $admin = User::factory()->admin()->create();
    $batch = app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 6, null, $admin);
    $wrong = Workshop::factory()->create(['type' => WorkshopType::Washing]);
    $correct = Workshop::factory()->create(['type' => WorkshopType::Sewing, 'name' => 'Oficina Original']);
    $payload = ['stage' => 'cutting', 'target' => 'sewing', 'version' => 1, 'workshop_id' => $wrong->id];
    $this->actingAs($admin)->post(route('production.advance', $batch), $payload)->assertInvalid('workshop_id');
    expect($batch->fresh()->stage)->toBe(ProductionStage::Cutting);
    $payload['workshop_id'] = $correct->id;
    $this->post(route('production.advance', $batch), $payload)->assertRedirect();
    $this->patchJson(route('workshops.update', $correct), ['name' => 'Oficina Nova', 'type' => 'washing', 'is_active' => true])->assertUnprocessable()->assertJsonValidationErrors('type');
    $this->patchJson(route('workshops.update', $correct), ['name' => 'Oficina Nova', 'type' => 'sewing', 'is_active' => false])->assertOk();
    $this->get(route('production.index'))->assertInertia(fn ($page) => $page->where('batches.0.workshop', 'Oficina Nova')->where('batches.0.events.1.workshop', 'Oficina Original'));
});
