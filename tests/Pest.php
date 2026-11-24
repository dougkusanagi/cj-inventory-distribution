<?php

use App\Models\Product;
use App\Models\ProductionBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Browser');

pest()->in('Browser')->beforeEach(function (): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));
});

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/** @param array<int, array{size: string, quantity: int}> $sizes */
function receivedCuttingBatch(Product $product, int $quantity, ?string $notes, User $actor, array $sizes = []): ProductionBatch
{
    $batch = ProductionBatch::factory()->create([
        'product_id' => $product->id, 'quantity' => $quantity, 'notes' => $notes, 'created_by' => $actor->id,
    ]);
    $batch->events()->create([
        'from_stage' => null, 'to_stage' => 'cutting', 'quantity' => $quantity,
        'actor_id' => $actor->id, 'occurred_at' => now(),
    ]);
    foreach ($sizes as $index => $item) {
        $batch->items()->create([...$item, 'sort_order' => $index]);
    }

    return $batch;
}
