<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ReviewController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Projects Management
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    // BYOK API Key & Settings
    Route::get('/settings', [ApiKeyController::class, 'index'])->name('settings');
    Route::post('/settings/api-key', [ApiKeyController::class, 'store'])->name('settings.api-key.store');
    Route::post('/settings/api-key/test', [ApiKeyController::class, 'test'])->name('settings.api-key.test');
    Route::patch('/settings/api-key/model', [ApiKeyController::class, 'updateModel'])->name('settings.api-key.model');
    Route::delete('/settings/api-key', [ApiKeyController::class, 'destroy'])->name('settings.api-key.destroy');

    // Code Reviews (Rate limited to 10/min/user per PRD §7.3)
    Route::get('/reviews', [ReviewController::class, 'index'])->name('reviews.index');
    Route::get('/reviews/create', [ReviewController::class, 'create'])->name('reviews.create');
    Route::post('/reviews', [ReviewController::class, 'store'])
        ->middleware('throttle:code-review')
        ->name('reviews.store');
    Route::get('/reviews/{review}', [ReviewController::class, 'show'])->name('reviews.show');
    Route::post('/reviews/{review}/retry', [ReviewController::class, 'retry'])->name('reviews.retry');
    Route::get('/reviews/{review}/status', [ReviewController::class, 'status'])->name('reviews.status');
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');
});

require __DIR__.'/auth.php';
