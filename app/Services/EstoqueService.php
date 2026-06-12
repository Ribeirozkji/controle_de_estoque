<?php

namespace App\Services;

use App\Models\HistoricoPreco;
use App\Models\Movimentacao;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EstoqueService
{
    public function registrarMovimentacao(array $data): Movimentacao
    {
        return DB::transaction(function () use ($data): Movimentacao {
            $produto = Produto::query()
                ->lockForUpdate()
                ->findOrFail($data['produto_id']);

            $quantidade = (int) $data['quantidade'];
            $novoEstoque = $data['tipo'] === 'entrada'
                ? $produto->estoque_atual + $quantidade
                : $produto->estoque_atual - $quantidade;

            if ($novoEstoque < 0) {
                throw ValidationException::withMessages([
                    'quantidade' => 'Estoque insuficiente para registrar a saida.',
                ]);
            }

            $movimentacao = $produto->movimentacoes()->create([
                'tipo' => $data['tipo'],
                'quantidade' => $quantidade,
                'motivo' => $data['motivo'],
                'data' => $data['data'],
                'observacao' => $data['observacao'] ?? null,
            ]);

            $produto->forceFill(['estoque_atual' => $novoEstoque])->save();

            return $movimentacao->load('produto.fornecedor');
        });
    }

    public function registrarPrecoInicial(Produto $produto): void
    {
        if ((float) $produto->preco_custo <= 0) {
            return;
        }

        HistoricoPreco::query()->create([
            'produto_id' => $produto->id,
            'fornecedor_id' => $produto->fornecedor_id,
            'preco' => $produto->preco_custo,
            'data' => now()->toDateString(),
            'obs' => 'Preco inicial do produto.',
        ]);
    }
}
