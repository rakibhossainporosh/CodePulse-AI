<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'encrypted_key',
        'key_hint',
        'is_active',
        'last_verified_at',
    ];

    /**
     * Mandatory BYOK Zero-Exposure Policy (PRD §4/§5):
     * Never expose raw or encrypted_key in JSON responses or Inertia props.
     */
    protected $hidden = [
        'encrypted_key',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_verified_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
