<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CancelNotaFiscalRequest;
use App\Http\Requests\StoreNotaFiscalRequest;
use App\Models\NotaFiscal;
use App\Services\NotaFiscalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotaFiscalController extends Controller
{
    public function __construct(private readonly NotaFiscalService $notaFiscalService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = NotaFiscal::query()->with('itens')->latest();

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreNotaFiscalRequest $request): JsonResponse
    {
        $notaFiscal = $this->notaFiscalService->emitir($request->validated());

        return response()->json($notaFiscal, 201);
    }

    public function show(NotaFiscal $notaFiscal): JsonResponse
    {
        return response()->json($notaFiscal->load('itens'));
    }

    public function cancelar(CancelNotaFiscalRequest $request, NotaFiscal $notaFiscal): JsonResponse
    {
        $notaFiscal = $this->notaFiscalService->cancelar(
            $notaFiscal,
            $request->validated('justificativa')
        );

        return response()->json($notaFiscal);
    }
}
