<?php

namespace App\Actions\Users;

use App\Models\ProductionStageAssignment;
use App\Models\User;

class SyncProductionStages
{
    /** @param array<int, string> $stages */
    public function handle(User $user, array $stages): void
    {
        $existing = ProductionStageAssignment::query()->where('user_id', $user->id)->get();
        foreach ($existing as $assignment) {
            if (! in_array($assignment->stage, $stages, true)) {
                $assignment->delete();
            }
        }
        $existingStages = $existing->pluck('stage')->all();
        foreach (array_diff($stages, $existingStages) as $stage) {
            $assignment = ProductionStageAssignment::withTrashed()->where('user_id', $user->id)->where('stage', $stage)->first();
            if ($assignment !== null) {
                $assignment->restore();
            } else {
                ProductionStageAssignment::query()->create(['user_id' => $user->id, 'stage' => $stage]);
            }
        }
    }
}
