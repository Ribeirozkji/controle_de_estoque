<?php

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FornecedorController;
use App\Http\Controllers\Api\MovimentacaoController;
use App\Http\Controllers\Api\NotaFiscalController;
use App\Http\Controllers\Api\ProdutoController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard', DashboardController::class);

Route::apiResource('fornecedores', FornecedorController::class)
    ->parameters(['fornecedores' => 'fornecedor']);
Route::apiResource('produtos', ProdutoController::class)
    ->parameters(['produtos' => 'produto']);
Route::apiResource('movimentacoes', MovimentacaoController::class)
    ->only(['index', 'store', 'show'])
    ->parameters(['movimentacoes' => 'movimentacao']);
Route::apiResource('notas-fiscais', NotaFiscalController::class)
    ->only(['index', 'store', 'show'])
    ->parameters(['notas-fiscais' => 'notaFiscal']);
Route::post('notas-fiscais/{notaFiscal}/cancelar', [NotaFiscalController::class, 'cancelar']);
