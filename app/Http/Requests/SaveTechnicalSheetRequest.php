<?php

namespace App\Http\Requests;

use App\Enums\TechnicalMaterialRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class SaveTechnicalSheetRequest extends FormRequest
{
    /** @return array<string, list<string|Enum>> */
    public function rules(): array
    {
        return [
            'version' => ['required', 'integer', 'min:1'],
            'instructions' => ['present', 'nullable', 'string', 'max:10000'],
            'materials' => ['present', 'array', 'list', 'max:100'],
            'materials.*' => ['required', 'array:material_id,role,quantity'],
            'materials.*.material_id' => ['required', 'integer', 'min:1'],
            'materials.*.role' => ['required', Rule::enum(TechnicalMaterialRole::class)],
            'materials.*.quantity' => ['required', 'numeric', 'decimal:0,3', 'min:0.001', 'max:999999999.999'],
            'costs' => ['missing'],
            'costFinal' => ['missing'],
            'margin' => ['missing'],
            'profit' => ['missing'],
            'baseTotal' => ['missing'],
            'materialCost' => ['missing'],
        ];
    }

    public function attributes(): array
    {
        return [
            'instructions' => 'instruções',
            'materials' => 'insumos',
            'materials.*.material_id' => 'insumo',
            'materials.*.role' => 'função do insumo',
            'materials.*.quantity' => 'quantidade',
        ];
    }
}
