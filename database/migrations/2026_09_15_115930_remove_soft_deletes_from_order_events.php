<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('order_events')->whereNotNull('deleted_at')->update(['deleted_at' => null]);

        Schema::table('order_events', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_events', function (Blueprint $table): void {
            $table->softDeletes();
        });
    }
};
