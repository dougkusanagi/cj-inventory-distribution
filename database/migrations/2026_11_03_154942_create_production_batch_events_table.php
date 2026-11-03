<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_batch_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('production_batch_id')->constrained()->restrictOnDelete();
            $table->string('from_stage')->nullable();
            $table->string('to_stage');
            $table->unsignedInteger('quantity');
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at');
            $table->index(['production_batch_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_batch_events');
    }
};
