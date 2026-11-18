<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\ProfileController;
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

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // BYOK API Key & Settings
    Route::get('/settings', [ApiKeyController::class, 'index'])->name('settings');
    Route::post('/settings/api-key', [ApiKeyController::class, 'store'])->name('settings.api-key.store');
    Route::post('/settings/api-key/test', [ApiKeyController::class, 'test'])->name('settings.api-key.test');
    Route::patch('/settings/api-key/model', [ApiKeyController::class, 'updateModel'])->name('settings.api-key.model');
    Route::delete('/settings/api-key', [ApiKeyController::class, 'destroy'])->name('settings.api-key.destroy');
});

require __DIR__.'/auth.php';
