<?php

use App\Actions\Production\ManageProductionBatch;
use App\Actions\Users\SyncProductionStages;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\ProductionStageAssignment;
use App\Models\StockMovement;
use App\Models\StockOfferVolume;
use App\Models\User;
use Database\Seeders\ProductionDemoSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

function productionWorker(ProductionStage $stage): User
{
    $user = User::factory()->create(['role' => UserRole::Production]);
    DB::table('production_stage_user')->insert(['user_id' => $user->id, 'stage' => $stage->value]);

    return $user;
}

it('creates an identified cutting batch and its first event', function (): void {
    $worker = productionWorker(ProductionStage::Cutting);
    $product = Product::factory()->create(['is_active' => true]);
    $batch = app(ManageProductionBatch::class)->create($product, 12, null, $worker);

    expect($batch->code)->toBe('L-'.str_pad((string) $batch->id, 6, '0', STR_PAD_LEFT))
        ->and($batch->stage)->toBe(ProductionStage::Cutting)
        ->and($batch->quantity)->toBe(12)
        ->and($batch->received_by)->toBeNull()
        ->and($batch->events()->sole()->actor_id)->toBe($worker->id);
});

it('rejects inactive products and unauthorized workers', function (): void {
    $action = app(ManageProductionBatch::class);
    $product = Product::factory()->create(['is_active' => false]);
    $admin = User::factory()->admin()->create();

    expect(fn () => $action->create($product, 5, null, $admin))->toThrow(ValidationException::class);
    $product->update(['is_active' => true]);
    expect(fn () => $action->create($product, 5, null, productionWorker(ProductionStage::Sewing)))->toThrow(AuthorizationException::class);
    expect(ProductionBatch::query()->count())->toBe(0);
});

it('moves only to the next stage and rejects stale versions', function (): void {
    $action = app(ManageProductionBatch::class);
    $worker = productionWorker(ProductionStage::Cutting);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 7, null, $worker);
    $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $worker);

    expect($batch->fresh()->stage)->toBe(ProductionStage::Sewing)
        ->and($batch->fresh()->version)->toBe(2)
        ->and($batch->events()->count())->toBe(2);
    expect(fn () => $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $worker))->toThrow(ValidationException::class, 'Este lote já foi movido para Costura por '.$worker->name.'.');
    $admin = User::factory()->admin()->create();
    expect(fn () => $action->advance($batch, ProductionStage::Sewing, ProductionStage::Dyeing, 2, $admin))->toThrow(ValidationException::class);
    expect($batch->events()->count())->toBe(2);
});

it('completes without changing stock and lets an administrator undo with a reason', function (): void {
    $action = app(ManageProductionBatch::class);
    $admin = User::factory()->admin()->create();
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 6, null, $admin);
    foreach ([ProductionStage::Sewing, ProductionStage::Washing, ProductionStage::Dyeing, ProductionStage::Finishing, ProductionStage::Bagging, ProductionStage::Completed] as $target) {
        if ($batch->received_at === null) {
            $batch = $action->receive($batch, $batch->version, $admin);
        }
        $batch = $action->advance($batch, $batch->stage, $target, $batch->version, $admin);
    }
    expect($batch->completed_at)->not->toBeNull()
        ->and($batch->received_by)->toBeNull()
        ->and(StockOfferVolume::count())->toBe(0)
        ->and(StockMovement::count())->toBe(0);
    expect(fn () => $action->undo($batch, '', $batch->version, $admin))->toThrow(ValidationException::class);
    $batch = $action->undo($batch, 'Envio incorreto', $batch->version, $admin);
    expect($batch->stage)->toBe(ProductionStage::Bagging)
        ->and($batch->completed_at)->toBeNull()
        ->and($batch->events()->count())->toBe(13);
    expect(fn () => $action->undo($batch, 'Outra tentativa', $batch->version, $admin))->toThrow(ValidationException::class);
});

it('restricts advancement and undo to permitted people', function (): void {
    $action = app(ManageProductionBatch::class);
    $admin = User::factory()->admin()->create();
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 3, null, $admin);
    $other = productionWorker(ProductionStage::Sewing);
    expect(fn () => $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $other))->toThrow(AuthorizationException::class);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);
    expect(fn () => $action->undo($batch, 'Engano', $batch->version, $other))->toThrow(AuthorizationException::class);
    expect($batch->fresh()->stage)->toBe(ProductionStage::Sewing);
});

