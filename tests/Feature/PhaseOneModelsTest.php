<?php

namespace Tests\Feature;

use App\Enums\FindingCategory;
use App\Enums\ReviewStatus;
use App\Enums\Severity;
use App\Models\ApiKey;
use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Review;
use App\Models\ReviewFinding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class PhaseOneModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_keys_update_or_create_cleanly_replaces_key(): void
    {
        $user = User::factory()->create();

        // 1. Initial key setup
        $initialKey = ApiKey::updateOrCreate(
            ['user_id' => $user->id],
            [
                'encrypted_key' => Crypt::encryptString('AIzaSyFirstInitialTestKey12345678901234'),
                'key_hint' => 'AIza...1234',
                'is_active' => true,
                'last_verified_at' => now(),
            ]
        );

        $this->assertEquals('AIza...1234', $initialKey->key_hint);
        $this->assertEquals(1, ApiKey::where('user_id', $user->id)->count());

        // 2. User replaces or re-adds key later
        $updatedKey = ApiKey::updateOrCreate(
            ['user_id' => $user->id],
            [
                'encrypted_key' => Crypt::encryptString('AIzaSySecondReplacedKey9999999999998888'),
                'key_hint' => 'AIza...8888',
                'is_active' => true,
                'last_verified_at' => now(),
            ]
        );

        $this->assertEquals('AIza...8888', $updatedKey->key_hint);
        $this->assertEquals($initialKey->id, $updatedKey->id);
        $this->assertEquals(1, ApiKey::where('user_id', $user->id)->count());
        $this->assertEquals('AIzaSySecondReplacedKey9999999999998888', Crypt::decryptString($updatedKey->encrypted_key));
    }

    public function test_api_key_zero_exposure_policy_hides_encrypted_key(): void
    {
        $user = User::factory()->create();

        $apiKey = ApiKey::create([
            'user_id' => $user->id,
            'encrypted_key' => Crypt::encryptString('AIzaSySecretRawKeyDoNotExpose9xQp'),
            'key_hint' => 'AIza...9xQp',
            'is_active' => true,
            'last_verified_at' => now(),
        ]);

        $serializedArray = $apiKey->toArray();
        $this->assertArrayNotHasKey('encrypted_key', $serializedArray);

        $json = json_encode($apiKey);
        $this->assertStringNotContainsString('encrypted_key', $json);
        $this->assertStringNotContainsString('AIzaSySecretRawKey', $json);
    }

    public function test_review_and_findings_relationships_and_enums(): void
    {
        $user = User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'CodePulse Core',
            'description' => 'AI Code Review Engine',
        ]);

        $review = Review::create([
            'user_id' => $user->id,
            'project_id' => $project->id,
            'language' => 'PHP',
            'source_code' => '<?php function test() { return true; }',
            'focus_areas' => ['performance', 'security'],
            'status' => ReviewStatus::PENDING,
            'overall_score' => 92,
            'performance_score' => 95,
            'security_score' => 90,
            'maintainability_score' => 91,
            'tokens_used' => 420,
            'model_used' => 'gemini-2.5-flash',
        ]);

        $finding = ReviewFinding::create([
            'review_id' => $review->id,
            'category' => FindingCategory::PERFORMANCE,
            'severity' => Severity::HIGH,
            'title' => 'Potential memory leak',
            'description' => 'Unbounded buffer accumulation detected.',
            'line_start' => 12,
            'line_end' => 18,
            'suggested_fix' => 'unset($buffer);',
        ]);

        $auditLog = AuditLog::create([
            'user_id' => $user->id,
            'action' => 'review_created',
            'ip_address' => '127.0.0.1',
            'metadata' => ['review_id' => $review->id],
        ]);

        $this->assertEquals(ReviewStatus::PENDING, $review->status);
        $this->assertEquals('Pending', $review->status->label());
        $this->assertEquals(FindingCategory::PERFORMANCE, $finding->category);
        $this->assertEquals(Severity::HIGH, $finding->severity);
        $this->assertEquals('orange', $finding->severity->color());

        $this->assertCount(1, $user->reviews);
        $this->assertCount(1, $review->findings);
        $this->assertCount(1, $user->projects);
        $this->assertCount(1, $user->auditLogs);
    }
}
