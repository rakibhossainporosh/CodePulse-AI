<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiClient
{
    private const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    public function __construct(
        protected PromptBuilder $promptBuilder
    ) {}

    /**
     * Call Gemini generateContent API with structured schema and return parsed result.
     *
     * @return array{scores: array, findings: array, tokens_used: int}
     *
     * @throws RuntimeException
     */
    public function generateReview(
        string $rawApiKey,
        string $sourceCode,
        string $language,
        array $focusAreas,
        string $model = 'gemini-2.5-flash'
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
            // Never log the raw key or the query string with key
            Log::error('Gemini API request failed due to connection/timeout error', [
                'model' => $model,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('Connection to Google Gemini API timed out or failed. Retrying...', 0, $e);
        }

        if (! $response->successful()) {
            $status = $response->status();
            $errorJson = $response->json();
            $errorMessage = $errorJson['error']['message'] ?? 'Unknown Gemini API error';

            Log::warning('Gemini API returned non-success response', [
                'status' => $status,
                'model' => $model,
                'error_message' => $errorMessage,
            ]);

            if (in_array($status, [429, 500, 502, 503, 504])) {
                throw new RuntimeException("Gemini API rate limited or unavailable (Status {$status}). Retrying...", $status);
            }

            // Client errors like 400, 401, 403
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
