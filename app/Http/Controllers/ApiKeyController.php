<?php

namespace App\Http\Controllers;

use App\Services\KeyVaultService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyController extends Controller
{
    public function __construct(
        protected KeyVaultService $keyVaultService
    ) {}

    /**
     * Show the settings page with API key status and audit logs.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Settings', [
            'apiKey' => $user->apiKey ? [
                'key_hint' => $user->apiKey->key_hint,
                'default_model' => $user->apiKey->default_model,
                'is_active' => $user->apiKey->is_active,
                'last_verified_at' => $user->apiKey->last_verified_at?->toIso8601String(),
            ] : null,
            'auditLogs' => $user->auditLogs()
                ->latest('created_at')
                ->take(10)
                ->get(['id', 'action', 'ip_address', 'metadata', 'created_at']),
        ]);
    }

    /**
     * Store and live-verify a new Gemini API Key.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'api_key' => ['required', 'string', 'max:255'],
            'default_model' => ['nullable', 'string', 'in:gemini-3.8-flash,gemini-3.5-flash-lite,gemini-4-carbon'],
        ]);

        $defaultModel = $validated['default_model'] ?? 'gemini-3.8-flash';

        $this->keyVaultService->store(
            $request->user(),
            $validated['api_key'],
            $defaultModel,
            $request->ip()
        );

        return back()->with('success', 'Gemini API Key successfully verified and saved!');
    }

    /**
     * Test connection for an existing stored API key.
     */
    public function test(Request $request): RedirectResponse
    {
        $isValid = $this->keyVaultService->verify($request->user(), $request->ip());

        if ($isValid) {
            return back()->with('success', 'Connection test passed! Your Gemini API key is active.');
        }

        return back()->withErrors([
            'api_key' => 'Connection test failed. The API key is rejected by Google Gemini.',
        ]);
    }

    /**
     * Update default model preference.
     */
    public function updateModel(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_model' => ['required', 'string', 'in:gemini-3.8-flash,gemini-3.5-flash-lite,gemini-4-carbon'],
        ]);

        $this->keyVaultService->updateModel(
            $request->user(),
            $validated['default_model'],
            $request->ip()
        );

        return back()->with('success', 'Default AI model updated successfully.');
    }

    /**
     * Remove the stored API key.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $this->keyVaultService->delete($request->user(), $request->ip());

        return back()->with('success', 'API Key has been removed securely.');
    }
}
