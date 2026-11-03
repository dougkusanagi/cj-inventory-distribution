<?php

use App\Enums\ProductionStage;

it('only permits moving to the next production stage', function (): void {
    $stages = ProductionStage::cases();

    foreach ($stages as $index => $stage) {
        foreach ($stages as $targetIndex => $target) {
            expect($stage->canMoveTo($target))->toBe($targetIndex === $index + 1);
        }
    }
});
