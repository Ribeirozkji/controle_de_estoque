<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fornecedores', function (Blueprint $table): void {
            $table->id();
            $table->string('nome', 120)->unique();
            $table->string('cnpj', 18)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('email', 80)->nullable();
            $table->string('contato', 80)->nullable();
            $table->string('endereco', 200)->nullable();
            $table->string('cidade', 60)->nullable();
            $table->char('uf', 2)->nullable();
            $table->text('obs')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fornecedores');
    }
};
