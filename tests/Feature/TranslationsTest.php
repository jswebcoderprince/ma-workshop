<?php

namespace Tests\Feature;

use Symfony\Component\Finder\Finder;
use Tests\TestCase;

/**
 * Every UI string must have a Lithuanian translation, because the app is delivered in Lithuanian.
 * Looks for literal t('…') in React files and __('…') in PHP files under app/.
 */
class TranslationsTest extends TestCase
{
    /** @return array<string, string> */
    private function lithuanian(): array
    {
        return json_decode((string) file_get_contents(lang_path('lt.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    /** @return list<string> */
    private function keysIn(string $dir, string $pattern, string $regex): array
    {
        $keys = [];
        foreach ((new Finder)->files()->in(base_path($dir))->name($pattern) as $file) {
            // Ignore comments so documentation examples are not treated as UI text.
            $code = preg_replace(['#/\*.*?\*/#s', '#^\s*//.*$#m'], '', $file->getContents());
            preg_match_all($regex, (string) $code, $m);
            foreach ($m[1] as $raw) {
                $keys[] = stripcslashes($raw);
            }
        }

        return array_values(array_unique($keys));
    }

    public function test_every_react_string_has_a_lithuanian_translation(): void
    {
        $keys = $this->keysIn('resources/js', '*.tsx', "/\\bt\\(\\s*'((?:[^'\\\\]|\\\\.)+)'/");
        $this->assertNotEmpty($keys);
        $missing = array_values(array_diff($keys, array_keys($this->lithuanian())));
        $this->assertSame([], $missing, 'Add these to lang/lt.json');
    }

    public function test_every_php_string_has_a_lithuanian_translation(): void
    {
        $keys = $this->keysIn('app', '*.php', "/(?:__|trans_choice)\\(\\s*'((?:[^'\\\\]|\\\\.)+)'/");
        $missing = [];
        foreach ($keys as $key) {
            // "auth.failed" style keys live in lang/lt/auth.php, sentences live in lang/lt.json.
            if (preg_match('/^([a-z_]+)\.([a-z_.]+)$/', $key, $m)) {
                $file = lang_path("lt/{$m[1]}.php");
                $found = is_file($file) && data_get(require $file, $m[2]) !== null;
            } else {
                $found = array_key_exists($key, $this->lithuanian());
            }
            if (! $found) {
                $missing[] = $key;
            }
        }
        $this->assertSame([], $missing, 'Add these Lithuanian translations');
    }

    public function test_lithuanian_file_has_no_empty_or_untranslated_values(): void
    {
        $same = [];
        foreach ($this->lithuanian() as $en => $lt) {
            $this->assertNotSame('', trim($lt), "Empty translation for '$en'");
            if ($en === $lt && preg_match('/[a-z]{4,}/', $en)) {
                $same[] = $en;
            }
        }
        $this->assertSame([], $same, 'These look untranslated');
    }
}
