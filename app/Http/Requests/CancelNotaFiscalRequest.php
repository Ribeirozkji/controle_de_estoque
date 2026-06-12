<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CancelNotaFiscalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'justificativa' => ['required', 'string', 'min:15', 'max:255'],
        ];
    }
}
