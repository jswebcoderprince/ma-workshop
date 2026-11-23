<?php

namespace Tests\Feature;

use Tests\TestCase;

/** Install on phone (docs/SCOPE.md): manifest, icons and service worker are in place and linked. */
class PwaTest extends TestCase
{
    public function test_manifest_lists_icons_that_exist(): void
    {
        $manifest = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('standalone', $manifest['display']);
        $this->assertSame('/', $manifest['start_url']);
        $purposes = array_column($manifest['icons'], 'purpose');
        $this->assertContains('maskable', $purposes);
        foreach ($manifest['icons'] as $icon) {
            $this->assertFileExists(public_path(ltrim($icon['src'], '/')));
        }
        foreach (['sw.js', 'offline.html', 'apple-touch-icon.png', 'favicon.svg', 'favicon.ico'] as $file) {
            $this->assertFileExists(public_path($file));
        }
    }

    public function test_pages_link_the_manifest_and_icons(): void
    {
        $this->get('/login')->assertOk()
            ->assertSee('<link rel="manifest" href="/manifest.webmanifest">', false)
            ->assertSee('<link rel="apple-touch-icon" href="/apple-touch-icon.png">', false);
    }
}
