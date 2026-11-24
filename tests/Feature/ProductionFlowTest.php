<?php

use App\Enums\ProductionStage;
use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('shows recent batches in stock on the flow and keeps the stock total', function (): void {
    $admin = User::factory()->admin()->create();
    $cutting = ProductionBatch::factory()->create(['quantity' => 5, 'stage_entered_at' => now()->subDays(30)]);
    $recent = ProductionBatch::factory()->inStage(ProductionStage::Completed)
        ->create(['quantity' => 20, 'stage_entered_at' => now()->subDays(6)]);
    ProductionBatch::factory()->inStage(ProductionStage::Completed)
        ->create(['quantity' => 300, 'stage_entered_at' => now()->subDays(8)]);

    $this->actingAs($admin)->get(route('production.flow'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('production/flow')
            ->where('completedDays', 7)
            ->has('stages', count(ProductionStage::active()))
            ->where('stages.5.pieces', 320)
            ->has('batches', 2)
            ->where('batches.0.id', $cutting->id)
            ->where('batches.1.id', $recent->id));
});

it('uses the canvas and recent stock window on the main production route', function (): void {
    ProductionBatch::factory()->inStage(ProductionStage::Completed)
        ->create(['stage_entered_at' => now()->subDays(60)]);

    $this->actingAs(User::factory()->admin()->create())->get(route('production.index'))
        ->assertInertia(fn ($page) => $page->component('production/flow')->where('completedDays', 7)->has('batches', 0));
});

it('limits the flow to the sectors of a production user', function (): void {
    ProductionBatch::factory()->create();
    ProductionBatch::factory()->inStage(ProductionStage::Sewing)->create();

    $this->actingAs(User::factory()->production(ProductionStage::Sewing)->create())->get(route('production.flow'))
        ->assertInertia(fn ($page) => $page
            ->has('stages', 1)
            ->where('stages.0.value', 'sewing')
            ->has('batches', 1)
            ->where('auth.can.createProductionBatch', false)
            ->where('auth.can.manageWorkshops', false));
});

it('denies the flow to users outside production', function (): void {
    $this->actingAs(User::factory()->marketing()->create())
        ->get(route('production.flow'))->assertForbidden();
});

it('shares the production menu permissions with the administrator', function (): void {
    $this->actingAs(User::factory()->admin()->create())->get(route('production.flow'))
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.createProductionBatch', true)
            ->where('auth.can.manageWorkshops', true));
});

it('offers to undo an advance from the toast to whoever can undo it', function (): void {
    $admin = User::factory()->admin()->create();
    $batch = ProductionBatch::factory()->create();

    $this->actingAs($admin)->post(route('production.advance', $batch), [
        'stage' => 'cutting', 'target' => 'sewing', 'version' => 1,
    ])->assertInertiaFlash('toast.message', "Lote {$batch->fresh()->code} enviado para Costura.")
        ->assertInertiaFlash('toast.action.label', 'Desfazer')
        ->assertInertiaFlash('toast.action.url', route('production.undo', $batch, false))
        ->assertInertiaFlash('toast.action.data.version', 2);

    $this->post(route('production.undo', $batch), [
        'reason' => 'Desfeito pelo aviso logo após o envio.', 'version' => 2,
    ])->assertRedirect();
    expect($batch->fresh()->stage)->toBe(ProductionStage::Cutting);
});

it('does not offer to undo an advance to a production user', function (): void {
    $worker = User::factory()->production(ProductionStage::Cutting)->create();
    $batch = ProductionBatch::factory()->create();

    $this->actingAs($worker)->post(route('production.advance', $batch), [
        'stage' => 'cutting', 'target' => 'sewing', 'version' => 1,
    ])->assertInertiaFlash('toast.action', null);
});

it('offers only active products with their photos when creating a batch', function (): void {
    Storage::fake('public');
    $product = Product::factory()->create(['name' => 'Peça com fotos', 'is_active' => true]);
    $photo = $product->addMedia(UploadedFile::fake()->image('frente.jpg'))
        ->toMediaCollection(Product::MEDIA_COLLECTION);
    Product::factory()->create(['is_active' => false]);
    Product::factory()->create()->delete();

    $this->actingAs(User::factory()->admin()->create())->get(route('production.index'))
        ->assertInertia(fn ($page) => $page->has('products', 1)
            ->where('products.0.id', $product->id)
            ->where('products.0.images.0.id', $photo->id)
            ->where('products.0.images.0.url', fn (string $url): bool => str_starts_with($url, '/storage/')));

    $this->actingAs(User::factory()->production(ProductionStage::Sewing)->create())->get(route('production.index'))
        ->assertInertia(fn ($page) => $page->has('products', 0));
});
