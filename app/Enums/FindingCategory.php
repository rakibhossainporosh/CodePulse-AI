<?php

namespace App\Enums;

enum FindingCategory: string
{
    case PERFORMANCE = 'performance';
    case SECURITY = 'security';
    case BUG = 'bug';
    case STYLE = 'style';

    public function label(): string
    {
        return match ($this) {
            self::PERFORMANCE => 'Performance',
            self::SECURITY => 'Security',
            self::BUG => 'Bug Detection',
            self::STYLE => 'Code Style',
        };
    }
}
