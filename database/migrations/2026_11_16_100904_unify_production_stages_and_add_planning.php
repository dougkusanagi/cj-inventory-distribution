<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('production_batches')->where('stage', 'dyeing')->update(['stage' => 'washing', 'version' => DB::raw('version + 1')]);
            DB::table('production_batches')->where('stage', 'bagging')->update([
                'stage' => 'completed', 'completed_at' => DB::raw('stage_entered_at'),
                'received_at' => DB::raw('COALESCE(received_at, stage_entered_at)'), 'version' => DB::raw('version + 1'),
            ]);
            foreach (['dyeing' => 'washing', 'bagging' => 'completed'] as $old => $new) {
                foreach (DB::table('production_stage_user')->where('stage', $old)->get() as $assignment) {
                    $existing = DB::table('production_stage_user')->where('user_id', $assignment->user_id)->where('stage', $new)->first();
                    if ($existing) {
                        if ($assignment->deleted_at === null) {
                            DB::table('production_stage_user')->where('id', $existing->id)->update(['deleted_at' => null]);
                        }
                        DB::table('production_stage_user')->where('id', $assignment->id)->delete();
                    } else {
                        DB::table('production_stage_user')->where('id', $assignment->id)->update(['stage' => $new]);
                    }
                }
            }
        });
    }

    public function down(): void
    {
        throw new RuntimeException('A unificação das etapas não pode ser desfeita automaticamente sem perder a origem dos lotes.');
    }
};
