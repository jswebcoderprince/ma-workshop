<?php

namespace App\Support;

/**
 * UI strings for the React side. Keys are the English text; lang/lt.json holds the Lithuanian.
 * English needs no file: a missing key falls back to the key itself.
 */
final class Translations
{
    /** @var array<string, array<string, string>> */
    private static array $loaded = [];

    /** @return array<string, string> */
    public static function for(string $locale): array
    {
        if ($locale === 'en') {
            return [];
        }

        return self::$loaded[$locale] ??= self::read(lang_path($locale.'.json'));
    }

    /** @return array<string, string> */
    private static function read(string $path): array
    {
        if (! is_file($path)) {
            return [];
        }

        return json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    }
}
