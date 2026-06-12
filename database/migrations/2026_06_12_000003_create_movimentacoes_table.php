<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimentacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            $table->string('tipo', 10);
            $table->integer('quantidade');
            $table->string('motivo', 60);
            $table->date('data');
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index(['produto_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentacoes');
    }
};
