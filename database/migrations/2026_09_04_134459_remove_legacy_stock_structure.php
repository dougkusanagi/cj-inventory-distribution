<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove tables and columns from databases created before the direct cutover.
     */
    public function up(): void
    {
        Schema::dropIfExists('stock_offer_items');
        Schema::dropIfExists('product_variants');

        if (Schema::hasColumn('stock_offer_volumes', 'legacy_volume_count')) {
            Schema::table('stock_offer_volumes', function (Blueprint $table): void {
                $table->dropColumn('legacy_volume_count');
            });
        }

        $legacyColumns = collect(['total_quantity', 'volumes'])
            ->filter(fn (string $column): bool => Schema::hasColumn('stock_offers', $column))
            ->values()
            ->all();

        if ($legacyColumns === []) {
            return;
        }

        $hasLegacyIndex = Schema::hasIndex(
            'stock_offers',
            'stock_offers_catalog_availability_index',
        );

        Schema::table('stock_offers', function (Blueprint $table) use ($legacyColumns, $hasLegacyIndex): void {
            if ($hasLegacyIndex) {
                $table->dropIndex('stock_offers_catalog_availability_index');
            }

            $table->dropColumn($legacyColumns);
        });
    }

    /**
     * The old schema is intentionally not recreated after the direct cutover.
     */
    public function down(): void {}
};
