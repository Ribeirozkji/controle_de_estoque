<?php

namespace Database\Seeders;

use App\Models\Fornecedor;
use App\Models\Produto;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $fornecedor = Fornecedor::query()->firstOrCreate(
            ['nome' => 'Fornecedor Padrao'],
            [
                'email' => 'fornecedor@example.com',
                'cidade' => 'Sao Paulo',
                'uf' => 'SP',
            ]
        );

        Produto::query()->firstOrCreate(
            ['sku' => 'SKU-001'],
            [
                'nome' => 'Produto de exemplo',
                'categoria' => 'Outros',
                'fornecedor_id' => $fornecedor->id,
                'preco_custo' => 10,
                'preco_venda' => 18,
                'estoque_atual' => 15,
                'estoque_minimo' => 5,
                'estoque_maximo' => 50,
                'unidade' => 'un',
            ]
        );
    }
}
