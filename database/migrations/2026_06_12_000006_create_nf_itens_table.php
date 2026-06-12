<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nf_itens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('nf_id')->constrained('notas_fiscais')->cascadeOnDelete();
            $table->string('descricao', 120);
            $table->integer('quantidade');
            $table->decimal('valor_unitario', 10, 2);
            $table->string('unidade_comercial', 5)->default('un');
            $table->string('ncm', 8)->nullable();
            $table->string('cfop', 4)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nf_itens');
    }
};
