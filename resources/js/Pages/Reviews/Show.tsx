import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import React, { useEffect, useState, useMemo } from 'react';
import {
    Activity,
    Award,
    Shield,
    Zap,
    Paintbrush,
    Bug,
    AlertOctagon,
    Copy,
    Check,
    Download,
    Loader2,
    Clock,
    XCircle,
    CheckCircle2,
    Code2,
    FileText,
    ArrowLeft,
    Share2,
    Cpu,
    RefreshCw,
} from 'lucide-react';

interface Finding {
    id: number;
    category: 'performance' | 'security' | 'bug' | 'style';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    line_start: number | null;
    line_end: number | null;
    suggested_fix: string | null;
}

interface Review {
    id: number;
    language: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    overall_score: number | null;
    performance_score: number | null;
    security_score: number | null;
    maintainability_score: number | null;
    tokens_used: number;
    model_used: string;
    source_code: string;
    error_message: string | null;
    created_at: string;
    project?: {
        id: number;
        name: string;
    } | null;
    findings: Finding[];
}

interface Props {
    review: Review;
}

export default function Show({ review }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
    const [copiedFixId, setCopiedFixId] = useState<number | null>(null);
    const [copiedReport, setCopiedReport] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const handleRetry = () => {
        setRetrying(true);
        router.post(
            route('reviews.retry', review.id),
            {},
            {
                onFinish: () => setRetrying(false),
            }
        );
    };

    // Auto-polling for pending / processing status
    useEffect(() => {
        if (review.status === 'pending' || review.status === 'processing') {
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(route('reviews.status', review.id));
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'completed' || data.status === 'failed') {
                            clearInterval(interval);
                            router.reload({ only: ['review'] });
                        }
                    }
                } catch (e) {
                    // Ignore network polling glitches
                }
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [review.status, review.id]);

    // Split code into lines for syntax line viewer
    const codeLines = useMemo(() => {
        return review.source_code ? review.source_code.split('\n') : [];
    }, [review.source_code]);

    // Filter findings by selected tab
    const filteredFindings = useMemo(() => {
        if (selectedCategory === 'all') return review.findings;
        return review.findings.filter((f) => f.category === selectedCategory);
    }, [review.findings, selectedCategory]);

    const categoryCounts = useMemo(() => {
        return {
            all: review.findings.length,
            performance: review.findings.filter((f) => f.category === 'performance').length,
            security: review.findings.filter((f) => f.category === 'security').length,
            bug: review.findings.filter((f) => f.category === 'bug').length,
            style: review.findings.filter((f) => f.category === 'style').length,
        };
    }, [review.findings]);

    const handleCopyFix = (finding: Finding) => {
        if (finding.suggested_fix) {
            navigator.clipboard.writeText(finding.suggested_fix);
            setCopiedFixId(finding.id);
            setTimeout(() => setCopiedFixId(null), 2000);
        }
    };

    // Generate Markdown report string (PRD FR-08)
    const generateMarkdownReport = (): string => {
        let md = `# CodePulse AI — Code Review Report #${review.id}\n\n`;
        md += `- **Date**: ${new Date(review.created_at).toLocaleString()}\n`;
        md += `- **Language**: ${review.language}\n`;
        md += `- **Model**: ${review.model_used}\n`;
        md += `- **Project**: ${review.project ? review.project.name : 'Standalone'}\n`;
        md += `- **Overall Score**: ${review.overall_score ?? 'N/A'}/100\n`;
        md += `  - Security: ${review.security_score ?? 'N/A'}/100\n`;
        md += `  - Performance: ${review.performance_score ?? 'N/A'}/100\n`;
        md += `  - Maintainability: ${review.maintainability_score ?? 'N/A'}/100\n\n`;

        md += `## Findings & Issues (${review.findings.length})\n\n`;
        review.findings.forEach((f, idx) => {
            md += `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n`;
            md += `- **Category**: ${f.category}\n`;
            if (f.line_start) {
                md += `- **Line**: L${f.line_start}${f.line_end && f.line_end !== f.line_start ? `-L${f.line_end}` : ''}\n`;
            }
            md += `- **Description**: ${f.description}\n\n`;
            if (f.suggested_fix) {
                md += `**Suggested Fix:**\n\`\`\`${review.language.toLowerCase()}\n${f.suggested_fix}\n\`\`\`\n\n`;
            }
        });

        return md;
    };

    const handleCopyReport = () => {
        navigator.clipboard.writeText(generateMarkdownReport());
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 2000);
    };

    const handleDownloadReport = () => {
        const md = generateMarkdownReport();
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `codepulse-review-${review.id}.md`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 ring-1 ring-rose-500/20';
            case 'high':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 ring-1 ring-orange-500/20';
            case 'medium':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 ring-1 ring-amber-500/20';
            case 'low':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 ring-1 ring-blue-500/20';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-500/20';
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-slate-400';
        if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (score >= 60) return 'text-amber-600 dark:text-amber-400';
        return 'text-rose-600 dark:text-rose-400';
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('reviews.index')}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Review #{review.id}
                                </h1>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {review.language}
                                </span>
                                {review.project && (
                                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        {review.project.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Analyzed with {review.model_used} • {new Date(review.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Export Actions (PRD FR-08) */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyReport}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            {copiedReport ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                                <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedReport ? 'Copied MD' : 'Copy MD'}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadReport}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Download .md Report
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Review #${review.id} — CodePulse AI`} />

            <div className="space-y-6">
                {/* Status Alert if Pending or Processing */}
                {(review.status === 'pending' || review.status === 'processing') && (
                    <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-xs">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <h4 className="text-sm font-semibold">
                                    AI Code Review is in Progress...
                                </h4>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                    Analyzing AST, Big-O complexity, and checking security vectors. This page auto-refreshes every 3 seconds.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Alert if Failed */}
                {review.status === 'failed' && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 shadow-xs">
                        <div className="flex items-start gap-3">
                            <XCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold">Analysis Failed</h4>
                                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                                    {review.error_message || 'The review could not be completed.'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleRetry}
                            disabled={retrying}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 disabled:opacity-50 transition-colors shrink-0"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                            {retrying ? 'Re-queueing...' : 'Retry Review'}
                        </button>
                    </div>
                )}

                {/* 4 Score Cards (PRD §5.3) */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {/* Overall Score */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>Overall Quality</span>
                            <Award className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${getScoreColor(review.overall_score)}`}>
                                {review.overall_score ?? '—'}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            Weighted 35% Sec + 35% Perf + 30% Maint
                        </div>
                    </div>

                    {/* Security Score */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>Security</span>
                            <Shield className="h-4 w-4 text-rose-500" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${getScoreColor(review.security_score)}`}>
                                {review.security_score ?? '—'}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            SQLi, XSS, and authorization
                        </div>
                    </div>

                    {/* Performance Score */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>Performance</span>
                            <Zap className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${getScoreColor(review.performance_score)}`}>
                                {review.performance_score ?? '—'}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            Big-O complexity & N+1 queries
                        </div>
                    </div>

                    {/* Maintainability Score */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <span>Maintainability</span>
                            <Paintbrush className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${getScoreColor(review.maintainability_score)}`}>
                                {review.maintainability_score ?? '—'}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                            Clean idioms & code readability
                        </div>
                    </div>
                </div>

                {/* Main Split: Code Viewer (Left 6 cols) & Findings List (Right 6 cols) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* LEFT: Line-Highlighted Code Viewer (6 cols) */}
                    <div className="lg:col-span-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Code2 className="h-4 w-4 text-indigo-600" />
                                Submitted Source Code
                            </h3>
                            <span className="text-xs text-slate-400">
                                {codeLines.length} lines • {review.tokens_used} tokens
                            </span>
                        </div>

                        <div className="relative max-h-[700px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-200 shadow-md">
                            <table className="w-full border-collapse">
                                <tbody>
                                    {codeLines.map((line, index) => {
                                        const lineNum = index + 1;
                                        const isHighlighted = highlightedLine === lineNum;

                                        // Check if line has any findings
                                        const lineFindings = review.findings.filter(
                                            (f) =>
                                                f.line_start !== null &&
                                                lineNum >= f.line_start &&
                                                (f.line_end === null || lineNum <= f.line_end)
                                        );

                                        const hasError = lineFindings.length > 0;

                                        return (
                                            <tr
                                                key={lineNum}
                                                id={`code-line-${lineNum}`}
                                                className={`transition-colors ${
                                                    isHighlighted
                                                        ? 'bg-indigo-900/50'
                                                        : hasError
                                                        ? 'bg-rose-950/30'
                                                        : 'hover:bg-slate-900/60'
                                                }`}
                                            >
                                                <td className="w-12 select-none border-r border-slate-800 px-3 py-1 text-right text-slate-600">
                                                    {lineNum}
                                                </td>
                                                <td className="px-4 py-1 whitespace-pre leading-5">
                                                    {line || ' '}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT: Category Filter Tabs & Findings Cards (6 cols) */}
                    <div className="lg:col-span-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-600" />
                                Review Findings & Recommendations
                            </h3>
                        </div>

                        {/* Category Filter Tabs */}
                        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
                            {[
                                { id: 'all', label: 'All', count: categoryCounts.all },
                                { id: 'performance', label: 'Performance', count: categoryCounts.performance },
                                { id: 'security', label: 'Security', count: categoryCounts.security },
                                { id: 'bug', label: 'Bugs', count: categoryCounts.bug },
                                { id: 'style', label: 'Style', count: categoryCounts.style },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(tab.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                        selectedCategory === tab.id
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                            selectedCategory === tab.id
                                                ? 'bg-indigo-700 text-white'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Findings List */}
                        <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                            {filteredFindings.length > 0 ? (
                                filteredFindings.map((finding) => (
                                    <div
                                        key={finding.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                                    >
                                        {/* Finding Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${getSeverityBadge(
                                                            finding.severity
                                                        )}`}
                                                    >
                                                        {finding.severity}
                                                    </span>

                                                    {finding.line_start && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setHighlightedLine(finding.line_start);
                                                                const el = document.getElementById(
                                                                    `code-line-${finding.line_start}`
                                                                );
                                                                el?.scrollIntoView({
                                                                    behavior: 'smooth',
                                                                    block: 'center',
                                                                });
                                                            }}
                                                            className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                                        >
                                                            Line {finding.line_start}
                                                            {finding.line_end && finding.line_end !== finding.line_start
                                                                ? ` - ${finding.line_end}`
                                                                : ''}
                                                        </button>
                                                    )}
                                                </div>

                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {finding.title}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {finding.description}
                                        </p>

                                        {/* Suggested Fix Block */}
                                        {finding.suggested_fix && (
                                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs">
                                                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400">
                                                    <span>Suggested Fix:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyFix(finding)}
                                                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
                                                    >
                                                        {copiedFixId === finding.id ? (
                                                            <>
                                                                <Check className="h-3 w-3 text-emerald-400" />
                                                                <span className="text-emerald-400">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-3 w-3" />
                                                                <span>Copy Fix</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="p-3 text-emerald-300 overflow-x-auto whitespace-pre">
                                                    {finding.suggested_fix}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        No findings in this category
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        The AI model did not identify any issues in the selected focus area.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
