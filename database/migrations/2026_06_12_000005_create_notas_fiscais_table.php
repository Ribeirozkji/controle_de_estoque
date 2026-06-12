<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notas_fiscais', function (Blueprint $table): void {
            $table->id();
            $table->string('ref', 30)->unique();
            $table->string('numero', 10)->nullable();
            $table->string('serie', 5)->nullable();
            $table->char('chave_nfe', 44)->nullable();
            $table->string('status', 20)->default('rascunho');
            $table->string('natureza_operacao', 60);
            $table->string('tipo', 10)->default('saida');
            $table->string('dest_nome', 120)->nullable();
            $table->string('dest_cpf', 14)->nullable();
            $table->string('dest_cnpj', 18)->nullable();
            $table->string('dest_email', 80)->nullable();
            $table->string('dest_logradouro', 120)->nullable();
            $table->string('dest_numero', 10)->nullable();
            $table->string('dest_bairro', 60)->nullable();
            $table->string('dest_cidade', 60)->nullable();
            $table->char('dest_uf', 2)->nullable();
            $table->string('dest_cep', 9)->nullable();
            $table->decimal('total_geral', 10, 2)->default(0);
            $table->text('info_adicional')->nullable();
            $table->timestamp('data_emissao')->nullable();
            $table->timestamp('cancelada_em')->nullable();
            $table->text('justificativa_canc')->nullable();
            $table->timestamps();

            $table->index(['status', 'data_emissao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas_fiscais');
    }
};
