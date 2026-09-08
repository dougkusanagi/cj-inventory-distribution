<?php

use Illuminate\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

test('the deployment script uses the application production toolchain', function (): void {
    $script = file_get_contents(base_path('vendor/dougkusanagi/laravel-deploy/bin/deploy'));
    $wrapper = file_get_contents(base_path('deploy.sh'));
    $entrypoint = file_get_contents(base_path('deploy'));
    $config = file_get_contents(base_path('deploy.config.sh'));

    expect($script)
        ->not->toBeFalse()
        ->toContain('#!/usr/bin/env bash')
        ->toContain('set -Eeuo pipefail')
        ->toContain('DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"')
        ->toContain('DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-$(git rev-parse --git-path laravel-deploy.lock)}"')
        ->toContain('flock -n 9')
        ->toContain('git status --porcelain=v1 --untracked-files=all')
        ->toContain('git switch "$DEPLOY_BRANCH"')
        ->toContain('git pull --ff-only origin "$DEPLOY_BRANCH"')
        ->toContain('run_tool composer install')
        ->toContain('--no-dev')
        ->toContain('--optimize-autoloader')
        ->toContain('run_tool "${FRONTEND_INSTALL[@]}"')
        ->toContain('run_tool "${FRONTEND_BUILD[@]}"')
        ->toContain('run_tool php artisan migrate --force --isolated=1')
        ->toContain('run_tool php artisan storage:link --force')
        ->toContain('run_tool php artisan optimize:clear --except=cache')
        ->toContain('run_tool php artisan config:cache')
        ->toContain('run_tool php artisan event:cache')
        ->toContain('run_tool php artisan about --only=environment,application')
        ->toContain('curl --fail --silent --show-error --location --max-time 10 "$HEALTHCHECK_URL"')
        ->toContain('sudo systemctl restart "${PHP_FPM_SERVICE%.service}"')
        ->not->toContain('bun install')
        ->not->toContain('horizon');

    expect($wrapper)
        ->not->toBeFalse()
        ->toContain("printf 'Iniciando deploy em %s...\\n'")
        ->toContain('exec vendor/bin/deploy "$@"');

    expect($entrypoint)
        ->not->toBeFalse()
        ->toContain('exec "$SCRIPT_DIR/deploy.sh" "$@"');

    expect($config)
        ->not->toBeFalse()
        ->toContain('DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"')
        ->toContain('FRONTEND_INSTALL=(vp install --frozen-lockfile)')
        ->toContain('FRONTEND_BUILD=(vp build)');
});

test('the short deployment entrypoint delegates to the package command', function (): void {
    $process = new Process(
        [base_path('deploy'), '--help'],
        base_path(),
    );
    $process->run();

    expect($process->isSuccessful())->toBeTrue();
    expect($process->getOutput())
        ->toContain('Iniciando deploy em')
        ->toContain('vendor/bin/deploy [deploy]');
});

test('the deployment script stops before changing code when the worktree is dirty', function (): void {
    $filesystem = new Filesystem;
    $fixture = sys_get_temp_dir().'/estoque-deploy-'.bin2hex(random_bytes(8));
    $fixtureBin = $fixture.'/bin';

    try {
        $filesystem->makeDirectory($fixtureBin, 0755, true);
        $filesystem->copy(base_path('vendor/dougkusanagi/laravel-deploy/bin/deploy'), $fixture.'/deploy.sh');
        $filesystem->copy(base_path('deploy.config.sh'), $fixture.'/deploy.config.sh');
        chmod($fixture.'/deploy.sh', 0755);
        $filesystem->put($fixture.'/uncommitted.txt', 'alteração local');

        foreach (['composer', 'php', 'vp', 'systemctl', 'sudo'] as $command) {
            $commandPath = $fixtureBin.'/'.$command;

            $filesystem->put($commandPath, "#!/usr/bin/env bash\nexit 0\n");
            chmod($commandPath, 0755);
        }

        symlink('/usr/bin/flock', $fixtureBin.'/flock');

        $git = new Process(
            ['git', 'init', '--initial-branch=master'],
            $fixture,
        );
        $git->mustRun();

        $process = new Process(
            ['bash', $fixture.'/deploy.sh'],
            $fixture,
            ['PATH' => $fixtureBin.':/usr/bin:/bin'],
        );
        $process->run();

        expect($process->getExitCode())->not->toBe(0);
        expect($process->getOutput().$process->getErrorOutput())
            ->toContain('a árvore de trabalho não está limpa')
            ->toContain('antes de atualizar o código');
    } finally {
        $filesystem->deleteDirectory($fixture);
    }
});
