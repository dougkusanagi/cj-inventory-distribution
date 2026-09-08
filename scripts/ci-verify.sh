#!/usr/bin/env bash

set -Eeuo pipefail

REPOSITORY_ROOT="$(git rev-parse --show-toplevel)"
started_at="$(date +%s)"

print_duration() {
    local finished_at elapsed_seconds

    finished_at="$(date +%s)"
    elapsed_seconds=$((finished_at - started_at))

    printf '\nTempo total do ci:verify: %s segundos.\n' "$elapsed_seconds"
}

trap print_duration EXIT

cd "$REPOSITORY_ROOT"

printf 'Executando as validações locais.\n'

php artisan config:clear --ansi
composer lint:check
vp fmt --check resources/
vp lint
vp build
vp check --no-fmt --no-lint
composer types:check
vp exec playwright install chromium
QUEUE_CONNECTION=sync php artisan test --compact
QUEUE_CONNECTION=sync composer test:e2e
