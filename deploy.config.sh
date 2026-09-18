# Configuração do laravel-deploy para este projeto.
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE-php8.5-fpm}"
PHP_FPM_ACTION="${PHP_FPM_ACTION:-reload}"
WEB_SERVICE="${WEB_SERVICE-}"
HORIZON="${HORIZON:-false}"
STORAGE_LINK="${STORAGE_LINK:-true}"
# Bun is available on the server, while Vite+ itself expects a Node launcher.
# Running its local CLI through Bun keeps the deploy independent from a global
# `vp` or `node` binary.
FRONTEND_INSTALL=(bun node_modules/vite-plus/bin/vp install --frozen-lockfile)
FRONTEND_BUILD=(bun node_modules/vite-plus/bin/vp build)
