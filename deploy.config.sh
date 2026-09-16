# Configuração do laravel-deploy para este projeto.
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE-php8.5-fpm}"
PHP_FPM_ACTION="${PHP_FPM_ACTION:-reload}"
WEB_SERVICE="${WEB_SERVICE-}"
HORIZON="${HORIZON:-false}"
STORAGE_LINK="${STORAGE_LINK:-true}"
FRONTEND_INSTALL=(vp install --frozen-lockfile)
FRONTEND_BUILD=(vp build)
