<?php

namespace Database\Factories;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'auditable_type' => (new Product)->getMorphClass(),
            'auditable_id' => Product::factory(),
            'action' => AuditAction::Created,
            'actor_id' => User::factory(),
            'before' => null,
            'after' => ['name' => fake()->word()],
            'context' => null,
            'occurred_at' => now(),
        ];
    }
}
