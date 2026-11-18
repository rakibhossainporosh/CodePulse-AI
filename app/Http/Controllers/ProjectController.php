<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of user projects.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $projects = $user->projects()
            ->withCount('reviews')
            ->latest()
            ->get();

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    /**
     * Store a new project.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $project = $request->user()->projects()->create($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'project' => $project,
            ], 201);
        }

        return back()->with('success', "Project '{$project->name}' created successfully!");
    }

    /**
     * Remove the specified project and its reviews.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        if ($project->user_id !== $request->user()->id) {
            abort(403);
        }

        $projectName = $project->name;
        $project->delete();

        return back()->with('success', "Project '{$projectName}' deleted successfully.");
    }
}
