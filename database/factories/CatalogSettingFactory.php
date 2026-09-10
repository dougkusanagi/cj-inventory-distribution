<?php

namespace Database\Factories;

use App\Models\CatalogSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CatalogSetting>
 */
class CatalogSettingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'whatsapp_number' => '5511999999999',
        ];
    }
}
