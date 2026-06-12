<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $produto = $this->route('produto');
        $skuUnico = Rule::unique('produtos', 'sku');

        if ($produto) {
            $skuUnico->ignore($produto);
        }

        return [
            'sku' => ['required', 'string', 'max:30', $skuUnico],
            'nome' => ['required', 'string', 'max:120'],
            'categoria' => ['required', 'string', 'max:30'],
            'fornecedor_id' => ['nullable', 'integer', 'exists:fornecedores,id'],
            'preco_custo' => ['nullable', 'numeric', 'min:0'],
            'preco_venda' => ['nullable', 'numeric', 'min:0'],
            'estoque_atual' => ['nullable', 'integer', 'min:0'],
            'estoque_minimo' => ['nullable', 'integer', 'min:0'],
            'estoque_maximo' => ['nullable', 'integer', 'min:0'],
            'unidade' => ['nullable', 'string', 'max:5'],
            'localizacao' => ['nullable', 'string', 'max:30'],
            'lead_time' => ['nullable', 'integer', 'min:0'],
            'validade' => ['nullable', 'date'],
        ];
    }
}
