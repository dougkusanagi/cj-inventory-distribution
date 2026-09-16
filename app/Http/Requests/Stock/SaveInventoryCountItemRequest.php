<?php

namespace App\Http\Requests\Stock;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveInventoryCountItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isStaff() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'version' => ['required', 'integer', 'min:1'],
            'items' => ['present', 'array', 'max:50'],
            'items.*' => ['array:id,size,is_active,quantity'],
            'items.*.id' => ['nullable', 'integer', 'min:1'],
            'items.*.size' => ['nullable', 'string', 'max:30'],
            'items.*.is_active' => ['required', 'boolean'],
            'items.*.quantity' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'total_quantity' => ['nullable', 'integer', 'min:0', 'max:50000000'],
        ];
    }
}
