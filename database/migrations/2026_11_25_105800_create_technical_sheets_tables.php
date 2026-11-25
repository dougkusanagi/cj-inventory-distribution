<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('technical_sheets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('revision');
            $table->string('status', 12);
            $table->unsignedInteger('version')->default(1);
            $table->text('instructions')->nullable();
            $table->text('review_note')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('obsoleted_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('obsoleted_at')->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'revision']);
        });

        DB::statement("CREATE UNIQUE INDEX technical_sheets_approved_per_product ON technical_sheets (product_id) WHERE status = 'approved'");
        DB::statement("CREATE UNIQUE INDEX technical_sheets_open_per_product ON technical_sheets (product_id) WHERE status IN ('draft', 'in_review')");

        Schema::create('technical_sheet_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('technical_sheet_id')->constrained()->restrictOnDelete();
            $table->foreignId('material_id')->constrained()->restrictOnDelete();
            $table->string('material_name', 120);
            $table->string('role', 16);
            $table->string('unit', 4);
            $table->decimal('quantity', 12, 3);
            $table->unsignedInteger('sort_order');
            $table->decimal('unit_price_snapshot', 12, 4)->nullable();
            $table->decimal('sale_price', 12, 2)->nullable();
            $table->timestamps();
            $table->unique(['technical_sheet_id', 'material_id', 'role'], 'technical_sheet_material_role_unique');
        });

        Schema::create('technical_sheet_costs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('technical_sheet_id')->constrained()->restrictOnDelete();
            $table->foreignId('cost_item_id')->constrained()->restrictOnDelete();
            $table->string('cost_name', 120);
            $table->decimal('amount', 12, 2);
            $table->string('surcharge_type', 10)->nullable();
            $table->decimal('surcharge_value', 12, 2)->nullable();
            $table->timestamps();
            $table->unique(['technical_sheet_id', 'cost_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('technical_sheet_costs');
        Schema::dropIfExists('technical_sheet_materials');
        Schema::dropIfExists('technical_sheets');
    }
};
