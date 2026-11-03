<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workshops', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120);
            $table->string('type', 20);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['type', 'is_active', 'name']);
        });
        DB::statement('CREATE UNIQUE INDEX workshops_type_slug_unique ON workshops (type, slug) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('workshops');
    }
};
