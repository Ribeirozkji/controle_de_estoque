<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Produto extends Model
{
    use HasFactory;

    protected $table = 'produtos';

    protected $fillable = [
        'sku',
        'nome',
        'categoria',
        'fornecedor_id',
        'preco_custo',
        'preco_venda',
        'estoque_atual',
        'estoque_minimo',
        'estoque_maximo',
        'unidade',
        'localizacao',
        'lead_time',
        'validade',
    ];

    protected function casts(): array
    {
        return [
            'preco_custo' => 'decimal:2',
            'preco_venda' => 'decimal:2',
            'estoque_atual' => 'integer',
            'estoque_minimo' => 'integer',
            'estoque_maximo' => 'integer',
            'lead_time' => 'integer',
            'validade' => 'date:Y-m-d',
        ];
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class);
    }

    public function movimentacoes(): HasMany
    {
        return $this->hasMany(Movimentacao::class);
    }

    public function historicoPrecos(): HasMany
    {
        return $this->hasMany(HistoricoPreco::class);
    }

    public function abaixoDoMinimo(): bool
    {
        return $this->estoque_atual <= $this->estoque_minimo;
    }
}
