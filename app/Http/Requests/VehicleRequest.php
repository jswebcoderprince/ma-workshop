<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['car', 'moto', 'water'])],
            'make_model' => ['required', 'string', 'max:80'],
            'year' => ['nullable', 'integer', 'between:1900,'.(date('Y') + 1)],
            'plate' => ['nullable', 'string', 'max:15'],
            'vin' => ['nullable', 'string', 'max:17', 'alpha_num'],
        ];
    }
}
