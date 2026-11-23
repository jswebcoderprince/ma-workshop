<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\s-]+$/'],
            'email' => ['nullable', 'email', 'max:120'],
            'company_code' => ['nullable', 'string', 'max:20'],
            'vat_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Optional first vehicle when creating a customer.
            'vehicle' => ['sometimes', 'nullable', 'array'],
            'vehicle.make_model' => ['nullable', 'string', 'max:80'],
            'vehicle.type' => ['required_with:vehicle.make_model', 'nullable', Rule::in(['car', 'moto', 'water'])],
            'vehicle.year' => ['nullable', 'integer', 'between:1900,'.(date('Y') + 1)],
            'vehicle.plate' => ['nullable', 'string', 'max:15'],
            'vehicle.vin' => ['nullable', 'string', 'max:17', 'alpha_num'],
        ];
    }

    /** @return array<string, mixed> */
    public function customer(): array
    {
        return collect($this->validated())->except('vehicle')->all();
    }

    /** @return array<string, mixed>|null */
    public function vehicle(): ?array
    {
        $v = $this->validated('vehicle');

        return is_array($v) && filled($v['make_model'] ?? null) ? $v : null;
    }
}
