# Configuração do laravel-deploy para este projeto.
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE-php8.5-fpm}"
PHP_FPM_ACTION="${PHP_FPM_ACTION:-reload}"
WEB_SERVICE="${WEB_SERVICE-}"
HORIZON="${HORIZON:-false}"
STORAGE_LINK="${STORAGE_LINK:-true}"
# Bun provides the JavaScript runtime on the server, which does not have Node.
# Do not let Vite+ select npm internally: invoke Bun's installer and script
# runner directly.
FRONTEND_INSTALL=(bun install --frozen-lockfile --no-save)
FRONTEND_BUILD=(bun run build)
