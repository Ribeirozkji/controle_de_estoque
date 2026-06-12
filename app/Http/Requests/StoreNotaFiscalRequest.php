<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNotaFiscalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'natureza_operacao' => ['required', 'string', 'max:60'],
            'tipo' => ['nullable', Rule::in(['entrada', 'saida'])],
            'destinatario' => ['required', 'array'],
            'destinatario.nome' => ['required', 'string', 'max:120'],
            'destinatario.cpf' => ['nullable', 'string', 'max:14'],
            'destinatario.cnpj' => ['nullable', 'string', 'max:18'],
            'destinatario.email' => ['nullable', 'email', 'max:80'],
            'destinatario.logradouro' => ['nullable', 'string', 'max:120'],
            'destinatario.numero' => ['nullable', 'string', 'max:10'],
            'destinatario.bairro' => ['nullable', 'string', 'max:60'],
            'destinatario.cidade' => ['nullable', 'string', 'max:60'],
            'destinatario.uf' => ['nullable', 'string', 'size:2'],
            'destinatario.cep' => ['nullable', 'string', 'max:9'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.descricao' => ['required', 'string', 'max:120'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'itens.*.valor_unitario' => ['required', 'numeric', 'min:0'],
            'itens.*.unidade_comercial' => ['nullable', 'string', 'max:5'],
            'itens.*.ncm' => ['nullable', 'string', 'max:8'],
            'itens.*.cfop' => ['nullable', 'string', 'max:4'],
            'informacoes_adicionais' => ['nullable', 'string'],
        ];
    }
}
