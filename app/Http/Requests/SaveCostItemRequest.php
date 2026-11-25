<?php

namespace App\Http\Requests;

use App\Enums\CostSurchargeType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class SaveCostItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manageTechnicalCosts') ?? false;
    }

    /** @return array<string, list<string|Enum>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'default_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'surcharge_type' => ['nullable', 'required_with:surcharge_value', Rule::enum(CostSurchargeType::class)],
            'surcharge_value' => [
                'nullable', 'required_with:surcharge_type', 'numeric', 'decimal:0,2', 'min:0',
                $this->input('surcharge_type') === CostSurchargeType::Percent->value ? 'max:100' : 'max:9999999999.99',
            ],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'default_amount' => 'valor padrão',
            'surcharge_type' => 'tipo de acréscimo',
            'surcharge_value' => 'valor do acréscimo',
            'is_active' => 'custo ativo',
        ];
    }
}