it('allows only the administrator to remove a batch that has never advanced', function (): void {
    $action = app(ManageProductionBatch::class);
    $admin = User::factory()->admin()->create();
    $worker = productionWorker(ProductionStage::Cutting);
    $product = Product::factory()->create(['is_active' => true]);
    $batch = $action->create($product, 2, null, $admin);
    expect(fn () => $action->delete($batch, $batch->version, $worker))->toThrow(AuthorizationException::class);
    $action->delete($batch, $batch->version, $admin);
    $this->assertSoftDeleted($batch);

    $batch = $action->create($product, 2, null, $admin);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);
    $batch = $action->undo($batch, 'Engano', $batch->version, $admin);
    expect(fn () => $action->delete($batch, $batch->version, $admin))->toThrow(ValidationException::class);
    expect($batch->fresh()->deleted_at)->toBeNull();
});

it('shows only the sectors assigned to production users and denies stock operations', function (): void {
    $admin = User::factory()->admin()->create();
    $worker = productionWorker(ProductionStage::Cutting);
    $action = app(ManageProductionBatch::class);
    $product = Product::factory()->create(['is_active' => true]);
    $cutting = $action->create($product, 4, null, $admin);
    $sewing = $action->create($product, 8, null, $admin);
    $action->advance($sewing, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);

    $this->actingAs($worker)->get(route('production.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('production/index')
            ->has('batches', 1)
            ->where('batches.0.id', $cutting->id)
            ->has('stages', 1)
            ->where('stages.0.pieces', 4));
    $this->get(route('products.index'))->assertForbidden();
    $this->get(route('orders.index'))->assertForbidden();
    $this->get(route('catalog'))->assertForbidden();
    $this->post(route('catalog-orders.store'), [])->assertForbidden();
});

it('lets an administrator assign sectors and production users cannot access other sectors', function (): void {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->post(route('users.store'), [
        'name' => 'Responsável pela costura',
        'email' => 'costura@example.test',
        'role' => 'production',
        'production_stages' => ['sewing', 'washing'],
    ])->assertRedirect();
    $worker = User::query()->where('email', 'costura@example.test')->sole();
    expect($worker->canManageProductionStage(ProductionStage::Sewing))->toBeTrue()
        ->and($worker->canManageProductionStage(ProductionStage::Cutting))->toBeFalse();
    $this->actingAs($admin)->put(route('users.update', $worker), [
        'name' => $worker->name,
        'email' => $worker->email,
        'role' => 'production',
        'is_active' => true,
        'production_stages' => ['cutting'],
    ])->assertRedirect();
    expect($worker->fresh()->canManageProductionStage(ProductionStage::Cutting))->toBeTrue()
        ->and($worker->fresh()->canManageProductionStage(ProductionStage::Sewing))->toBeFalse();
});

it('validates stage assignments and prevents stale corrections', function (): void {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->post(route('users.store'), [
        'name' => 'Pessoa', 'email' => 'pessoa@example.test', 'role' => 'production', 'production_stages' => [],
    ])->assertInvalid('production_stages');
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 2, null, $admin);
    $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, 1, $admin);
    expect(fn () => $action->undo($batch, 'Engano', 1, $admin))->toThrow(ValidationException::class)
        ->and(fn () => $action->delete($batch, 1, $admin))->toThrow(ValidationException::class)
        ->and($batch->fresh()->stage)->toBe(ProductionStage::Sewing);
});

it('seeds identifiable production batches in every stage without duplicating them', function (): void {
    User::factory()->admin()->create(['email' => 'test@example.com']);
    Product::factory()->create(['is_active' => true]);
    $this->seed(ProductionDemoSeeder::class);
    $this->seed(ProductionDemoSeeder::class);

    expect(ProductionBatch::query()->count())->toBe(10)
        ->and(ProductionBatch::query()->where('stage', 'cutting')->whereNull('split_at')->sole()->quantity)->toBe(1)
        ->and(ProductionBatch::query()->whereNotNull('parent_id')->sum('quantity'))->toBe(1000)
        ->and(ProductionBatch::query()->whereNotNull('parent_id')->with('items')->get()->sum(fn (ProductionBatch $batch) => $batch->items->sum('quantity')))->toBe(1000)
        ->and(ProductionBatch::query()->where('stage', 'completed')->sole()->quantity)->toBe(1000000);
});

it('denies production endpoints to other roles before validating input', function (): void {
    $admin = User::factory()->admin()->create();
    $batch = app(ManageProductionBatch::class)->create(Product::factory()->create(['is_active' => true]), 1, null, $admin);
    $this->actingAs(User::factory()->marketing()->create())
        ->get(route('production.index'))->assertForbidden();
    $this->post(route('production.advance', $batch), [])->assertForbidden();
    $this->delete(route('production.destroy', $batch), [])->assertForbidden();
});

