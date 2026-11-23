<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-accent="{{ \App\Support\Settings::accent() }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="robots" content="noindex, nofollow">
        <meta name="theme-color" content="#141618">

        <title inertia>{{ config('app.name', 'MA Workshop') }}</title>

        {{-- Apply the saved theme before the first paint, so dark mode does not flash white. --}}
        <script>
            (function () {
                try {
                    var a = localStorage.getItem('appearance') || 'light';
                    var dark = a === 'dark' || (a === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.toggle('dark', dark);
                } catch (e) {}
            })();
        </script>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=ibm-plex-sans:400,500,600,700|ibm-plex-mono:500,600&display=swap" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
