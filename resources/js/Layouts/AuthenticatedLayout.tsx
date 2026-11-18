import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import React, { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import {
    LayoutDashboard,
    PlusCircle,
    History,
    FolderKanban,
    Settings,
    AlertTriangle,
    Sun,
    Moon,
    Menu,
    X,
    LogOut,
    Key,
    Sparkles,
    ChevronRight,
} from 'lucide-react';

interface AuthUser {
    id: number;
    name: string;
    email: string;
}

interface PageProps {
    auth: {
        user: AuthUser;
        has_api_key: boolean;
        api_key_hint?: string | null;
        default_model?: string | null;
    };
    flash?: {
        success?: string;
        error?: string;
    };
    [key: string]: any;
}

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const page = usePage<PageProps>();
    const { user, has_api_key } = page.props.auth;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Dark mode state persisted in localStorage
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('codepulse_dark_mode');
            if (saved !== null) {
                return saved === 'true';
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('codepulse_dark_mode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('codepulse_dark_mode', 'false');
        }
    }, [darkMode]);

    const navItems = [
        {
            name: 'Dashboard',
            href: route('dashboard'),
            active: route().current('dashboard'),
            icon: LayoutDashboard,
        },
        {
            name: 'New Review',
            href: route('reviews.create'),
            active: route().current('reviews.create'),
            icon: PlusCircle,
            badge: 'AI',
        },
        {
            name: 'History',
            href: route('reviews.index'),
            active: route().current('reviews.index') || route().current('reviews.show'),
            icon: History,
        },
        {
            name: 'Projects',
            href: route('projects.index'),
            active: route().current('projects.*'),
            icon: FolderKanban,
        },
        {
            name: 'Settings',
            href: route('settings'),
            active: route().current('settings*'),
            icon: Settings,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Persistent Desktop Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Logo & Brand Header */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80">
                    <Link href={route('dashboard')} className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                                CodePulse <span className="text-indigo-600 dark:text-indigo-400">AI</span>
                            </span>
                            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                BYOK Code Reviewer
                            </span>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
                    <nav className="space-y-1.5">
                        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Workspace
                        </div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                                        item.active
                                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon
                                            className={`h-4 w-4 transition-colors ${
                                                item.active
                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                                            }`}
                                        />
                                        <span>{item.name}</span>
                                    </div>
                                    {item.badge && (
                                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom Utility (Theme Toggle & API status pill) */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {/* API Key Status Pill */}
                        <Link
                            href={route('settings')}
                            className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 text-xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                        >
                            <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium text-slate-600 dark:text-slate-400">
                                    Gemini BYOK
                                </span>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                                    has_api_key
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        has_api_key ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                />
                                {has_api_key ? 'Connected' : 'Missing'}
                            </span>
                        </Link>

                        {/* Dark / Light Mode Switch */}
                        <button
                            type="button"
                            onClick={() => setDarkMode(!darkMode)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                            <span className="flex items-center gap-2.5">
                                {darkMode ? (
                                    <Moon className="h-4 w-4 text-violet-400" />
                                ) : (
                                    <Sun className="h-4 w-4 text-amber-500" />
                                )}
                                <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                            </span>
                            <span className="text-[10px] uppercase font-mono text-slate-400">
                                {darkMode ? 'ON' : 'OFF'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* User Profile Footer */}
                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                                <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-200">
                                    {user.name}
                                </div>
                                <div className="truncate text-[11px] text-slate-400">
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            title="Log Out"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        >
                            <LogOut className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                {/* Top Nav on Mobile / Tablets */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <Link href={route('dashboard')} className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                            CodePulse AI
                        </span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setDarkMode(!darkMode)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {darkMode ? (
                            <Moon className="h-5 w-5 text-violet-400" />
                        ) : (
                            <Sun className="h-5 w-5 text-amber-500" />
                        )}
                    </button>
                </header>

                {/* API Key Missing Warning Banner (PRD §5.1 / user prompt) */}
                {!has_api_key && (
                    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <strong>No Gemini API Key connected.</strong> Connect your free Google Gemini API key in Settings to run AI code reviews.
                                </span>
                            </div>
                            <Link
                                href={route('settings')}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-500"
                            >
                                Setup Key
                                <ChevronRight className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Page Header (if provided) */}
                {header && (
                    <div className="border-b border-slate-200/80 bg-white px-4 py-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:px-8">
                        <div className="mx-auto max-w-7xl">{header}</div>
                    </div>
                )}

                {/* Main Page Content */}
                <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
                    <div className="mx-auto max-w-7xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
