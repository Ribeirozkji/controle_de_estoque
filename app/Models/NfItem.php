<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NfItem extends Model
{
    use HasFactory;

    protected $table = 'nf_itens';

    protected $fillable = [
        'nf_id',
        'descricao',
        'quantidade',
        'valor_unitario',
        'unidade_comercial',
        'ncm',
        'cfop',
    ];

    protected function casts(): array
    {
        return [
            'quantidade' => 'integer',
            'valor_unitario' => 'decimal:2',
        ];
    }

    public function notaFiscal(): BelongsTo
    {
        return $this->belongsTo(NotaFiscal::class, 'nf_id');
    }
}
