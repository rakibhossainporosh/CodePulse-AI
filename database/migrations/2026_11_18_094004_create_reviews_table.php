<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('language', 50);
            $table->longText('source_code');
            $table->json('focus_areas')->nullable();
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending')->index();
            $table->unsignedTinyInteger('overall_score')->nullable();
            $table->unsignedTinyInteger('performance_score')->nullable();
            $table->unsignedTinyInteger('security_score')->nullable();
            $table->unsignedTinyInteger('maintainability_score')->nullable();
            $table->unsignedInteger('tokens_used')->default(0);
            $table->string('model_used', 50)->default('gemini-3.8-flash');
            $table->text('error_message')->nullable();
            $table->timestamps();

            // Composite index for fast dashboard / history queries (PRD §4)
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
