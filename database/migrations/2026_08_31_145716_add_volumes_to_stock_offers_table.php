<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_offers', function (Blueprint $table): void {
            $table->unsignedInteger('volumes')->nullable()->after('total_quantity');
            $table->index(
                ['is_active', 'type', 'volumes'],
                'stock_offers_catalog_availability_index',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_offers', function (Blueprint $table): void {
            $table->dropIndex('stock_offers_catalog_availability_index');
            $table->dropColumn('volumes');
        });
    }
};
