<?php

namespace App\Jobs;

use App\Enums\FindingCategory;
use App\Enums\ReviewStatus;
use App\Enums\Severity;
use App\Models\Review;
use App\Services\GeminiClient;
use App\Services\KeyVaultService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessCodeReviewJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of attempts for queue worker (PRD §4: 3 retries).
     */
    public int $tries = 3;

    /**
     * Exponential backoff in seconds (PRD §4: 10s, 30s, 60s).
     */
    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function __construct(
        public Review $review
    ) {}

    /**
     * Execute the job.
     */
    public function handle(KeyVaultService $keyVaultService, GeminiClient $geminiClient): void
    {
        $this->review->refresh();

        // Update status to processing
        $this->review->update(['status' => ReviewStatus::PROCESSING]);

        $user = $this->review->user;
        $rawApiKey = $keyVaultService->decrypt($user);

        if (! $rawApiKey) {
            throw new \RuntimeException('No active Gemini API key found for this user. Please configure your key in Settings.');
        }

        $model = $this->review->model_used ?: ($user->apiKey?->default_model ?? 'gemini-3.8-flash');
        $focusAreas = $this->review->focus_areas ?: ['performance', 'security', 'bug', 'style'];

        // Request structured review from Gemini
        $result = $geminiClient->generateReview(
            $rawApiKey,
            $this->review->source_code,
            $this->review->language,
            $focusAreas,
            $model
        );

        $scores = $result['scores'];
        $findings = $result['findings'];
        $tokensUsed = $result['tokens_used'];
        $actualModel = $result['model_used'] ?? $model;

        // Weighted Overall Score Formula (PRD §7.3)
        // overall_score = round(($security_score * 0.35) + ($performance_score * 0.35) + ($maintainability_score * 0.30))
        $perfScore = $scores['performance'];
        $secScore = $scores['security'];
        $maintScore = $scores['maintainability'];

        $overallScore = (int) round(($secScore * 0.35) + ($perfScore * 0.35) + ($maintScore * 0.30));

        DB::transaction(function () use ($overallScore, $perfScore, $secScore, $maintScore, $tokensUsed, $findings, $actualModel) {
            // Delete any existing findings if re-processing
            $this->review->findings()->delete();

            // Insert findings
            foreach ($findings as $item) {
                $categoryValue = strtolower($item['category'] ?? 'bug');
                $severityValue = strtolower($item['severity'] ?? 'medium');

                // Map safely to enums
                $category = match ($categoryValue) {
                    'performance' => FindingCategory::PERFORMANCE,
                    'security' => FindingCategory::SECURITY,
                    'style', 'clean code' => FindingCategory::STYLE,
                    default => FindingCategory::BUG,
                };

                $severity = match ($severityValue) {
                    'critical' => Severity::CRITICAL,
                    'high' => Severity::HIGH,
                    'low' => Severity::LOW,
                    'info' => Severity::INFO,
                    default => Severity::MEDIUM,
                };

                $this->review->findings()->create([
                    'category' => $category,
                    'severity' => $severity,
                    'title' => substr($item['title'] ?? 'Issue detected', 0, 255),
                    'description' => $item['description'] ?? '',
                    'line_start' => isset($item['line_start']) ? (int) $item['line_start'] : null,
                    'line_end' => isset($item['line_end']) ? (int) $item['line_end'] : null,
                    'suggested_fix' => $item['suggested_fix'] ?? null,
                ]);
            }

            // Update review record
            $this->review->update([
                'status' => ReviewStatus::COMPLETED,
                'model_used' => $actualModel,
                'overall_score' => $overallScore,
                'performance_score' => $perfScore,
                'security_score' => $secScore,
                'maintainability_score' => $maintScore,
                'tokens_used' => $tokensUsed,
                'error_message' => null,
            ]);
        });
    }

    /**
     * Handle job failure (when all 3 retries fail).
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('ProcessCodeReviewJob permanently failed', [
            'review_id' => $this->review->id,
            'exception' => $exception?->getMessage(),
        ]);

        // Sanitize error message to ensure API key is never exposed
        $safeMessage = 'AI analysis could not be completed. The Gemini API service was temporarily unavailable or rate limited. Please try again.';

        if ($exception) {
            $rawMsg = $exception->getMessage();
            $lower = strtolower($rawMsg);
            if (! str_contains($lower, 'aiza') && ! str_contains($lower, 'aq.')) {
                // Filter out query strings or potential key leaks
                $cleanMsg = preg_replace('/key=[a-zA-Z0-9_\.\-]+/', 'key=***', $rawMsg);
                $safeMessage = substr($cleanMsg, 0, 250);
            }
        }

        $this->review->update([
            'status' => ReviewStatus::FAILED,
            'error_message' => $safeMessage,
        ]);
    }
}
