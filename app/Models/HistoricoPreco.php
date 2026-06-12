<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoricoPreco extends Model
{
    use HasFactory;

    protected $table = 'historico_precos';

    protected $fillable = [
        'produto_id',
        'fornecedor_id',
        'preco',
        'data',
        'obs',
    ];

    protected function casts(): array
    {
        return [
            'preco' => 'decimal:2',
            'data' => 'date:Y-m-d',
        ];
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class);
    }
}
