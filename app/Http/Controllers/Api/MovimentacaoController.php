<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MovimentacaoRequest;
use App\Models\Movimentacao;
use App\Services\EstoqueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovimentacaoController extends Controller
{
    public function __construct(private readonly EstoqueService $estoqueService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Movimentacao::query()->with('produto.fornecedor')->latest();

        if ($tipo = $request->string('tipo')->toString()) {
            $query->where('tipo', $tipo);
        }

        if ($produtoId = $request->integer('produto_id')) {
            $query->where('produto_id', $produtoId);
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(MovimentacaoRequest $request): JsonResponse
    {
        $movimentacao = $this->estoqueService->registrarMovimentacao($request->validated());

        return response()->json($movimentacao, 201);
    }

    public function show(Movimentacao $movimentacao): JsonResponse
    {
        return response()->json($movimentacao->load('produto.fornecedor'));
    }
}
