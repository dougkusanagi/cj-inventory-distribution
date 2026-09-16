<?php

namespace Database\Factories;

use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => StockMovementType::In,
            'source' => StockMovementSource::Manual,
            'actor_id' => User::factory(),
            'order_id' => null,
            'reversal_of_id' => null,
            'reason' => fake()->sentence(),
            'notes' => null,
            'idempotency_key' => 'movement-'.fake()->unique()->uuid(),
            'payload_hash' => hash('sha256', fake()->uuid()),
            'occurred_at' => now(),
        ];
    }
}
