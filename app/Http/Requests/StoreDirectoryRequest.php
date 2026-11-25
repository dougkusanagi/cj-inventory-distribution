<?php

namespace App\Http\Requests;

use App\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

class StoreDirectoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff() ?? false;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $name = $this->input('name');

        if (is_string($name)) {
            $this->merge(['name' => Str::squish($name)]);
        }
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['name' => 'nome da loja', 'is_active' => 'situação da loja'];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->has('name')) {
                return;
            }

            $store = $this->route('store');
            $stores = Store::withTrashed()
                ->where('name_key', Store::nameKey($this->string('name')->toString()));

            if ($store instanceof Store) {
                $stores->whereKeyNot($store->id);
            }

            if ($stores->exists()) {
                $validator->errors()->add('name', 'Já existe uma loja com esse nome.');
            }
        }];
    }
}
