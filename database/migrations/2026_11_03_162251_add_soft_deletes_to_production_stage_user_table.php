<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_stage_user', function (Blueprint $table): void {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        if (DB::table('production_stage_user')->whereNotNull('deleted_at')->exists()) {
            throw new RuntimeException('Não é possível desfazer a migration enquanto houver atribuições removidas.');
        }
        Schema::table('production_stage_user', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};
