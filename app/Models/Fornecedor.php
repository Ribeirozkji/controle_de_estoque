<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fornecedor extends Model
{
    use HasFactory;

    protected $table = 'fornecedores';

    protected $fillable = [
        'nome',
        'cnpj',
        'telefone',
        'email',
        'contato',
        'endereco',
        'cidade',
        'uf',
        'obs',
    ];

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class);
    }

    public function historicoPrecos(): HasMany
    {
        return $this->hasMany(HistoricoPreco::class);
    }
}
