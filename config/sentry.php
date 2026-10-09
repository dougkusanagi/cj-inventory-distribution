<?php

return [
    'dsn' => env('SENTRY_LARAVEL_DSN'),
    'environment' => env('SENTRY_ENVIRONMENT', env('APP_ENV')),
    'release' => env('SENTRY_RELEASE'),
    'send_default_pii' => false,
    'max_request_body_size' => 'none',
    'traces_sample_rate' => 0.0,
    'profiles_sample_rate' => 0.0,
    'enable_logs' => false,
    'enable_metrics' => false,
];
