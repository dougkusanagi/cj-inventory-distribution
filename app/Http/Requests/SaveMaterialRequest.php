<?php

namespace App\Http\Requests;

use App\Enums\MaterialType;
use App\Enums\MaterialUnit;
use App\Models\Material;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        $material = $this->route('material');

        return ($material instanceof Material
            ? $this->user()?->can('update', $material)
            : $this->user()?->can('create', Material::class)) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::enum(MaterialType::class)],
            'unit' => ['required', Rule::enum(MaterialUnit::class)],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'nome', 'type' => 'tipo', 'unit' => 'unidade', 'is_active' => 'insumo ativo'];
    }
}
