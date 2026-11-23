<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\ActivityLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/** The owner's own login: name, email, password. */
class AccountController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/account', [
            'user' => $request->user()->only('name', 'email'),
        ]);
    }

    public function updateProfile(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated())->save();
        ActivityLog::record('account.updated', $request->user());

        return back()->with('status', 'saved');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update(['password' => Hash::make($validated['password'])]);
        ActivityLog::record('account.password', $request->user());

        return back()->with('status', 'saved');
    }
}
