<?php

namespace App\Policies;

use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Models\ProductionBatch;
use App\Models\User;

class ProductionBatchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || ($user->is_active && $user->role === UserRole::Production);
    }

    public function view(User $user, ProductionBatch $batch): bool
    {
        return $user->canManageProductionStage($batch->stage);
    }

    public function create(User $user): bool
    {
        return $user->canManageProductionStage(ProductionStage::Cutting);
    }

    public function advance(User $user, ProductionBatch $batch): bool
    {
        return $user->canManageProductionStage($batch->stage);
    }

    public function undo(User $user, ProductionBatch $batch): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, ProductionBatch $batch): bool
    {
        return $user->isAdmin();
    }
}
