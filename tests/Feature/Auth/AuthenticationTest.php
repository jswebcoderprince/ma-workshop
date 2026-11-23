<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $this->get('/login')->assertOk()->assertInertia(fn ($page) => $page->component('auth/login'));
    }

    public function test_users_can_log_in_and_land_on_the_overview(): void
    {
        $user = User::factory()->create();

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('overview', absolute: false));
        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->post('/login', ['email' => $user->email, 'password' => 'wrong-password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_users_can_log_out(): void
    {
        $this->actingAs(User::factory()->create())->post('/logout')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_guests_are_sent_to_login(): void
    {
        foreach (['/', '/calendar', '/jobs', '/settings/general'] as $url) {
            $this->get($url)->assertRedirect(route('login'));
        }
    }

    public function test_there_is_no_self_registration_or_email_reset(): void
    {
        foreach (['/register', '/forgot-password', '/reset-password/x', '/verify-email'] as $url) {
            $this->get($url)->assertNotFound();
        }
    }
}
