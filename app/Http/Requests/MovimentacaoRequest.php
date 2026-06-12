<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MovimentacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'tipo' => ['required', Rule::in(['entrada', 'saida'])],
            'quantidade' => ['required', 'integer', 'min:1'],
            'motivo' => ['required', 'string', 'max:60'],
            'data' => ['required', 'date'],
            'observacao' => ['nullable', 'string'],
        ];
    }
}
