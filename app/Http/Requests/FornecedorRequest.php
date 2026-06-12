<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FornecedorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $fornecedor = $this->route('fornecedor');
        $nomeUnico = Rule::unique('fornecedores', 'nome');

        if ($fornecedor) {
            $nomeUnico->ignore($fornecedor);
        }

        return [
            'nome' => ['required', 'string', 'max:120', $nomeUnico],
            'cnpj' => ['nullable', 'string', 'max:18'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:80'],
            'contato' => ['nullable', 'string', 'max:80'],
            'endereco' => ['nullable', 'string', 'max:200'],
            'cidade' => ['nullable', 'string', 'max:60'],
            'uf' => ['nullable', 'string', 'size:2'],
            'obs' => ['nullable', 'string'],
        ];
    }
}
