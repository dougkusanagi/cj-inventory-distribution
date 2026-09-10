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
        ->toContain('if [[ "$EUID" -eq 0 ]]')
        ->toContain('export COMPOSER_ALLOW_SUPERUSER="${COMPOSER_ALLOW_SUPERUSER:-1}"')
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

test('the deployment script pulls remote changes when an untracked file exists', function (): void {
    $filesystem = new Filesystem;
    $fixture = sys_get_temp_dir().'/estoque-deploy-'.bin2hex(random_bytes(8));
    $remote = $fixture.'/remote.git';
    $source = $fixture.'/source';
    $application = $fixture.'/application';
    $fixtureBin = $fixture.'/bin';

    try {
        $filesystem->makeDirectory($fixtureBin, 0755, true);

        foreach (['composer', 'php'] as $command) {
            $commandPath = $fixtureBin.'/'.$command;

            $filesystem->put($commandPath, "#!/usr/bin/env bash\nexit 0\n");
            chmod($commandPath, 0755);
        }

        symlink('/usr/bin/flock', $fixtureBin.'/flock');

        (new Process(['git', 'init', '--bare', '--initial-branch=master', $remote]))->mustRun();
        (new Process(['git', 'clone', $remote, $source]))->mustRun();
        (new Process(['git', 'config', 'user.name', 'Test'], $source))->mustRun();
        (new Process(['git', 'config', 'user.email', 'test@example.com'], $source))->mustRun();

        $filesystem->put($source.'/version.txt', "old\n");
        (new Process(['git', 'add', 'version.txt'], $source))->mustRun();
        (new Process(['git', 'commit', '-m', 'Initial version'], $source))->mustRun();
        (new Process(['git', 'push', 'origin', 'master'], $source))->mustRun();
        (new Process(['git', 'clone', $remote, $application]))->mustRun();

        $filesystem->put($source.'/version.txt', "new\n");
        (new Process(['git', 'commit', '-am', 'Update version'], $source))->mustRun();
        (new Process(['git', 'push', 'origin', 'master'], $source))->mustRun();

        $filesystem->copy(base_path('vendor/dougkusanagi/laravel-deploy/bin/deploy'), $application.'/deploy.sh');
        $filesystem->put($application.'/deploy.config.sh', <<<'BASH'
DEPLOY_BRANCH="master"
PHP_FPM_SERVICE=""
WEB_SERVICE=""
AUTO_DETECT_WEB_SERVICE="false"
STORAGE_LINK="false"
FRONTEND_INSTALL=()
FRONTEND_BUILD=()
BASH);
        $filesystem->put($application.'/untracked.txt', 'alteração local');
        chmod($application.'/deploy.sh', 0755);

        $process = new Process(
            ['bash', $application.'/deploy.sh'],
            $application,
            ['PATH' => $fixtureBin.':/usr/bin:/bin'],
        );
        $process->mustRun();

        expect($process->getOutput().$process->getErrorOutput())
            ->toContain('Atualizando o código da branch master')
            ->toContain('Deploy concluído.');
        expect(file_get_contents($application.'/version.txt'))->toBe("new\n");
        expect(file_get_contents($application.'/untracked.txt'))->toBe('alteração local');
    } finally {
        $filesystem->deleteDirectory($fixture);
    }
});
