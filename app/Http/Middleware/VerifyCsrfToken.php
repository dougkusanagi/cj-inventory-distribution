<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Symfony\Component\HttpFoundation\Cookie;

class VerifyCsrfToken extends PreventRequestForgery
{
    public const COOKIE_NAME = 'distribuicao-de-inventario-XSRF-TOKEN';

    /**
     * Create the application-specific XSRF cookie.
     *
     * The application is also available through an IP address shared by other
     * Laravel applications. Cookie names are shared across ports, so the
     * default XSRF-TOKEN cookie can be overwritten by another application.
     *
     * @param  array<string, mixed>  $config
     */
    protected function newCookie($request, $config)
    {
        return new Cookie(
            self::COOKIE_NAME,
            $request->session()->token(),
            $this->availableAt(60 * $config['lifetime']),
            $config['path'],
            $config['domain'],
            $config['secure'],
            false,
            false,
            $config['same_site'] ?? null,
            $config['partitioned'] ?? false,
        );
    }
}
