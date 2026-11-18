import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    History,
    Search,
    Filter,
    PlusCircle,
    ArrowRight,
    Trash2,
    CheckCircle2,
    Clock,
    XCircle,
    Loader2,
    FolderKanban,
} from 'lucide-react';

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

interface PaginationProps {
    data: ReviewItem[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    reviews: PaginationProps;
    projects: Array<{ id: number; name: string }>;
    filters: {
        status?: string;
        language?: string;
        project_id?: string;
    };
}

export default function Index({ reviews, projects, filters }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [langFilter, setLangFilter] = useState(filters.language || '');
    const [projectFilter, setProjectFilter] = useState(filters.project_id || '');

    const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

    const applyFilters = (status = statusFilter, lang = langFilter, proj = projectFilter) => {
        router.get(
            route('reviews.index'),
            {
                status: status || undefined,
                language: lang || undefined,
                project_id: proj || undefined,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleDelete = () => {
        if (!deletingReviewId) return;

        router.delete(route('reviews.destroy', deletingReviewId), {
            onSuccess: () => setDeletingReviewId(null),
        });
    };

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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <History className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Review History
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Search, filter, and inspect past code reviews and architectural audits
                        </p>
                    </div>

                    <Link
                        href={route('reviews.create')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500"
                    >
                        <PlusCircle className="h-4 w-4" />
                        New Review
                    </Link>
                </div>
            }
        >
            <Head title="Review History" />

            <div className="space-y-6">
                {/* Filter Controls Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* Status Filter */}
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    applyFilters(e.target.value, langFilter, projectFilter);
                                }}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="">All Statuses</option>
                                <option value="completed">Completed</option>
                                <option value="processing">Processing</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        {/* Language Filter */}
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Language
                            </label>
                            <select
                                value={langFilter}
                                onChange={(e) => {
                                    setLangFilter(e.target.value);
                                    applyFilters(statusFilter, e.target.value, projectFilter);
                                }}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="">All Languages</option>
                                <option value="PHP">PHP</option>
                                <option value="JavaScript">JavaScript</option>
                                <option value="TypeScript">TypeScript</option>
                                <option value="Python">Python</option>
                                <option value="Go">Go</option>
                                <option value="SQL">SQL</option>
                            </select>
                        </div>

                        {/* Project Filter */}
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Project
                            </label>
                            <select
                                value={projectFilter}
                                onChange={(e) => {
                                    setProjectFilter(e.target.value);
                                    applyFilters(statusFilter, langFilter, e.target.value);
                                }}
                                className="mt-1 block w-full rounded-xl border-slate-200 bg-slate-50 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                                <option value="">All Projects</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Reviews Table */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5">Review</th>
                                    <th scope="col" className="px-6 py-3.5">Language</th>
                                    <th scope="col" className="px-6 py-3.5">Status</th>
                                    <th scope="col" className="px-6 py-3.5">Score</th>
                                    <th scope="col" className="px-6 py-3.5">Findings</th>
                                    <th scope="col" className="px-6 py-3.5">Date</th>
                                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {reviews.data.length > 0 ? (
                                    reviews.data.map((item) => (
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
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Link
                                                    href={route('reviews.show', item.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    Inspect
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() => setDeletingReviewId(item.id)}
                                                    className="inline-flex items-center rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                                                    title="Delete Review"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            No reviews matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {reviews.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                            <span className="text-xs text-slate-400">
                                Page {reviews.current_page} of {reviews.last_page} ({reviews.total} total reviews)
                            </span>

                            <div className="flex gap-1">
                                {reviews.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : link.url
                                                ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                                : 'text-slate-300 pointer-events-none dark:text-slate-600'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal show={deletingReviewId !== null} onClose={() => setDeletingReviewId(null)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Delete Review #{deletingReviewId}?
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        This action is irreversible. The review record and all associated findings will be permanently removed.
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setDeletingReviewId(null)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={handleDelete}>
                            Confirm Delete
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
