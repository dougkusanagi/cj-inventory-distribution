<?php

test('the deployment script uses the application production toolchain', function (): void {
    $script = file_get_contents(base_path('deploy.sh'));

    expect($script)
        ->not->toBeFalse()
        ->toContain('#!/usr/bin/env bash')
        ->toContain('set -Eeuo pipefail')
        ->toContain('git switch main')
        ->toContain('git pull --ff-only origin main')
        ->toContain('run_tool composer install')
        ->toContain('--no-dev')
        ->toContain('--optimize-autoloader')
        ->toContain('run_tool vp install --frozen-lockfile')
        ->toContain('run_tool vp build')
        ->toContain('run_tool php artisan migrate --force --isolated')
        ->toContain('run_tool php artisan storage:link --force')
        ->toContain('run_tool php artisan config:cache')
        ->toContain('run_tool php artisan event:cache')
        ->toContain('sudo systemctl restart "$PHP_FPM_SERVICE"')
        ->not->toContain('bun install')
        ->not->toContain('horizon');
});
