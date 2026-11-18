<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class KeyVaultSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_renders_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('settings'));

        $response->assertOk();
    }

    public function test_guest_is_redirected_to_login_from_settings(): void
    {
        $response = $this->get(route('settings'));

        $response->assertRedirect(route('login'));
    }

    public function test_valid_api_key_storage_with_http_fake_using_x_goog_api_key_header(): void
    {
        $user = User::factory()->create();

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'models' => [
                    ['name' => 'models/gemini-2.5-flash'],
                ],
            ], 200),
        ]);

        $rawKey = 'AIzaSyValidGeminiKeyForTesting1234567890';

        $response = $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => $rawKey,
            'default_model' => 'gemini-2.5-flash',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $apiKey = ApiKey::where('user_id', $user->id)->first();
        $this->assertNotNull($apiKey);
        $this->assertEquals('AIza...7890', $apiKey->key_hint);
        $this->assertTrue($apiKey->is_active);
        $this->assertEquals('gemini-2.5-flash', $apiKey->default_model);
        $this->assertEquals($rawKey, Crypt::decryptString($apiKey->encrypted_key));

        // Audit log check
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'api_key_stored',
        ]);

        Http::assertSent(function ($request) use ($rawKey) {
            return str_contains($request->url(), 'generativelanguage.googleapis.com') &&
                $request->hasHeader('x-goog-api-key', $rawKey) &&
                ! str_contains($request->url(), 'key=');
        });
    }

    public function test_valid_aq_prefixed_api_key_storage_using_header(): void
    {
        $user = User::factory()->create();

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'models' => [
                    ['name' => 'models/gemini-2.5-flash'],
                ],
            ], 200),
        ]);

        $rawKey = 'AQ.NewAuthKeyFormatFromGoogleStudio9876';

        $response = $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => $rawKey,
            'default_model' => 'gemini-2.5-pro',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $apiKey = ApiKey::where('user_id', $user->id)->first();
        $this->assertNotNull($apiKey);
        $this->assertEquals('AQ.N...9876', $apiKey->key_hint);
        $this->assertTrue($apiKey->is_active);
        $this->assertEquals('gemini-2.5-pro', $apiKey->default_model);
        $this->assertEquals($rawKey, Crypt::decryptString($apiKey->encrypted_key));

        Http::assertSent(function ($request) use ($rawKey) {
            return str_contains($request->url(), 'generativelanguage.googleapis.com') &&
                $request->hasHeader('x-goog-api-key', $rawKey) &&
                ! str_contains($request->url(), 'key=');
        });
    }

    public function test_invalid_api_key_is_rejected_on_401(): void
    {
        $user = User::factory()->create();

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'error' => [
                    'code' => 401,
                    'message' => 'API key not valid. Please pass a valid API key.',
                ],
            ], 401),
        ]);

        $response = $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => 'AIzaSyInvalidKeyThatFailsVerification00',
            'default_model' => 'gemini-2.5-flash',
        ]);

        $response->assertSessionHasErrors('api_key');
        $this->assertEquals(0, ApiKey::where('user_id', $user->id)->count());
        $this->assertEquals(0, AuditLog::where('user_id', $user->id)->count());
    }

    public function test_invalid_api_key_is_rejected_on_403(): void
    {
        $user = User::factory()->create();

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'error' => [
                    'code' => 403,
                    'message' => 'The caller does not have permission.',
                ],
            ], 403),
        ]);

        $response = $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => 'AIzaSyForbiddenPermissionKey0000000000',
            'default_model' => 'gemini-2.5-flash',
        ]);

        $response->assertSessionHasErrors('api_key');
        $this->assertEquals(0, ApiKey::where('user_id', $user->id)->count());
    }

    public function test_malformed_key_without_valid_prefix_is_rejected_without_calling_gemini(): void
    {
        $user = User::factory()->create();

        Http::fake();

        $response = $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => 'sk-ant-some-wrong-key-prefix-not-gemini',
        ]);

        $response->assertSessionHasErrors('api_key');
        Http::assertNothingSent();
    }

    public function test_test_connection_verifies_stored_key(): void
    {
        $user = User::factory()->create();

        $rawKey = 'AIzaSyValidActiveTestingKey1234567890';
        $apiKey = ApiKey::create([
            'user_id' => $user->id,
            'encrypted_key' => Crypt::encryptString($rawKey),
            'key_hint' => 'AIza...7890',
            'default_model' => 'gemini-2.5-flash',
            'is_active' => true,
        ]);

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response(['models' => []], 200),
        ]);

        $response = $this->actingAs($user)->post(route('settings.api-key.test'));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'api_key_verified',
        ]);

        Http::assertSent(function ($request) use ($rawKey) {
            return $request->hasHeader('x-goog-api-key', $rawKey) &&
                ! str_contains($request->url(), 'key=');
        });
    }

    public function test_test_connection_deactivates_key_when_gemini_rejects(): void
    {
        $user = User::factory()->create();

        $apiKey = ApiKey::create([
            'user_id' => $user->id,
            'encrypted_key' => Crypt::encryptString('AIzaSyValidFormatKeyLaterRevoked12345'),
            'key_hint' => 'AIza...2345',
            'default_model' => 'gemini-2.5-flash',
            'is_active' => true,
        ]);

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response(['error' => 'revoked'], 403),
        ]);

        $response = $this->actingAs($user)->post(route('settings.api-key.test'));

        $response->assertSessionHasErrors('api_key');

        $apiKey->refresh();
        $this->assertFalse($apiKey->is_active);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'api_key_verification_failed',
        ]);
    }

    public function test_key_deletion_removes_api_key_and_creates_audit_log(): void
    {
        $user = User::factory()->create();

        ApiKey::create([
            'user_id' => $user->id,
            'encrypted_key' => Crypt::encryptString('AIzaSyKeyToBeDeletedNow123456789012'),
            'key_hint' => 'AIza...9012',
            'default_model' => 'gemini-2.5-flash',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->delete(route('settings.api-key.destroy'));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertEquals(0, ApiKey::where('user_id', $user->id)->count());

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'api_key_deleted',
        ]);
    }

    public function test_update_model_preference(): void
    {
        $user = User::factory()->create();

        $apiKey = ApiKey::create([
            'user_id' => $user->id,
            'encrypted_key' => Crypt::encryptString('AIzaSyKeyForModelSwitch123456789012'),
            'key_hint' => 'AIza...9012',
            'default_model' => 'gemini-2.5-flash',
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->patch(route('settings.api-key.model'), [
            'default_model' => 'gemini-2.5-pro',
        ]);

        $response->assertRedirect();
        $apiKey->refresh();
        $this->assertEquals('gemini-2.5-pro', $apiKey->default_model);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'api_key_model_updated',
        ]);
    }

    public function test_cleanly_replace_key_with_update_or_create(): void
    {
        $user = User::factory()->create();

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response(['models' => []], 200),
        ]);

        // First key (AIza format)
        $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => 'AIzaSyFirstOriginalKey12345678901111',
            'default_model' => 'gemini-2.5-flash',
        ]);

        $this->assertEquals(1, ApiKey::where('user_id', $user->id)->count());
        $this->assertEquals('AIza...1111', ApiKey::where('user_id', $user->id)->first()->key_hint);

        // Replace with new AQ. format key
        $this->actingAs($user)->post(route('settings.api-key.store'), [
            'api_key' => 'AQ.SecondReplacedKey99999999992222',
            'default_model' => 'gemini-2.5-pro',
        ]);

        $this->assertEquals(1, ApiKey::where('user_id', $user->id)->count());
        $updatedKey = ApiKey::where('user_id', $user->id)->first();
        $this->assertEquals('AQ.S...2222', $updatedKey->key_hint);
        $this->assertEquals('gemini-2.5-pro', $updatedKey->default_model);
        $this->assertEquals('AQ.SecondReplacedKey99999999992222', Crypt::decryptString($updatedKey->encrypted_key));
    }
}
