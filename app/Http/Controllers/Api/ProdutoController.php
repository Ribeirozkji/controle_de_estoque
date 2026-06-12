<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProdutoRequest;
use App\Models\Produto;
use App\Services\EstoqueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function __construct(private readonly EstoqueService $estoqueService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Produto::query()->with('fornecedor')->latest();

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($query) use ($search): void {
                $query->where('nome', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('categoria', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('estoque_baixo')) {
            $query->whereColumn('estoque_atual', '<=', 'estoque_minimo');
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(ProdutoRequest $request): JsonResponse
    {
        $produto = Produto::query()->create($request->validated());
        $this->estoqueService->registrarPrecoInicial($produto);

        return response()->json($produto->load('fornecedor'), 201);
    }

    public function show(Produto $produto): JsonResponse
    {
        return response()->json($produto->load(['fornecedor', 'movimentacoes', 'historicoPrecos']));
    }

    public function update(ProdutoRequest $request, Produto $produto): JsonResponse
    {
        $produto->update($request->validated());

        return response()->json($produto->fresh('fornecedor'));
    }

    public function destroy(Produto $produto): JsonResponse
    {
        $produto->delete();

        return response()->noContent();
    }
}
