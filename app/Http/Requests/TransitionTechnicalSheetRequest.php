<?php

namespace App\Http\Requests;

use App\Enums\TechnicalSheetStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class TransitionTechnicalSheetRequest extends FormRequest
{
    /** @return array<string, list<string|Enum>> */
    public function rules(): array
    {
        return [
            'version' => ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::enum(TechnicalSheetStatus::class)],
            'reason' => ['required_if:status,draft', 'nullable', 'string', 'max:1000'],
        ];
    }

    public function attributes(): array
    {
        return ['reason' => 'motivo da devolução'];
    }
}
