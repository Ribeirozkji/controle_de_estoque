<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Fornecedor;
use App\Models\Movimentacao;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $movimentacoes = Movimentacao::query()
            ->selectRaw("COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN quantidade ELSE 0 END), 0) as entradas")
            ->selectRaw("COALESCE(SUM(CASE WHEN tipo = 'saida' THEN quantidade ELSE 0 END), 0) as saidas")
            ->first();

        $valorTotal = Produto::query()
            ->select(DB::raw('COALESCE(SUM(estoque_atual * preco_custo), 0) as total'))
            ->value('total');

        return response()->json([
            'valor_em_estoque' => (float) $valorTotal,
            'total_produtos' => Produto::query()->count(),
            'total_fornecedores' => Fornecedor::query()->count(),
            'abaixo_minimo' => Produto::query()->whereColumn('estoque_atual', '<=', 'estoque_minimo')->count(),
            'sem_estoque' => Produto::query()->where('estoque_atual', 0)->count(),
            'movimentacoes' => [
                'entradas' => (int) $movimentacoes->entradas,
                'saidas' => (int) $movimentacoes->saidas,
            ],
            'ultimas_movimentacoes' => Movimentacao::query()
                ->with('produto:id,nome,sku')
                ->latest()
                ->limit(5)
                ->get(),
        ]);
    }
}