it('audits the assignment and removal of production sectors', function (): void {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->post(route('users.store'), [
        'name' => 'Pessoa da produção', 'email' => 'producao-auditoria@example.test',
        'role' => 'production', 'production_stages' => ['sewing'],
    ])->assertRedirect();
    $worker = User::query()->where('email', 'producao-auditoria@example.test')->sole();
    $this->actingAs($admin)->put(route('users.update', $worker), [
        'name' => $worker->name, 'email' => $worker->email, 'role' => 'production',
        'is_active' => true, 'production_stages' => ['washing'],
    ])->assertRedirect();
    $logs = AuditLog::query()->where('auditable_type', ProductionStageAssignment::class)->orderBy('id')->get();
    expect($logs)->toHaveCount(3)
        ->and($logs[0]->after['stage'])->toBe('sewing')
        ->and($logs[1]->before['stage'])->toBe('sewing')
        ->and($logs[2]->after['stage'])->toBe('washing')
        ->and($logs[2]->actor_id)->toBe($admin->id);
});

it('enforces the same quantity limits in the operation and the form endpoint', function (): void {
    $admin = User::factory()->admin()->create();
    $product = Product::factory()->create(['is_active' => true]);
    $action = app(ManageProductionBatch::class);
    foreach ([0, ProductionBatch::MAX_QUANTITY + 1] as $quantity) {
        expect(fn () => $action->create($product, $quantity, null, $admin))->toThrow(ValidationException::class);
        $this->actingAs($admin)->post(route('production.store'), [
            'product_id' => $product->id, 'quantity' => $quantity,
        ])->assertInvalid('quantity');
    }
    expect(ProductionBatch::query()->count())->toBe(0);
});

it('restores an existing sector assignment without duplicating its history', function (): void {
    $worker = productionWorker(ProductionStage::Sewing);
    $sync = app(SyncProductionStages::class);
    $sync->handle($worker, []);
    expect($worker->canManageProductionStage(ProductionStage::Sewing))->toBeFalse();
    $sync->handle($worker, ['sewing']);
    expect($worker->canManageProductionStage(ProductionStage::Sewing))->toBeTrue()
        ->and(ProductionStageAssignment::withTrashed()->where('user_id', $worker->id)->count())->toBe(1);
});

it('requires the destination sector to receive a batch before advancing it', function (): void {
    $admin = User::factory()->admin()->create();
    $cutting = productionWorker(ProductionStage::Cutting);
    $sewing = productionWorker(ProductionStage::Sewing);
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 8, null, $cutting);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, $batch->version, $cutting);

    expect($batch->received_at)->toBeNull();
    $this->actingAs($sewing)->get(route('production.index'))->assertInertia(fn ($page) => $page
        ->where('batches.0.awaiting_receipt', true)
        ->where('stages.0.awaiting_batches', 1));
    expect(fn () => $action->advance($batch, ProductionStage::Sewing, ProductionStage::Washing, $batch->version, $sewing))->toThrow(ValidationException::class);
    $this->actingAs($cutting)->post(route('production.receive', $batch), ['version' => $batch->version])->assertForbidden();
    $this->actingAs($sewing)->post(route('production.receive', $batch), ['version' => $batch->version])->assertRedirect();

    $received = $batch->fresh();
    expect($received->received_at)->not->toBeNull()
        ->and($received->received_by)->toBe($sewing->id)
        ->and($received->version)->toBe(3)
        ->and($received->events()->count())->toBe(3);
    $this->post(route('production.receive', $batch), ['version' => 2])->assertInvalid('version');
    $next = $action->advance($received, ProductionStage::Sewing, ProductionStage::Washing, $received->version, $sewing);
    expect($next->stage)->toBe(ProductionStage::Washing)->and($next->received_at)->toBeNull();
    $undone = $action->undo($next, 'Envio incorreto', $next->version, $admin);
    expect($undone->stage)->toBe(ProductionStage::Sewing)->and($undone->received_at)->not->toBeNull();
});

it('can undo an advance after its receipt without erasing either event', function (): void {
    $admin = User::factory()->admin()->create();
    $action = app(ManageProductionBatch::class);
    $batch = $action->create(Product::factory()->create(['is_active' => true]), 4, null, $admin);
    $batch = $action->advance($batch, ProductionStage::Cutting, ProductionStage::Sewing, $batch->version, $admin);
    $batch = $action->receive($batch, $batch->version, $admin);
    $this->actingAs($admin)->get(route('production.index'))->assertInertia(fn ($page) => $page->where('batches.0.can_undo', true));

    $batch = $action->undo($batch, 'Correção', $batch->version, $admin);

    expect($batch->stage)->toBe(ProductionStage::Cutting)
        ->and($batch->received_at)->not->toBeNull()
        ->and($batch->received_by)->toBeNull()
        ->and($batch->events()->count())->toBe(4);
    expect(fn () => $action->undo($batch, 'Outra correção', $batch->version, $admin))->toThrow(ValidationException::class);
});
