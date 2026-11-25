<?php

namespace App\Http\Requests;

use App\Enums\CostSurchargeType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class SaveTechnicalSheetCostsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manageTechnicalCosts') ?? false;
    }

    /** @return array<string, list<string|Enum>> */
    public function rules(): array
    {
        return [
            'version' => ['required', 'integer', 'min:1'],
            'costs' => ['present', 'array', 'list', 'max:100'],
            'costs.*' => ['required', 'array:cost_item_id,amount,surcharge_type,surcharge_value'],
            'costs.*.cost_item_id' => ['required', 'integer', 'min:1', 'distinct'],
            'costs.*.amount' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'costs.*.surcharge_type' => ['nullable', 'required_with:costs.*.surcharge_value', Rule::enum(CostSurchargeType::class)],
            'costs.*.surcharge_value' => ['nullable', 'required_with:costs.*.surcharge_type', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'sale_prices' => ['present', 'array', 'list', 'max:100'],
            'sale_prices.*' => ['required', 'array:id,sale_price'],
            'sale_prices.*.id' => ['required', 'integer', 'min:1', 'distinct'],
            'sale_prices.*.sale_price' => ['present', 'nullable', 'numeric', 'decimal:0,2', 'min:0.01', 'max:9999999999.99'],
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
            'costs' => 'custos-base',
            'costs.*.cost_item_id' => 'custo-base',
            'costs.*.amount' => 'valor',
            'costs.*.surcharge_type' => 'tipo de acréscimo',
            'costs.*.surcharge_value' => 'acréscimo',
            'sale_prices.*.sale_price' => 'preço de venda',
        ];
    }
}
