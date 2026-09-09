<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->numerify('PED-######'),
            'store_name' => fake()->company(),
            'requester_name' => fake()->name(),
            'whatsapp' => fake()->numerify('55119########'),
            'notes' => fake()->optional()->sentence(),
            'status' => OrderStatus::Pending,
            'submitted_at' => now(),
        ];
    }
}
