<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPanelAccess
{
    /**
     * Allow any user with a role into the internal panel.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->hasPanelAccess() ?? false, 403);

        return $next($request);
    }
}
