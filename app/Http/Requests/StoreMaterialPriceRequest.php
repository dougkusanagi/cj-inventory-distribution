<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMaterialPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manageTechnicalCosts') ?? false;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'unit_price' => ['required', 'numeric', 'decimal:0,4', 'min:0', 'max:99999999.9999'],
            'effective_from' => ['required', 'date_format:Y-m-d', 'after_or_equal:1900-01-01', 'before_or_equal:9999-12-31'],
        ];
    }

    public function attributes(): array
    {
        return ['unit_price' => 'preço unitário', 'effective_from' => 'início da vigência'];
    }
}
