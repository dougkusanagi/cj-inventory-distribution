#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"
printf 'Iniciando deploy em %s...\n' "$PROJECT_ROOT"
exec vendor/bin/deploy "$@"
