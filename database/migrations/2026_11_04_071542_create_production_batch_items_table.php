<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_batch_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('production_batch_id')->constrained()->restrictOnDelete();
            $table->string('size', 30);
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('sort_order');
            $table->timestamps();
            $table->softDeletes();
        });
        DB::statement('CREATE UNIQUE INDEX production_batch_active_size_unique ON production_batch_items (production_batch_id, lower(size)) WHERE deleted_at IS NULL');
        Schema::table('production_batch_events', function (Blueprint $table): void {
            $table->json('sizes_before')->nullable();
            $table->json('sizes_after')->nullable();
        });
    }

    public function down(): void
    {
        if (DB::table('production_batch_items')->exists()) {
            throw new RuntimeException('Não é possível remover a grade enquanto houver tamanhos registrados.');
        }
        Schema::table('production_batch_events', function (Blueprint $table): void {
            $table->dropColumn(['sizes_before', 'sizes_after']);
        });
        Schema::dropIfExists('production_batch_items');
    }
};
