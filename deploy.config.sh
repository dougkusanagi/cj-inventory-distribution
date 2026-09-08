# Configuração do laravel-deploy para este projeto.
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE:-php8.5-fpm}"
WEB_SERVICE="${WEB_SERVICE:-}"
AUTO_DETECT_WEB_SERVICE="${AUTO_DETECT_WEB_SERVICE:-true}"
STORAGE_LINK="${STORAGE_LINK:-true}"
FRONTEND_INSTALL=(vp install --frozen-lockfile)
FRONTEND_BUILD=(vp build)
