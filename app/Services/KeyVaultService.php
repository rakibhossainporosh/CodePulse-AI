<?php

namespace App\Services;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class KeyVaultService
{
    private const GEMINI_MODELS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

    /**
     * Store and encrypt a user's Gemini API key after live verification.
     *
     * @throws ValidationException
     */
    public function store(User $user, string $rawKey, string $defaultModel = 'gemini-2.5-flash', ?string $ipAddress = null): ApiKey
    {
        $rawKey = trim($rawKey);

        if (empty($rawKey)) {
            throw ValidationException::withMessages([
                'api_key' => 'API Key cannot be empty.',
            ]);
        }

        // Basic sanity check for Google Gemini API key format
        if (! str_starts_with($rawKey, 'AIza') || strlen($rawKey) < 30) {
            throw ValidationException::withMessages([
                'api_key' => 'Invalid Gemini API key format. A valid key starts with "AIza".',
            ]);
        }

        // Live test ping to Gemini models.list endpoint with 10s timeout
        $isValid = $this->pingGeminiApi($rawKey);

        if (! $isValid) {
            // Never log the raw key!
            Log::warning('Gemini API key verification failed during storage', [
                'user_id' => $user->id,
            ]);

            throw ValidationException::withMessages([
                'api_key' => 'Failed to verify API Key with Google Gemini. Please check that your key is active and has Generative Language API enabled.',
            ]);
        }

        $encryptedKey = Crypt::encryptString($rawKey);
        $keyHint = substr($rawKey, 0, 4) . '...' . substr($rawKey, -4);

        // Cleanly replace or re-add using updateOrCreate
        $apiKey = ApiKey::updateOrCreate(
            ['user_id' => $user->id],
            [
                'encrypted_key' => $encryptedKey,
                'key_hint' => $keyHint,
                'default_model' => $defaultModel,
                'is_active' => true,
                'last_verified_at' => now(),
            ]
        );

        // Security audit logging (never logs raw key)
        $user->auditLogs()->create([
            'action' => 'api_key_stored',
            'ip_address' => $ipAddress,
            'metadata' => [
                'key_hint' => $keyHint,
                'default_model' => $defaultModel,
            ],
            'created_at' => now(),
        ]);

        return $apiKey;
    }

    /**
     * Verify an existing stored API key by decrypting and pinging Gemini.
     */
    public function verify(User $user, ?string $ipAddress = null): bool
    {
        $apiKey = $user->apiKey;

        if (! $apiKey) {
            return false;
        }

        try {
            $rawKey = Crypt::decryptString($apiKey->encrypted_key);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt API key for verification', ['user_id' => $user->id]);
            $apiKey->update(['is_active' => false]);
            return false;
        }

        $isValid = $this->pingGeminiApi($rawKey);

        $apiKey->update([
            'is_active' => $isValid,
            'last_verified_at' => $isValid ? now() : $apiKey->last_verified_at,
        ]);

        $user->auditLogs()->create([
            'action' => $isValid ? 'api_key_verified' : 'api_key_verification_failed',
            'ip_address' => $ipAddress,
            'metadata' => [
                'key_hint' => $apiKey->key_hint,
                'is_active' => $isValid,
            ],
            'created_at' => now(),
        ]);

        return $isValid;
    }

    /**
     * Decrypt and return plaintext key (Strictly for async Queue Worker execution).
     */
    public function decrypt(User $user): ?string
    {
        $apiKey = $user->apiKey;

        if (! $apiKey || ! $apiKey->is_active) {
            return null;
        }

        try {
            return Crypt::decryptString($apiKey->encrypted_key);
        } catch (\Exception $e) {
            Log::error('Decryption failed for user API key', ['user_id' => $user->id]);
            return null;
        }
    }

    /**
     * Update default model preference.
     */
    public function updateModel(User $user, string $defaultModel, ?string $ipAddress = null): ?ApiKey
    {
        $apiKey = $user->apiKey;

        if (! $apiKey) {
            return null;
        }

        $apiKey->update(['default_model' => $defaultModel]);

        $user->auditLogs()->create([
            'action' => 'api_key_model_updated',
            'ip_address' => $ipAddress,
            'metadata' => [
                'default_model' => $defaultModel,
            ],
            'created_at' => now(),
        ]);

        return $apiKey;
    }

    /**
     * Delete API key cleanly and log audit trail.
     */
    public function delete(User $user, ?string $ipAddress = null): void
    {
        $apiKey = $user->apiKey;

        if ($apiKey) {
            $keyHint = $apiKey->key_hint;
            $apiKey->delete();

            $user->auditLogs()->create([
                'action' => 'api_key_deleted',
                'ip_address' => $ipAddress,
                'metadata' => [
                    'key_hint' => $keyHint,
                ],
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Live ping to Google Gemini models.list endpoint with 10s timeout.
     */
    private function pingGeminiApi(string $rawKey): bool
    {
        try {
            $response = Http::timeout(10)->get(self::GEMINI_MODELS_ENDPOINT, [
                'key' => $rawKey,
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('Gemini API ping exception', ['message' => $e->getMessage()]);
            return false;
        }
    }
}
