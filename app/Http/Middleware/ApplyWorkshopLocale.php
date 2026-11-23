<?php

namespace App\Http\Middleware;

use App\Support\Settings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** The app language is one workshop-wide setting (Settings → General), not per user. */
class ApplyWorkshopLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        app()->setLocale(Settings::locale());

        return $next($request);
    }
}
