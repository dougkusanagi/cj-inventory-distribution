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
        Schema::create('stock_movement_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('stock_movement_id')->constrained('stock_movements')->restrictOnDelete();
            $table->foreignId('stock_offer_volume_id')->nullable()->constrained('stock_offer_volumes')->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('stock_offer_id')->nullable()->constrained('stock_offers')->nullOnDelete();
            $table->string('volume_code_snapshot', 20);
            $table->string('product_code_snapshot')->nullable();
            $table->string('product_name_snapshot')->nullable();
            $table->string('product_model_snapshot')->nullable();
            $table->string('category_snapshot')->nullable();
            $table->string('line_snapshot', 20)->nullable();
            $table->string('offer_type_snapshot', 30)->nullable();
            $table->unsignedInteger('total_quantity');
            $table->json('size_grid_snapshot')->nullable();
            $table->json('previous_state')->nullable();
            $table->json('resulting_state')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['stock_offer_volume_id', 'created_at']);
            $table->index(['product_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movement_items');
    }
};
