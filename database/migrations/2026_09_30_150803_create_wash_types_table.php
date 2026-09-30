<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wash_types', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['is_active', 'name']);
        });

        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            Schema::table('wash_types', function (Blueprint $table): void {
                $table->string('active_slug', 120)->nullable()->virtualAs('IF(deleted_at IS NULL, slug, NULL)');
                $table->unique('active_slug', 'wash_types_active_slug_unique');
            });
        } else {
            DB::statement('CREATE UNIQUE INDEX wash_types_active_slug_unique ON wash_types (slug) WHERE deleted_at IS NULL');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wash_types');
    }
};
