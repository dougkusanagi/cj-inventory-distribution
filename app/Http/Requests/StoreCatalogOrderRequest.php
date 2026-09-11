<?php

namespace App\Http\Requests;

use App\Http\Requests\Orders\StoreOrderRequest;

class StoreCatalogOrderRequest extends StoreOrderRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>|string> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'idempotency_key' => [
                'required',
                'string',
                'max:64',
                'regex:/^[A-Za-z0-9._:-]+$/',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        parent::prepareForValidation();

        if (! $this->input('idempotency_key')) {
            $this->merge(['idempotency_key' => $this->header('Idempotency-Key')]);
        }
    }
}
