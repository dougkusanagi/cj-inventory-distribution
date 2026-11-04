<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_batches', function (Blueprint $table): void {
            $table->foreignId('parent_id')->nullable()->constrained('production_batches')->restrictOnDelete();
            $table->timestamp('split_at')->nullable();
            $table->index(['stage', 'split_at', 'deleted_at']);
        });
        Schema::table('production_batch_events', function (Blueprint $table): void {
            $table->string('kind', 20)->nullable();
        });
    }

    public function down(): void
    {
        if (DB::table('production_batches')->whereNotNull('split_at')->orWhereNotNull('parent_id')->exists()) {
            throw new RuntimeException('Não é possível remover a estrutura enquanto houver lotes divididos.');
        }

        Schema::table('production_batch_events', function (Blueprint $table): void {
            $table->dropColumn('kind');
        });
        Schema::table('production_batches', function (Blueprint $table): void {
            $table->dropIndex(['stage', 'split_at', 'deleted_at']);
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn('split_at');
        });
    }
};
