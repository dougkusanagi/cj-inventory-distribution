<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_batches', function (Blueprint $table): void {
            $table->foreignId('workshop_id')->nullable()->constrained()->restrictOnDelete();
        });
        Schema::table('production_batch_events', function (Blueprint $table): void {
            $table->foreignId('from_workshop_id')->nullable()->constrained('workshops')->restrictOnDelete();
            $table->foreignId('to_workshop_id')->nullable()->constrained('workshops')->restrictOnDelete();
            $table->string('from_workshop_name', 100)->nullable();
            $table->string('to_workshop_name', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('production_batch_events', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('from_workshop_id');
            $table->dropConstrainedForeignId('to_workshop_id');
            $table->dropColumn(['from_workshop_name', 'to_workshop_name']);
        });
        Schema::table('production_batches', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('workshop_id');
        });
    }
};
