#!/usr/bin/env bash

set -Eeuo pipefail

REPOSITORY_ROOT="$(git rev-parse --show-toplevel)"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE:-php8.5-fpm}"
WEB_SERVICE="${WEB_SERVICE:-}"

if command -v mise >/dev/null 2>&1; then
    TOOL_PREFIX=(mise exec --)
else
    TOOL_PREFIX=()
fi

run_tool() {
    "${TOOL_PREFIX[@]}" "$@"
}

cd "$REPOSITORY_ROOT"

echo "Atualizando o código..."
git switch main
git pull --ff-only origin main

echo "Instalando dependências PHP..."
run_tool composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

echo "Instalando dependências e compilando o frontend..."
run_tool vp install --frozen-lockfile
run_tool vp build

echo "Atualizando a aplicação..."
run_tool php artisan migrate --force --isolated
run_tool php artisan storage:link --force
run_tool php artisan optimize:clear
run_tool php artisan config:cache
run_tool php artisan event:cache

echo "Recarregando os serviços..."
if [[ -z "$WEB_SERVICE" ]]; then
    if systemctl cat caddy.service >/dev/null 2>&1; then
        WEB_SERVICE="caddy"
    elif systemctl cat nginx.service >/dev/null 2>&1; then
        WEB_SERVICE="nginx"
    fi
fi

if [[ -n "$WEB_SERVICE" ]]; then
    sudo systemctl reload "$WEB_SERVICE"
else
    echo "Aviso: nenhum serviço web (Caddy ou Nginx) foi encontrado; defina WEB_SERVICE."
fi

sudo systemctl restart "$PHP_FPM_SERVICE"

echo "Deploy concluído."
