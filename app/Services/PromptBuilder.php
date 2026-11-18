<?php

namespace App\Services;

class PromptBuilder
{
    /**
     * Build the structured JSON schema for Gemini responseSchema.
     */
    public function getResponseSchema(): array
    {
        return [
            'type' => 'OBJECT',
            'required' => ['scores', 'findings'],
            'properties' => [
                'scores' => [
                    'type' => 'OBJECT',
                    'required' => ['performance', 'security', 'maintainability'],
                    'properties' => [
                        'performance' => [
                            'type' => 'INTEGER',
                            'description' => 'Performance score between 0 and 100 based on algorithmic efficiency, Big-O complexity, and resource utilization.',
                        ],
                        'security' => [
                            'type' => 'INTEGER',
                            'description' => 'Security score between 0 and 100 based on absence of SQLi, XSS, CSRF, insecure deserialization, and authentication flaws.',
                        ],
                        'maintainability' => [
                            'type' => 'INTEGER',
                            'description' => 'Maintainability & code quality score between 0 and 100 based on clean code principles, readability, and adherence to language idioms.',
                        ],
                    ],
                ],
                'findings' => [
                    'type' => 'ARRAY',
                    'description' => 'List of specific code issues identified, line numbers, and actionable fixes.',
                    'items' => [
                        'type' => 'OBJECT',
                        'required' => ['category', 'severity', 'title', 'description', 'suggested_fix'],
                        'properties' => [
                            'category' => [
                                'type' => 'STRING',
                                'enum' => ['performance', 'security', 'bug', 'style'],
                                'description' => 'Category of the finding.',
                            ],
                            'severity' => [
                                'type' => 'STRING',
                                'enum' => ['critical', 'high', 'medium', 'low', 'info'],
                                'description' => 'Severity level of the issue.',
                            ],
                            'line_start' => [
                                'type' => 'INTEGER',
                                'description' => 'Starting line number of the problematic code (1-indexed).',
                            ],
                            'line_end' => [
                                'type' => 'INTEGER',
                                'description' => 'Ending line number of the problematic code (1-indexed).',
                            ],
                            'title' => [
                                'type' => 'STRING',
                                'description' => 'Short concise title describing the issue.',
                            ],
                            'description' => [
                                'type' => 'STRING',
                                'description' => 'Detailed technical explanation of the issue and why it matters.',
                            ],
                            'suggested_fix' => [
                                'type' => 'STRING',
                                'description' => 'Concrete fixed/optimized replacement code block.',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Build system instructions tailored to selected focus areas and language.
     */
    public function buildSystemInstruction(string $language, array $focusAreas): string
    {
        $focusList = implode(', ', $focusAreas);

        return <<<TEXT
You are a Principal Software Architect and Application Security Expert performing a rigorous code review for {$language} code.
Primary Focus Areas: {$focusList}.

Review Guidelines:
1. Identify Time/Space complexity (Big-O bottlenecks, nested loops, inefficient data structures).
2. Detect database & query bottlenecks (N+1 queries, unindexed lookups, memory bloat).
3. Thoroughly inspect for OWASP Top 10 vulnerabilities (SQL Injection, XSS, CSRF, insecure direct object references, sensitive data exposure).
4. Detect memory leaks, unclosed streams, unhandled exceptions, and concurrency hazards.
5. Provide accurate 1-indexed line numbers for all findings.
6. Provide fully functional, clean, drop-in replacement code in `suggested_fix`.
7. Output valid JSON adhering strictly to the provided responseSchema. Do not include markdown code fences (```json) outside the JSON.
TEXT;
    }

    /**
     * Build user content prompt containing the source code.
     */
    public function buildUserPrompt(string $sourceCode, string $language, array $focusAreas): string
    {
        $focusText = implode(', ', $focusAreas);

        return <<<TEXT
Please review the following {$language} source code.
Focus areas to prioritize: {$focusText}.

```{$language}
{$sourceCode}
```
TEXT;
    }
}
