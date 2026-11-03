<?php

namespace Database\Factories;

use App\Enums\WorkshopType;
use App\Models\Workshop;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Workshop> */
class WorkshopFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return ['name' => $name, 'slug' => Str::slug($name), 'type' => WorkshopType::Sewing, 'is_active' => true];
    }
}
