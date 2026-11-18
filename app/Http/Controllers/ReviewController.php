<?php

namespace App\Http\Controllers;

use App\Enums\ReviewStatus;
use App\Jobs\ProcessCodeReviewJob;
use App\Models\Project;
use App\Models\Review;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the user's reviews.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = $user->reviews()
            ->with(['project'])
            ->withCount('findings')
            ->latest('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('language')) {
            $query->where('language', $request->input('language'));
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        $reviews = $query->paginate(10)->withQueryString();

        $projects = $user->projects()->get(['id', 'name']);

        return Inertia::render('Reviews/Index', [
            'reviews' => $reviews,
            'projects' => $projects,
            'filters' => $request->only(['status', 'language', 'project_id']),
        ]);
    }

    /**
     * Show the create review workspace.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Reviews/Create', [
            'projects' => $user->projects()->get(['id', 'name']),
            'defaultModel' => $user->apiKey?->default_model ?? 'gemini-3.8-flash',
            'hasApiKey' => (bool) $user->apiKey?->is_active,
        ]);
    }

    /**
     * Submit code for asynchronous review.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Ensure user has an active Gemini API key (PRD FR-02)
        if (! $user->apiKey || ! $user->apiKey->is_active) {
            return redirect()->route('settings')->with('error', 'Please configure and verify your Google Gemini API Key before running code reviews.');
        }

        $validated = $request->validate([
            'source_code' => ['required', 'string', 'max:50000'],
            'language' => ['required', 'string', 'max:50'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'focus_areas' => ['required', 'array', 'min:1'],
            'focus_areas.*' => ['string', 'in:performance,security,bug,style'],
            'model_used' => ['nullable', 'string', 'in:gemini-3.8-flash,gemini-3.5-flash-lite,gemini-4-carbon'],
        ]);

        // If project_id provided, verify ownership
        if (! empty($validated['project_id'])) {
            $projectBelongsToUser = Project::where('id', $validated['project_id'])
                ->where('user_id', $user->id)
                ->exists();

            if (! $projectBelongsToUser) {
                return back()->withErrors(['project_id' => 'Invalid project selected.']);
            }
        }

        $model = $validated['model_used'] ?? ($user->apiKey->default_model ?? 'gemini-3.8-flash');

        $review = $user->reviews()->create([
            'project_id' => $validated['project_id'] ?? null,
            'language' => $validated['language'],
            'source_code' => $validated['source_code'],
            'focus_areas' => $validated['focus_areas'],
            'model_used' => $model,
            'status' => ReviewStatus::PENDING,
        ]);

        // Dispatch async review worker
        ProcessCodeReviewJob::dispatch($review);

        return redirect()->route('reviews.show', $review)->with('success', 'Code review submitted! Analysis is in progress.');
    }

    /**
     * Display review detail and findings.
     */
    public function show(Review $review): Response
    {
        $this->authorize('view', $review);

        $review->load(['project', 'findings']);

        return Inertia::render('Reviews/Show', [
            'review' => $review,
        ]);
    }

    /**
     * Poll review status for real-time progress update.
     */
    public function status(Review $review): JsonResponse
    {
        $this->authorize('view', $review);

        return response()->json([
            'id' => $review->id,
            'status' => $review->status->value,
            'overall_score' => $review->overall_score,
            'error_message' => $review->error_message,
        ]);
    }

    /**
     * Delete a review.
     */
    public function destroy(Review $review): RedirectResponse
    {
        $this->authorize('delete', $review);

        $review->delete();

        return redirect()->route('reviews.index')->with('success', 'Review deleted successfully.');
    }
}
