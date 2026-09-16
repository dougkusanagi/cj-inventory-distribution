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
        Schema::create('stock_mutation_lock', function (Blueprint $table): void {
            $table->unsignedInteger('id')->primary();
            $table->unsignedInteger('version')->default(0);
        });
        DB::table('stock_mutation_lock')->insert(['id' => 1, 'version' => 0]);
        Schema::table('stock_movement_items', function (Blueprint $table): void {
            $table->unsignedInteger('movement_quantity')->default(0);
        });
        DB::table('stock_movement_items')->orderBy('id')->chunkById(200, function ($items): void {
            foreach ($items as $item) {
                $source = DB::table('stock_movements')->where('id', $item->stock_movement_id)->value('source');
                $before = json_decode($item->previous_state ?? 'null', true);
                $after = json_decode($item->resulting_state ?? 'null', true);
                $quantity = $source === 'adjustment' ? abs(($after['total_quantity'] ?? 0) - ($before['total_quantity'] ?? 0)) : $item->total_quantity;
                DB::table('stock_movement_items')->where('id', $item->id)->update(['movement_quantity' => $quantity]);
            }
        });
        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->unsignedInteger('stock_version')->default(1);
        });
        foreach (['products', 'stock_offers', 'stock_offer_volumes'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->json('deleted_child_ids')->nullable();
            });
        }
        Schema::create('inventory_counts', function (Blueprint $table): void {
            $table->id();
            $table->string('status')->default('draft');
            $table->string('reason', 500);
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('idempotency_key')->unique();
            $table->string('payload_hash', 64);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
        Schema::create('inventory_count_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inventory_count_id')->constrained('inventory_counts')->restrictOnDelete();
            $table->foreignId('stock_offer_volume_id')->constrained('stock_offer_volumes')->restrictOnDelete();
            $table->unsignedInteger('expected_version');
            $table->json('snapshot');
            $table->json('counted_items')->nullable();
            $table->unsignedInteger('counted_total')->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['inventory_count_id', 'stock_offer_volume_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_count_items');
        Schema::dropIfExists('inventory_counts');
        foreach (['products', 'stock_offers', 'stock_offer_volumes'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('deleted_child_ids'));
        }
        Schema::table('stock_offer_volumes', fn (Blueprint $table) => $table->dropColumn('stock_version'));
        Schema::dropIfExists('stock_mutation_lock');
        Schema::table('stock_movement_items', fn (Blueprint $table) => $table->dropColumn('movement_quantity'));
    }
};
