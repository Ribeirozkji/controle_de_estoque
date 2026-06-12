<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NotaFiscal extends Model
{
    use HasFactory;

    public const STATUS_RASCUNHO = 'rascunho';
    public const STATUS_PROCESSANDO = 'processando';
    public const STATUS_AUTORIZADA = 'autorizada';
    public const STATUS_CANCELADA = 'cancelada';
    public const STATUS_REJEITADA = 'rejeitada';

    protected $table = 'notas_fiscais';

    protected $fillable = [
        'ref',
        'numero',
        'serie',
        'chave_nfe',
        'status',
        'natureza_operacao',
        'tipo',
        'dest_nome',
        'dest_cpf',
        'dest_cnpj',
        'dest_email',
        'dest_logradouro',
        'dest_numero',
        'dest_bairro',
        'dest_cidade',
        'dest_uf',
        'dest_cep',
        'total_geral',
        'info_adicional',
        'data_emissao',
        'cancelada_em',
        'justificativa_canc',
    ];

    protected function casts(): array
    {
        return [
            'total_geral' => 'decimal:2',
            'data_emissao' => 'datetime',
            'cancelada_em' => 'datetime',
        ];
    }

    public function itens(): HasMany
    {
        return $this->hasMany(NfItem::class, 'nf_id');
    }
}
