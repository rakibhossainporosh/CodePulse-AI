<?php

namespace App\Enums;

enum Severity: string
{
    case CRITICAL = 'critical';
    case HIGH = 'high';
    case MEDIUM = 'medium';
    case LOW = 'low';
    case INFO = 'info';

    public function color(): string
    {
        return match ($this) {
            self::CRITICAL => 'rose',
            self::HIGH => 'orange',
            self::MEDIUM => 'amber',
            self::LOW => 'blue',
            self::INFO => 'slate',
        };
    }
}
