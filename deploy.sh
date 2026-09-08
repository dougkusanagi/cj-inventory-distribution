#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"
exec vendor/bin/deploy "$@"
