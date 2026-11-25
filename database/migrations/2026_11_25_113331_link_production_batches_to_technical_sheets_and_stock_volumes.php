<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_batches', function (Blueprint $table): void {
            $table->foreignId('technical_sheet_id')->nullable()->constrained()->restrictOnDelete();
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->foreignId('production_batch_id')->nullable()->constrained()->restrictOnDelete();
            $table->index('production_batch_id');
            $table->unsignedInteger('bagged_quantity')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->dropIndex(['production_batch_id']);
            $table->dropConstrainedForeignId('production_batch_id');
            $table->dropColumn('bagged_quantity');
        });

        Schema::table('production_batches', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('technical_sheet_id');
        });
    }
};
