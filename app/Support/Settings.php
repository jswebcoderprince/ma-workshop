<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * App settings: defaults from config/workshop.php, overridden by rows in `settings`.
 */
final class Settings
{
    private const CACHE_KEY = 'workshop.settings';

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = self::all();

        return array_key_exists($key, $all) ? $all[$key] : $default;
    }

    /** @return array<string, mixed> */
    public static function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => Setting::query()->pluck('value', 'key')->all());

        return array_replace(config('workshop.defaults'), $stored);
    }

    public static function set(string $key, mixed $value): void
    {
        Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget(self::CACHE_KEY);
    }

    /** @param  array<string, mixed>  $values */
    public static function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
        Cache::forget(self::CACHE_KEY);
    }

    /** cobalt (design default) or teal (MA Engine Lab brand). Older saved values fall back to cobalt. */
    public static function accent(): string
    {
        return self::get('accent') === 'teal' ? 'teal' : 'cobalt';
    }

    public static function locale(): string
    {
        $locale = self::get('locale', 'en');

        return in_array($locale, ['en', 'lt'], true) ? $locale : 'en';
    }
}
