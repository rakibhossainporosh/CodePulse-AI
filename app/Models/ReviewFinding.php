<?php

namespace App\Models;

use App\Enums\FindingCategory;
use App\Enums\Severity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewFinding extends Model
{
    use HasFactory;

    protected $fillable = [
        'review_id',
        'category',
        'severity',
        'title',
        'description',
        'line_start',
        'line_end',
        'suggested_fix',
    ];

    protected function casts(): array
    {
        return [
            'category' => FindingCategory::class,
            'severity' => Severity::class,
            'line_start' => 'integer',
            'line_end' => 'integer',
        ];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }
}
