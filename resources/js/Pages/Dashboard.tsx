import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import React from 'react';
import {
    Activity,
    AlertOctagon,
    Award,
    Code2,
    FileText,
    Key,
    PlusCircle,
    ArrowRight,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    Shield,
} from 'lucide-react';

interface KPIProps {
    total_reviews: number;
    avg_score: number;
    critical_issues: number;
}

interface ReviewItem {
    id: number;
    language: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    overall_score: number | null;
    tokens_used: number;
    created_at: string;
    findings_count: number;
    project?: {
        id: number;
        name: string;
    } | null;
}

interface Props {
    kpis: KPIProps;
    recentReviews: ReviewItem[];
    apiKeyStatus: {
        has_key: boolean;
        key_hint?: string | null;
        default_model: string;
    };
}

export default function Dashboard({ kpis, recentReviews, apiKeyStatus }: Props) {
    const getScoreBadgeColor = (score: number | null) => {
        if (score === null) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        if (score >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    };

    const getStatusPill = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </span>
                );
            case 'processing':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing...
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        <Clock className="h-3 w-3" />
                        Queued
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        <XCircle className="h-3 w-3" />
                        Failed
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Code Review Dashboard
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Automated code quality, security analysis, and Big-O complexity metrics
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={route('reviews.create')}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                        >
                            <PlusCircle className="h-4 w-4" />
                            New Code Review
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* 3 Core KPI Cards (PRD §5.1) */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {/* KPI 1: Total Reviews */}
                    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Reviews
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
                                <FileText className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {kpis.total_reviews}
                            </span>
                            <span className="text-xs text-slate-400">sessions</span>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>Tracked across all repositories & snippets</span>
                        </div>
                    </div>

                    {/* KPI 2: Average Code Score */}
                    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Average Score
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
                                <Award className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {kpis.avg_score}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/ 100</span>
                            <span
                                className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getScoreBadgeColor(
                                    kpis.avg_score
                                )}`}
                            >
                                {kpis.avg_score >= 80 ? 'Good' : kpis.avg_score >= 60 ? 'Fair' : 'Needs Fix'}
                            </span>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                            Weighted: 35% Sec + 35% Perf + 30% Maint
                        </div>
                    </div>

                    {/* KPI 3: Critical Issues Detected */}
                    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Critical Issues
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
                                <AlertOctagon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {kpis.critical_issues}
                            </span>
                            <span className="text-xs text-slate-400">vulnerabilities</span>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                            SQLi, XSS, N+1 queries, or severity critical bugs
                        </div>
                    </div>
                </div>

                {/* API Key Status Info Banner */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    Google Gemini BYOK Engine
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {apiKeyStatus.has_key
                                        ? `Connected with key hint ${apiKeyStatus.key_hint} • Default Model: ${apiKeyStatus.default_model}`
                                        : 'No personal API key connected. Connect your key to run reviews using your own Google Gemini quota.'}
                                </p>
                            </div>
                        </div>

                        <div>
                            {apiKeyStatus.has_key ? (
                                <Link
                                    href={route('settings')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Manage Key & Models
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            ) : (
                                <Link
                                    href={route('settings')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                >
                                    Setup Gemini Key
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent 5 Reviews Table */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                                Recent Code Reviews
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Last 5 submitted code review sessions
                            </p>
                        </div>
                        <Link
                            href={route('reviews.index')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                            View all history
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5">Review</th>
                                    <th scope="col" className="px-6 py-3.5">Language</th>
                                    <th scope="col" className="px-6 py-3.5">Status</th>
                                    <th scope="col" className="px-6 py-3.5">Overall Score</th>
                                    <th scope="col" className="px-6 py-3.5">Findings</th>
                                    <th scope="col" className="px-6 py-3.5">Date</th>
                                    <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {recentReviews.length > 0 ? (
                                    recentReviews.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    Review #{item.id}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {item.project ? item.project.name : 'Standalone snippet'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {item.language}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{getStatusPill(item.status)}</td>
                                            <td className="px-6 py-4">
                                                {item.overall_score !== null ? (
                                                    <span
                                                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${getScoreBadgeColor(
                                                            item.overall_score
                                                        )}`}
                                                    >
                                                        {item.overall_score} / 100
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                {item.findings_count} issues
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={route('reviews.show', item.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    Inspect
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            <Code2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                                            <p className="text-sm font-medium">No code reviews submitted yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Paste code or drop a source file to start your first AI code review.
                                            </p>
                                            <div className="mt-4">
                                                <Link
                                                    href={route('reviews.create')}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                                >
                                                    <PlusCircle className="h-3.5 w-3.5" />
                                                    Submit First Review
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
