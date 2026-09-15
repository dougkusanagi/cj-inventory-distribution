<?php

use App\Enums\OrderEventType;
use App\Enums\OrderStatus;
use App\Enums\ProductLine;
use App\Enums\StockOfferType;

test('entity states expose the labels used by the CRUD interfaces', function (string $enumClass, array $expectedLabels) {
    $actualLabels = array_map(
        static fn (BackedEnum $case): string => $case->label(),
        $enumClass::cases(),
    );

    expect($actualLabels)->toBe($expectedLabels);
})->with([
    'order statuses' => [OrderStatus::class, ['Pendente', 'Finalizado', 'Cancelado']],
    'order events' => [OrderEventType::class, [
        'Pedido registrado', 'Dados do pedido atualizados', 'Pedido cancelado',
        'Pedido finalizado', 'Saco marcado como separado', 'Separação desfeita',
        'Saco conferido', 'Conferência desfeita', 'Divergência registrada',
        'Divergência resolvida',
    ]],
    'product lines' => [ProductLine::class, ['Slim', 'Plus']],
    'stock offer types' => [StockOfferType::class, ['Reposição', 'Grade Nova', 'Grade Furada']],
]);

test('entity states keep their persisted values stable', function (string $enumClass, array $expectedValues) {
    expect(array_column($enumClass::cases(), 'value'))->toBe($expectedValues);
})->with([
    'order statuses' => [OrderStatus::class, ['pending', 'completed', 'canceled']],
    'product lines' => [ProductLine::class, ['slim', 'plus']],
    'stock offer types' => [StockOfferType::class, ['replenishment', 'new_grade', 'broken_grade']],
]);
