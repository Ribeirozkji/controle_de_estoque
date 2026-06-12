<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FornecedorRequest;
use App\Models\Fornecedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FornecedorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Fornecedor::query()->withCount('produtos')->latest();

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($query) use ($search): void {
                $query->where('nome', 'like', "%{$search}%")
                    ->orWhere('cnpj', 'like', "%{$search}%")
                    ->orWhere('cidade', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(FornecedorRequest $request): JsonResponse
    {
        $fornecedor = Fornecedor::query()->create($request->validated());

        return response()->json($fornecedor, 201);
    }

    public function show(Fornecedor $fornecedor): JsonResponse
    {
        return response()->json($fornecedor->load(['produtos', 'historicoPrecos']));
    }

    public function update(FornecedorRequest $request, Fornecedor $fornecedor): JsonResponse
    {
        $fornecedor->update($request->validated());

        return response()->json($fornecedor->fresh());
    }

    public function destroy(Fornecedor $fornecedor): JsonResponse
    {
        $fornecedor->delete();

        return response()->noContent();
    }
}
