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
        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_offer_volume_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('product_code_snapshot');
            $table->string('product_name_snapshot');
            $table->string('product_model_snapshot')->nullable();
            $table->string('category_snapshot')->nullable();
            $table->string('line_snapshot', 20)->nullable();
            $table->string('offer_type_snapshot', 30);
            $table->string('volume_code_snapshot', 20);
            $table->unsignedInteger('total_quantity');
            $table->json('size_grid');
            $table->timestamps();

            $table->unique(['order_id', 'stock_offer_volume_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
