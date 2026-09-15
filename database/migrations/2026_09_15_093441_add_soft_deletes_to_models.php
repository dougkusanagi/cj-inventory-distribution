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
        Schema::table('users', function (Blueprint $table): void {
            $table->softDeletes();
        });

        Schema::table('categories', function (Blueprint $table): void {
            $table->softDeletes();
            $table->dropUnique(['slug']);
            $table->unique(['slug', 'deleted_at']);
        });

        foreach (['products', 'stock_offers', 'stock_offer_volumes', 'stock_offer_volume_items', 'orders', 'order_items', 'order_events', 'catalog_settings'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->softDeletes();
            });
        }

        Schema::table('stock_offer_volume_items', function (Blueprint $table): void {
            $table->dropUnique(['stock_offer_volume_id', 'size']);
            $table->unique(['stock_offer_volume_id', 'size', 'deleted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_offer_volume_items', function (Blueprint $table): void {
            $table->dropUnique(['stock_offer_volume_id', 'size', 'deleted_at']);
            $table->unique(['stock_offer_volume_id', 'size']);
        });

        foreach (['catalog_settings', 'order_events', 'order_items', 'orders', 'stock_offer_volume_items', 'stock_offer_volumes', 'stock_offers', 'products'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropSoftDeletes();
            });
        }

        Schema::table('categories', function (Blueprint $table): void {
            $table->dropUnique(['slug', 'deleted_at']);
            $table->unique('slug');
            $table->dropSoftDeletes();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};
