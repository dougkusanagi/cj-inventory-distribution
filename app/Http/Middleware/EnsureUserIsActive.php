<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $this->ensureActive($request);
        $response = $next($request);
        $this->ensureActive($request);

        return $response;
    }

    private function ensureActive(Request $request): void
    {
        if ($request->user() !== null && ! $request->user()->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            abort(403, 'Esta conta está desativada. Entre em contato com o administrador.');
        }
    }
}
