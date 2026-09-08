<?php

test('the local verification command covers the repository quality checks', function (): void {
    $composer = json_decode(file_get_contents(base_path('composer.json')), true, 512, JSON_THROW_ON_ERROR);
    $scriptPath = base_path('scripts/ci-verify.sh');
    $script = file_get_contents($scriptPath);
    $workflow = file_get_contents(base_path('.github/workflows/tests.yml'));
    $agentInstructions = file_get_contents(base_path('AGENTS.md'));
    $phpunit = file_get_contents(base_path('phpunit.xml'));

    expect($composer['scripts']['ci:verify'])
        ->toContain('bash scripts/ci-verify.sh');

    expect($composer['scripts']['ci:check'])->toBe('@ci:verify');
    expect($composer['scripts']['ci:local'])->toBe('@ci:verify');

    expect(is_executable($scriptPath))->toBeTrue();

    expect($script)
        ->not->toBeFalse()
        ->toContain('#!/usr/bin/env bash')
        ->toContain('set -Eeuo pipefail')
        ->toContain('php artisan config:clear --ansi')
        ->toContain('composer lint:check')
        ->toContain('vp check')
        ->toContain('vp run types:check')
        ->toContain('vp build')
        ->toContain('composer types:check')
        ->toContain('vp run e2e:install')
        ->toContain('QUEUE_CONNECTION=sync php artisan test --compact')
        ->toContain('QUEUE_CONNECTION=sync composer test:e2e')
        ->not->toContain('vp fmt --check resources/')
        ->not->toContain('vp lint')
        ->not->toContain('vp check --no-fmt --no-lint')
        ->not->toContain('horizon-new-dawn')
        ->not->toContain('DB_CONNECTION=mysql');

    expect($workflow)
        ->not->toBeFalse()
        ->toContain('workflow_dispatch:')
        ->toContain('run: composer ci:verify')
        ->not->toContain('  push:')
        ->not->toContain('  pull_request:')
        ->not->toContain('run: composer ci:check');

    expect($agentInstructions)
        ->not->toBeFalse()
        ->toContain('composer ci:verify');

    expect($phpunit)
        ->not->toBeFalse()
        ->toContain('<server name="APP_ENV" value="testing"/>')
        ->toContain('<server name="DB_CONNECTION" value="sqlite"/>')
        ->toContain('<server name="DB_DATABASE" value=":memory:"/>')
        ->toContain('<env name="APP_ENV" value="testing" force="true"/>')
        ->toContain('<env name="DB_CONNECTION" value="sqlite" force="true"/>')
        ->toContain('<env name="DB_DATABASE" value=":memory:" force="true"/>')
        ->toContain('<env name="QUEUE_CONNECTION" value="sync" force="true"/>');
});
