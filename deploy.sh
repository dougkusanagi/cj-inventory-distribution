#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"

if [[ "$EUID" -eq 0 ]]; then
    export COMPOSER_ALLOW_SUPERUSER="${COMPOSER_ALLOW_SUPERUSER:-1}"
fi

printf 'Iniciando deploy em %s...\n' "$PROJECT_ROOT"
exec vendor/bin/deploy "$@"
