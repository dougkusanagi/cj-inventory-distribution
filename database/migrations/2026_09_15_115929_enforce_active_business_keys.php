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
        $this->dropLegacyUniqueIndexes();

        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            $this->addGeneratedColumns();

            return;
        }

        DB::statement('CREATE UNIQUE INDEX categories_active_slug_unique ON categories (slug) WHERE deleted_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX stock_offer_volume_items_active_size_unique ON stock_offer_volume_items (stock_offer_volume_id, lower(size)) WHERE deleted_at IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            Schema::table('categories', function (Blueprint $table): void {
                $table->dropUnique('categories_active_slug_unique');
                $table->dropColumn('active_slug');
            });
            Schema::table('stock_offer_volume_items', function (Blueprint $table): void {
                $table->dropUnique('stock_offer_volume_items_active_size_unique');
                $table->dropColumn('active_size_key');
            });
        } else {
            DB::statement('DROP INDEX IF EXISTS categories_active_slug_unique');
            DB::statement('DROP INDEX IF EXISTS stock_offer_volume_items_active_size_unique');
        }

        Schema::table('categories', function (Blueprint $table): void {
            $table->unique(['slug', 'deleted_at']);
        });
        Schema::table('stock_offer_volume_items', function (Blueprint $table): void {
            $table->unique(['stock_offer_volume_id', 'size', 'deleted_at']);
        });
    }

    private function dropLegacyUniqueIndexes(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropUnique('categories_slug_deleted_at_unique');
        });
        Schema::table('stock_offer_volume_items', function (Blueprint $table): void {
            $table->dropUnique('stock_offer_volume_items_stock_offer_volume_id_size_deleted_at_unique');
        });
    }

    private function addGeneratedColumns(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->string('active_slug', 120)
                ->nullable()
                ->virtualAs('IF(deleted_at IS NULL, slug, NULL)');
            $table->unique('active_slug', 'categories_active_slug_unique');
        });

        Schema::table('stock_offer_volume_items', function (Blueprint $table): void {
            $table->string('active_size_key', 80)
                ->nullable()
                ->virtualAs("IF(deleted_at IS NULL, CONCAT(stock_offer_volume_id, ':', LOWER(size)), NULL)");
            $table->unique('active_size_key', 'stock_offer_volume_items_active_size_unique');
        });
    }
};
