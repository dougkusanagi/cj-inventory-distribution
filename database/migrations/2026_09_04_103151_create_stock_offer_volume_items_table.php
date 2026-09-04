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
        Schema::create('stock_offer_volume_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('stock_offer_volume_id')->constrained()->cascadeOnDelete();
            $table->string('size', 30);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('quantity')->nullable();
            $table->timestamps();

            $table->unique(['stock_offer_volume_id', 'size']);
            $table->index(['stock_offer_volume_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_offer_volume_items');
    }
};
