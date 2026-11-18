<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the analytics dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $totalReviews = $user->reviews()->count();

        $avgScore = (int) round(
            $user->reviews()->whereNotNull('overall_score')->avg('overall_score') ?? 0
        );

        $criticalIssues = $user->reviews()
            ->join('review_findings', 'reviews.id', '=', 'review_findings.review_id')
            ->where('review_findings.severity', 'critical')
            ->count();

        $recentReviews = $user->reviews()
            ->with(['project'])
            ->withCount('findings')
            ->latest('created_at')
            ->take(5)
            ->get();

        return Inertia::render('Dashboard', [
            'kpis' => [
                'total_reviews' => $totalReviews,
                'avg_score' => $avgScore,
                'critical_issues' => $criticalIssues,
            ],
            'recentReviews' => $recentReviews,
            'apiKeyStatus' => [
                'has_key' => (bool) $user->apiKey?->is_active,
                'key_hint' => $user->apiKey?->key_hint,
                'default_model' => $user->apiKey?->default_model ?? 'gemini-2.5-flash',
            ],
        ]);
    }
}
