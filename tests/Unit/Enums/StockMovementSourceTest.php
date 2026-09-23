<?php

use App\Enums\StockMovementSource;

test('stock movement sources expose stable stored values and readable labels', function () {
    expect(array_column(StockMovementSource::cases(), 'value'))
        ->toBe(['manual', 'adjustment', 'order', 'opening']);

    expect(array_map(
        static fn (StockMovementSource $source): string => $source->label(),
        StockMovementSource::cases(),
    ))->toBe(['Manual', 'Ajuste por tamanho', 'Pedido', 'Abertura inicial']);
});
