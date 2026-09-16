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
        $inactiveOfferIds = DB::table('stock_offers')
            ->where('is_active', false)
            ->pluck('id');

        if ($inactiveOfferIds->isNotEmpty()) {
            $inactiveVolumeIds = DB::table('stock_offer_volumes')
                ->whereIn('stock_offer_id', $inactiveOfferIds)
                ->pluck('id');

            DB::table('stock_offer_volume_items')
                ->whereIn('stock_offer_volume_id', $inactiveVolumeIds)
                ->update([
                    'is_active' => false,
                    'quantity' => null,
                ]);

            DB::table('stock_offer_volumes')
                ->whereIn('id', $inactiveVolumeIds)
                ->update(['total_quantity' => 0]);
        }

        Schema::table('stock_offers', function (Blueprint $table): void {
            $table->dropIndex(['product_id', 'is_active']);
            $table->dropColumn('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // The direct stock cutover intentionally has no rollback path.
    }
};
