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
        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->string('code', 20)->nullable()->unique()->after('id');
            $table->foreignId('current_order_id')->nullable()->after('total_quantity')
                ->constrained('orders')->restrictOnDelete();
            $table->timestamp('consumed_at')->nullable()->after('current_order_id');
            $table->index(['current_order_id', 'consumed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->dropForeign(['current_order_id']);
            $table->dropIndex(['current_order_id', 'consumed_at']);
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'current_order_id', 'consumed_at']);
        });
    }
};
