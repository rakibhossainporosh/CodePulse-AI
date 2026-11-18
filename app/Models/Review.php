<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'project_id',
        'language',
        'source_code',
        'focus_areas',
        'status',
        'overall_score',
        'performance_score',
        'security_score',
        'maintainability_score',
        'tokens_used',
        'model_used',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'status' => ReviewStatus::class,
            'focus_areas' => 'array',
            'overall_score' => 'integer',
            'performance_score' => 'integer',
            'security_score' => 'integer',
            'maintainability_score' => 'integer',
            'tokens_used' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(ReviewFinding::class);
    }
}
