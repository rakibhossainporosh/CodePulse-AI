<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiClient
{
    private const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
    public const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

    public function __construct(
        protected PromptBuilder $promptBuilder
    ) {}

    /**
     * Call Gemini generateContent API with structured schema and return parsed result.
     * Automatically falls back to gemini-3.5-flash-lite on 429 or 503 before failing.
     *
     * @return array{scores: array, findings: array, tokens_used: int, model_used: string}
     *
     * @throws RuntimeException
     */
    public function generateReview(
        string $rawApiKey,
        string $sourceCode,
        string $language,
        array $focusAreas,
        string $model = 'gemini-3.8-flash'
    ): array {
        try {
            $result = $this->executeGenerateContent($rawApiKey, $sourceCode, $language, $focusAreas, $model);
            $result['model_used'] = $model;

            return $result;
        } catch (RuntimeException $e) {
            $status = $e->getCode();

            // Automatic fallback to gemini-3.5-flash-lite on 429 or 503
            if ($model !== self::FALLBACK_MODEL && in_array($status, [429, 503])) {
                Log::warning("Gemini model [{$model}] returned HTTP {$status}. Falling back to [" . self::FALLBACK_MODEL . "].", [
                    'original_model' => $model,
                    'fallback_model' => self::FALLBACK_MODEL,
                    'error' => $e->getMessage(),
                ]);

                $fallbackResult = $this->executeGenerateContent(
                    $rawApiKey,
                    $sourceCode,
                    $language,
                    $focusAreas,
                    self::FALLBACK_MODEL
                );

                $fallbackResult['model_used'] = self::FALLBACK_MODEL;

                return $fallbackResult;
            }

            throw $e;
        }
    }

    /**
     * Execute HTTP POST to Gemini generateContent endpoint.
     *
     * @throws RuntimeException
     */
    protected function executeGenerateContent(
        string $rawApiKey,
        string $sourceCode,
        string $language,
        array $focusAreas,
        string $model
    ): array {
        $endpoint = self::BASE_URL . '/' . $model . ':generateContent';

        $systemInstruction = $this->promptBuilder->buildSystemInstruction($language, $focusAreas);
        $userPrompt = $this->promptBuilder->buildUserPrompt($sourceCode, $language, $focusAreas);
        $responseSchema = $this->promptBuilder->getResponseSchema();

        $payload = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $userPrompt],
                    ],
                ],
            ],
            'systemInstruction' => [
                'parts' => [
                    ['text' => $systemInstruction],
                ],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'responseSchema' => $responseSchema,
                'temperature' => 0.2,
            ],
        ];

        try {
            $response = Http::timeout(120)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'x-goog-api-key' => $rawApiKey,
                ])
                ->post($endpoint, $payload);
        } catch (Exception $e) {
            Log::error('Gemini API request failed due to connection/timeout error', [
                'model' => $model,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException("Connection to Google Gemini API timed out or failed ({$model}): " . $e->getMessage(), 0, $e);
        }

        if (! $response->successful()) {
            $status = $response->status();
            $errorMessage = $response->json('error.message')
                ?? $response->json('error')
                ?? ('HTTP ' . $status . ' ' . $response->body());

            Log::warning('Gemini API returned non-success response', [
                'status' => $status,
                'model' => $model,
                'error_message' => $errorMessage,
            ]);

            if (in_array($status, [429, 500, 502, 503, 504])) {
                throw new RuntimeException("Gemini API rate limited or unavailable (Status {$status}): {$errorMessage}", $status);
            }

            // Client errors like 400, 401, 403, 404
            throw new RuntimeException("Gemini API error ({$status}): {$errorMessage}", $status);
        }

        $responseData = $response->json();

        // Extract total tokens used safely (PRD requirement: default to 0 if absent)
        $tokensUsed = (int) ($responseData['usageMetadata']['totalTokenCount'] ?? 0);

        // Extract candidate text
        $rawContent = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (! $rawContent) {
            throw new RuntimeException('Empty or missing content in Gemini API response.');
        }

        // Clean any accidental markdown wrap
        $cleanJson = trim($rawContent);
        if (str_starts_with($cleanJson, '```json')) {
            $cleanJson = substr($cleanJson, 7);
        }
        if (str_starts_with($cleanJson, '```')) {
            $cleanJson = substr($cleanJson, 3);
        }
        if (str_ends_with($cleanJson, '```')) {
            $cleanJson = substr($cleanJson, 0, -3);
        }
        $cleanJson = trim($cleanJson);

        $parsed = json_decode($cleanJson, true);

        if (! is_array($parsed) || ! isset($parsed['scores'])) {
            Log::error('Failed to parse Gemini structured JSON', ['raw_output' => substr($rawContent, 0, 300)]);
            throw new RuntimeException('Gemini API did not return valid structured review JSON.');
        }

        $scores = $parsed['scores'];
        $findings = $parsed['findings'] ?? [];

        return [
            'scores' => [
                'performance' => (int) ($scores['performance'] ?? 0),
                'security' => (int) ($scores['security'] ?? 0),
                'maintainability' => (int) ($scores['maintainability'] ?? 0),
            ],
            'findings' => is_array($findings) ? $findings : [],
            'tokens_used' => $tokensUsed,
        ];
    }
}
