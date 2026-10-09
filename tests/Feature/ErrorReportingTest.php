<?php

use Illuminate\Validation\ValidationException;
use Sentry\EventHint;
use Sentry\SentrySdk;
use Sentry\State\HubInterface;

test('reported application errors reach the error tracker', function (): void {
    $originalHub = SentrySdk::getCurrentHub();
    $exception = new RuntimeException('Error reporting regression test');
    $hub = Mockery::mock(HubInterface::class);
    $hub->shouldReceive('captureException')->once()
        ->with($exception, Mockery::type(EventHint::class))->andReturnNull();
    SentrySdk::setCurrentHub($hub);

    try {
        report($exception);
    } finally {
        SentrySdk::setCurrentHub($originalHub);
    }
});

test('expected validation errors are not sent to the error tracker', function (): void {
    $originalHub = SentrySdk::getCurrentHub();
    $hub = Mockery::mock(HubInterface::class);
    $hub->shouldNotReceive('captureException');
    SentrySdk::setCurrentHub($hub);

    try {
        report(ValidationException::withMessages(['name' => 'Required']));
    } finally {
        SentrySdk::setCurrentHub($originalHub);
    }
});
