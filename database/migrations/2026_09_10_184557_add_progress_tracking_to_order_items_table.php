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
        Schema::table('order_items', function (Blueprint $table) {
            $table->timestamp('separated_at')->nullable()->after('size_grid');
            $table->foreignId('separated_by')->nullable()->after('separated_at')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('checked_at')->nullable()->after('separated_by');
            $table->foreignId('checked_by')->nullable()->after('checked_at')
                ->constrained('users')->nullOnDelete();
            $table->text('divergence_note')->nullable()->after('checked_by');
            $table->timestamp('divergence_reported_at')->nullable()->after('divergence_note');
            $table->foreignId('divergence_reported_by')->nullable()->after('divergence_reported_at')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('divergence_resolved_at')->nullable()->after('divergence_reported_by');
            $table->foreignId('divergence_resolved_by')->nullable()->after('divergence_resolved_at')
                ->constrained('users')->nullOnDelete();

            $table->index(['order_id', 'checked_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'checked_at']);
            $table->dropForeign(['separated_by']);
            $table->dropForeign(['checked_by']);
            $table->dropForeign(['divergence_reported_by']);
            $table->dropForeign(['divergence_resolved_by']);
            $table->dropColumn([
                'separated_at',
                'separated_by',
                'checked_at',
                'checked_by',
                'divergence_note',
                'divergence_reported_at',
                'divergence_reported_by',
                'divergence_resolved_at',
                'divergence_resolved_by',
            ]);
        });
    }
};
