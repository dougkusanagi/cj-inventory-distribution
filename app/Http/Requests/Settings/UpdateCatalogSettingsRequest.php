<?php

namespace App\Http\Requests\Settings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCatalogSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'whatsapp_number' => ['required', 'string', 'regex:/^55[1-9][0-9]{9,10}$/'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $whatsapp = preg_replace('/\D+/', '', (string) $this->input('whatsapp_number'));

        $hasCountryCode = str_starts_with($whatsapp, '55') && strlen($whatsapp) > 11;

        if ($whatsapp !== '' && ! $hasCountryCode) {
            $whatsapp = '55'.$whatsapp;
        }

        $this->merge([
            'whatsapp_number' => $whatsapp,
        ]);
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'whatsapp_number.required' => 'Informe o WhatsApp que receberá os pedidos.',
            'whatsapp_number.regex' => 'Informe um número brasileiro com DDI 55, DDD e telefone.',
        ];
    }
}
