<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Move the stock type to the product and attach sacks directly to it.
     *
     * A product has a single stock type, so the stock offer only grouped the
     * product's sacks. Orders and movements keep the type in their snapshots.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->string('stock_offer_type', 30)->default('new_grade')->after('line');
        });

        DB::table('products')->orderBy('id')->select('id')->eachById(function (object $product): void {
            $type = DB::table('stock_offers')
                ->where('product_id', $product->id)
                ->orderByRaw('deleted_at is not null')
                ->orderByDesc('id')
                ->value('type');

            if ($type !== null) {
                DB::table('products')->where('id', $product->id)->update(['stock_offer_type' => $type]);
            }
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->foreignId('product_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        DB::table('stock_offer_volumes')->update([
            'product_id' => DB::table('stock_offers')
                ->select('product_id')
                ->whereColumn('stock_offers.id', 'stock_offer_volumes.stock_offer_id')
                ->limit(1),
        ]);

        // Deleted products remembered the offers they deleted; they now restore sacks.
        DB::table('products')->whereNotNull('deleted_at')->orderBy('id')->eachById(function (object $product): void {
            $offerIds = json_decode((string) $product->deleted_child_ids, true);
            $volumeIds = is_array($offerIds) && $offerIds !== []
                ? DB::table('stock_offer_volumes')->whereIn('stock_offer_id', $offerIds)->whereNotNull('deleted_at')->pluck('id')->all()
                : [];

            DB::table('products')->where('id', $product->id)->update(['deleted_child_ids' => json_encode($volumeIds)]);
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->dropForeign(['stock_offer_id']);
            $table->dropIndex(['stock_offer_id', 'sort_order']);
            $table->dropIndex(['stock_offer_id', 'total_quantity']);
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->dropColumn('stock_offer_id');
            $table->foreignId('product_id')->nullable(false)->change();
            $table->index(['product_id', 'sort_order']);
            $table->index(['product_id', 'total_quantity']);
        });

        Schema::table('stock_movement_items', function (Blueprint $table): void {
            $table->dropForeign(['stock_offer_id']);
        });

        Schema::table('stock_movement_items', function (Blueprint $table): void {
            $table->dropColumn('stock_offer_id');
        });

        Schema::dropIfExists('stock_offers');
    }

    /**
     * Recreate one stock offer per product that owns sacks.
     */
    public function down(): void
    {
        Schema::create('stock_offers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30)->default('new_grade');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->json('deleted_child_ids')->nullable();
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->foreignId('stock_offer_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        Schema::table('stock_movement_items', function (Blueprint $table): void {
            $table->foreignId('stock_offer_id')->nullable()->after('product_id')->constrained('stock_offers')->nullOnDelete();
        });

        DB::table('products')->orderBy('id')->eachById(function (object $product): void {
            if (! DB::table('stock_offer_volumes')->where('product_id', $product->id)->exists()) {
                return;
            }

            $offerId = DB::table('stock_offers')->insertGetId([
                'product_id' => $product->id,
                'type' => $product->stock_offer_type,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('stock_offer_volumes')->where('product_id', $product->id)->update(['stock_offer_id' => $offerId]);
            DB::table('stock_movement_items')->where('product_id', $product->id)->update(['stock_offer_id' => $offerId]);
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->dropForeign(['product_id']);
            $table->dropIndex(['product_id', 'sort_order']);
            $table->dropIndex(['product_id', 'total_quantity']);
        });

        Schema::table('stock_offer_volumes', function (Blueprint $table): void {
            $table->dropColumn('product_id');
            $table->index(['stock_offer_id', 'sort_order']);
            $table->index(['stock_offer_id', 'total_quantity']);
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('stock_offer_type');
        });
    }
};
