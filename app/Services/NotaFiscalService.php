<?php

namespace App\Services;

use App\Models\NotaFiscal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class NotaFiscalService
{
    public function emitir(array $data): NotaFiscal
    {
        return DB::transaction(function () use ($data): NotaFiscal {
            $itens = collect($data['itens'])->map(function (array $item): array {
                $quantidade = (int) $item['quantidade'];
                $valorUnitario = (float) $item['valor_unitario'];

                return [
                    'descricao' => $item['descricao'],
                    'quantidade' => $quantidade,
                    'valor_unitario' => $valorUnitario,
                    'unidade_comercial' => $item['unidade_comercial'] ?? 'un',
                    'ncm' => $item['ncm'] ?? null,
                    'cfop' => $item['cfop'] ?? null,
                ];
            });

            $destinatario = $data['destinatario'];

            $notaFiscal = NotaFiscal::query()->create([
                'ref' => 'NF-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4)),
                'numero' => (string) random_int(100000, 999999),
                'serie' => '1',
                'chave_nfe' => $this->gerarChaveNfe(),
                'status' => NotaFiscal::STATUS_AUTORIZADA,
                'natureza_operacao' => $data['natureza_operacao'],
                'tipo' => $data['tipo'] ?? 'saida',
                'dest_nome' => $destinatario['nome'],
                'dest_cpf' => $destinatario['cpf'] ?? null,
                'dest_cnpj' => $destinatario['cnpj'] ?? null,
                'dest_email' => $destinatario['email'] ?? null,
                'dest_logradouro' => $destinatario['logradouro'] ?? null,
                'dest_numero' => $destinatario['numero'] ?? null,
                'dest_bairro' => $destinatario['bairro'] ?? null,
                'dest_cidade' => $destinatario['cidade'] ?? null,
                'dest_uf' => $destinatario['uf'] ?? null,
                'dest_cep' => $destinatario['cep'] ?? null,
                'total_geral' => $itens->sum(fn (array $item): float => $item['quantidade'] * $item['valor_unitario']),
                'info_adicional' => $data['informacoes_adicionais'] ?? null,
                'data_emissao' => now(),
            ]);

            $notaFiscal->itens()->createMany($itens->all());

            return $notaFiscal->load('itens');
        });
    }

    public function cancelar(NotaFiscal $notaFiscal, string $justificativa): NotaFiscal
    {
        if ($notaFiscal->status === NotaFiscal::STATUS_CANCELADA) {
            throw ValidationException::withMessages([
                'status' => 'A nota fiscal ja esta cancelada.',
            ]);
        }

        $notaFiscal->forceFill([
            'status' => NotaFiscal::STATUS_CANCELADA,
            'cancelada_em' => now(),
            'justificativa_canc' => $justificativa,
        ])->save();

        return $notaFiscal->load('itens');
    }

    private function gerarChaveNfe(): string
    {
        $digits = '';

        for ($i = 0; $i < 44; $i++) {
            $digits .= (string) random_int(0, 9);
        }

        return $digits;
    }
}
