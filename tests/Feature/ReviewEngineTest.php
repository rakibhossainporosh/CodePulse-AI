<?php

namespace Tests\Feature;

use App\Enums\FindingCategory;
use App\Enums\ReviewStatus;
use App\Enums\Severity;
use App\Jobs\ProcessCodeReviewJob;
use App\Models\ApiKey;
use App\Models\Project;
use App\Models\Review;
use App\Models\User;
use App\Services\GeminiClient;
use App\Services\KeyVaultService;
use App\Services\PromptBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReviewEngineTest extends TestCase
{
    use RefreshDatabase;

    private function createActiveApiKey(User $user): ApiKey
    {
        return ApiKey::create([
            'user_id' => $user->id,
            'encrypted_key' => Crypt::encryptString('AIzaSyValidDummyTestKey123456789012345'),
            'key_hint' => 'AIza...2345',
            'default_model' => 'gemini-3.8-flash',
            'is_active' => true,
            'last_verified_at' => now(),
        ]);
    }

    public function test_user_without_api_key_is_redirected_to_settings(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('reviews.store'), [
            'language' => 'PHP',
            'source_code' => '<?php echo "Hello"; ?>',
            'focus_areas' => ['security'],
        ]);

        $response->assertRedirect(route('settings'));
        $response->assertSessionHas('error');
    }

    public function test_user_cannot_submit_without_focus_areas(): void
    {
        $user = User::factory()->create();
        $this->createActiveApiKey($user);

        $response = $this->actingAs($user)->post(route('reviews.store'), [
            'language' => 'PHP',
            'source_code' => '<?php echo "Hello"; ?>',
            'focus_areas' => [],
        ]);

        $response->assertSessionHasErrors('focus_areas');
    }

    public function test_successful_review_submission_dispatches_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $this->createActiveApiKey($user);

        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Backend API',
        ]);

        $response = $this->actingAs($user)->post(route('reviews.store'), [
            'project_id' => $project->id,
            'language' => 'PHP',
            'source_code' => '<?php echo "Safe Code"; ?>',
            'focus_areas' => ['performance', 'security'],
            'model_used' => 'gemini-3.8-flash',
        ]);

        $review = Review::where('user_id', $user->id)->first();
        $this->assertNotNull($review);
        $this->assertEquals(ReviewStatus::PENDING, $review->status);
        $this->assertEquals($project->id, $review->project_id);

        $response->assertRedirect(route('reviews.show', $review));

        Queue::assertPushed(ProcessCodeReviewJob::class, function ($job) use ($review) {
            return $job->review->id === $review->id;
        });
    }

    public function test_rate_limiter_enforces_max_ten_submissions_per_minute(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $this->createActiveApiKey($user);

        // Submit 10 times (should all succeed)
        for ($i = 0; $i < 10; $i++) {
            $res = $this->actingAs($user)->post(route('reviews.store'), [
                'language' => 'PHP',
                'source_code' => "<?php // Run {$i} ?>",
                'focus_areas' => ['security'],
            ]);
            $res->assertSessionHasNoErrors();
            $res->assertRedirect();
        }

        // 11th request in the same minute should be throttled (HTTP 429)
        $rateLimitedResponse = $this->actingAs($user)->post(route('reviews.store'), [
            'language' => 'PHP',
            'source_code' => '<?php // Run 11 ?>',
            'focus_areas' => ['security'],
        ]);

        $rateLimitedResponse->assertStatus(429);
    }

    public function test_review_policy_prevents_viewing_another_users_review(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $review = Review::create([
            'user_id' => $userA->id,
            'language' => 'JavaScript',
            'source_code' => 'console.log("Secret User A code");',
            'focus_areas' => ['security'],
            'status' => ReviewStatus::COMPLETED,
        ]);

        // User B cannot view User A's review
        $response = $this->actingAs($userB)->get(route('reviews.show', $review));
        $response->assertForbidden();

        // User A can view their own review
        $responseA = $this->actingAs($userA)->get(route('reviews.show', $review));
        $responseA->assertOk();
    }

    public function test_review_policy_prevents_deleting_another_users_review(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $review = Review::create([
            'user_id' => $userA->id,
            'language' => 'Python',
            'source_code' => 'print("User A code")',
            'focus_areas' => ['performance'],
            'status' => ReviewStatus::COMPLETED,
        ]);

        // User B cannot delete
        $response = $this->actingAs($userB)->delete(route('reviews.destroy', $review));
        $response->assertForbidden();
        $this->assertDatabaseHas('reviews', ['id' => $review->id]);

        // User A can delete
        $responseA = $this->actingAs($userA)->delete(route('reviews.destroy', $review));
        $responseA->assertRedirect(route('reviews.index'));
        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    public function test_job_execution_with_http_fake_computes_weighted_score_and_findings(): void
    {
        $user = User::factory()->create();
        $this->createActiveApiKey($user);

        $review = Review::create([
            'user_id' => $user->id,
            'language' => 'PHP',
            'source_code' => '<?php $input = $_GET["id"]; $res = DB::select("SELECT * FROM users WHERE id = " . $input);',
            'focus_areas' => ['performance', 'security', 'bug'],
            'model_used' => 'gemini-3.8-flash',
            'status' => ReviewStatus::PENDING,
        ]);

        // Mock Gemini generateContent response
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'scores' => [
                                            'security' => 50,
                                            'performance' => 80,
                                            'maintainability' => 70,
                                        ],
                                        'findings' => [
                                            [
                                                'category' => 'security',
                                                'severity' => 'critical',
                                                'line_start' => 1,
                                                'line_end' => 1,
                                                'title' => 'Direct SQL Injection Vulnerability',
                                                'description' => 'User input from $_GET is concatenated directly into SQL statement.',
                                                'suggested_fix' => 'DB::select("SELECT * FROM users WHERE id = ?", [$input]);',
                                            ],
                                            [
                                                'category' => 'performance',
                                                'severity' => 'medium',
                                                'line_start' => 1,
                                                'line_end' => 1,
                                                'title' => 'Unbounded SELECT * query',
                                                'description' => 'Retrieving all columns without limit can cause memory bloat.',
                                                'suggested_fix' => 'DB::select("SELECT id, name FROM users WHERE id = ? LIMIT 1", [$input]);',
                                            ],
                                        ],
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
                'usageMetadata' => [
                    'totalTokenCount' => 384,
                ],
            ], 200),
        ]);

        $keyVaultService = app(KeyVaultService::class);
        $geminiClient = app(GeminiClient::class);

        // Execute job synchronously
        $job = new ProcessCodeReviewJob($review);
        $job->handle($keyVaultService, $geminiClient);

        $review->refresh();

        // Check weighted score:
        // security: 50 * 0.35 = 17.5
        // performance: 80 * 0.35 = 28.0
        // maintainability: 70 * 0.30 = 21.0
        // sum = 66.5 -> round = 67
        $this->assertEquals(ReviewStatus::COMPLETED, $review->status);
        $this->assertEquals(67, $review->overall_score);
        $this->assertEquals(50, $review->security_score);
        $this->assertEquals(80, $review->performance_score);
        $this->assertEquals(70, $review->maintainability_score);
        $this->assertEquals(384, $review->tokens_used);

        // Check findings
        $findings = $review->findings;
        $this->assertCount(2, $findings);

        $criticalFinding = $findings->where('severity', Severity::CRITICAL)->first();
        $this->assertNotNull($criticalFinding);
        $this->assertEquals(FindingCategory::SECURITY, $criticalFinding->category);
        $this->assertEquals('Direct SQL Injection Vulnerability', $criticalFinding->title);
        $this->assertEquals(1, $criticalFinding->line_start);
        $this->assertStringContainsString('DB::select', $criticalFinding->suggested_fix);

        // Verify request was sent with x-goog-api-key header and without key in query string
        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'generateContent') &&
                $request->hasHeader('x-goog-api-key') &&
                ! str_contains($request->url(), 'key=');
        });
    }

    public function test_job_failure_handler_marks_review_failed_without_exposing_api_key(): void
    {
        $user = User::factory()->create();
        $review = Review::create([
            'user_id' => $user->id,
            'language' => 'PHP',
            'source_code' => '<?php echo "Fail test"; ?>',
            'status' => ReviewStatus::PROCESSING,
        ]);

        $exception = new \RuntimeException('Failed request to https://generativelanguage.googleapis.com with key=AQ.SecretRawKeyDoNotExpose123');

        $job = new ProcessCodeReviewJob($review);
        $job->failed($exception);

        $review->refresh();
        $this->assertEquals(ReviewStatus::FAILED, $review->status);
        $this->assertNotNull($review->error_message);
        $this->assertStringNotContainsString('AQ.SecretRawKeyDoNotExpose123', $review->error_message);
    }

    public function test_status_endpoint_returns_json_progress(): void
    {
        $user = User::factory()->create();

        $review = Review::create([
            'user_id' => $user->id,
            'language' => 'PHP',
            'source_code' => '<?php echo "Status test"; ?>',
            'status' => ReviewStatus::PROCESSING,
        ]);

        $response = $this->actingAs($user)->get(route('reviews.status', $review));
        $response->assertOk();
        $response->assertJson([
            'id' => $review->id,
            'status' => 'processing',
            'overall_score' => null,
        ]);
    }
}
