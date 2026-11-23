<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MechanicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60'],
            'vehicle_types' => ['required', 'array', 'min:1'],
            'vehicle_types.*' => ['distinct', Rule::in(['car', 'moto', 'water'])],
            'work_days' => ['required', 'array', 'min:1'],
            'work_days.*' => ['distinct', 'integer', 'between:1,7'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'active' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, mixed> */
    public function values(): array
    {
        $v = $this->validated();
        $v['work_days'] = array_values(array_map('intval', $v['work_days']));
        sort($v['work_days']);

        return $v;
    }
}
