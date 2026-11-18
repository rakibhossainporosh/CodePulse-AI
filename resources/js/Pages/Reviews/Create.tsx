import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Head, useForm, Link } from '@inertiajs/react';
import React, { useState, useRef, useMemo } from 'react';
import {
    Code2,
    UploadCloud,
    FolderPlus,
    Sparkles,
    Shield,
    Zap,
    Bug,
    Paintbrush,
    CheckSquare,
    Square,
    AlertTriangle,
    FileCode2,
    Trash2,
    Copy,
    Check,
} from 'lucide-react';

interface Project {
    id: number;
    name: string;
}

interface Props {
    projects: Project[];
    defaultModel: string;
    hasApiKey: boolean;
}

const LANGUAGES = [
    { label: 'PHP', value: 'PHP', ext: '.php' },
    { label: 'JavaScript / Node', value: 'JavaScript', ext: '.js' },
    { label: 'TypeScript', value: 'TypeScript', ext: '.ts' },
    { label: 'Python', value: 'Python', ext: '.py' },
    { label: 'Go', value: 'Go', ext: '.go' },
    { label: 'Java', value: 'Java', ext: '.java' },
    { label: 'C#', value: 'C#', ext: '.cs' },
    { label: 'SQL', value: 'SQL', ext: '.sql' },
    { label: 'Rust', value: 'Rust', ext: '.rs' },
];

const SAMPLE_CODES: Record<string, string> = {
    PHP: `<?php
namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;

class UserController extends Controller
{
    public function search(Request $request)
    {
        // Issue: Direct SQL Injection vulnerability
        $query = $request->input('q');
        $users = DB::select("SELECT * FROM users WHERE name LIKE '%" . $query . "%'");

        // Issue: N+1 query problem inside loop
        $results = [];
        foreach ($users as $user) {
            $orders = DB::select("SELECT * FROM orders WHERE user_id = " . $user->id);
            $results[] = [
                'user' => $user,
                'orders' => $orders
            ];
        }

        return response()->json($results);
    }
}`,
    JavaScript: `// Sample Node.js Express Route
const express = require('express');
const router = express.Router();

router.get('/products', async (req, res) => {
    const { category, limit } = req.query;

    // Issue: ReDoS vulnerability in unescaped regex
    const filterRegex = new RegExp(category);

    // Issue: Unbounded memory accumulation
    const items = [];
    for (let i = 0; i < 100000; i++) {
        items.push({ id: i, data: Buffer.alloc(1024) });
    }

    res.json({ success: true, count: items.length });
});

module.exports = router;`,
    Python: `import sqlite3

def find_user(username):
    # Security Issue: SQL injection risk
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")
    rows = cursor.fetchall()

    # Performance Issue: Quadratic time search
    duplicates = []
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            if rows[i] == rows[j]:
                duplicates.append(rows[i])

    return rows`,
};

export default function Create({ projects: initialProjects, defaultModel, hasApiKey }: Props) {
    const [projectList, setProjectList] = useState<Project[]>(initialProjects);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [creatingProject, setCreatingProject] = useState(false);
    const [projectError, setProjectError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        source_code: '',
        language: 'PHP',
        project_id: '',
        model_used: defaultModel || 'gemini-3.8-flash',
        focus_areas: ['performance', 'security', 'bug', 'style'],
    });

    // Line numbers calculation
    const lineNumbers = useMemo(() => {
        const count = data.source_code ? data.source_code.split('\n').length : 1;
        return Array.from({ length: Math.max(count, 15) }, (_, i) => i + 1);
    }, [data.source_code]);

    const charCount = data.source_code.length;
    const MAX_CHARS = 50000;

    const toggleFocusArea = (area: string) => {
        if (data.focus_areas.includes(area)) {
            setData(
                'focus_areas',
                data.focus_areas.filter((a) => a !== area)
            );
        } else {
            setData('focus_areas', [...data.focus_areas, area]);
        }
    };

    // File Drop handling
    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                setData((prev) => ({
                    ...prev,
                    source_code: content,
                    language: detectLanguage(file.name) || prev.language,
                }));
            }
        };
        reader.readAsText(file);
    };

    const detectLanguage = (fileName: string): string => {
        const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
        if (['.php'].includes(ext)) return 'PHP';
        if (['.js', '.mjs', '.cjs'].includes(ext)) return 'JavaScript';
        if (['.ts', '.tsx'].includes(ext)) return 'TypeScript';
        if (['.py'].includes(ext)) return 'Python';
        if (['.go'].includes(ext)) return 'Go';
        if (['.java'].includes(ext)) return 'Java';
        if (['.cs'].includes(ext)) return 'C#';
        if (['.sql'].includes(ext)) return 'SQL';
        if (['.rs'].includes(ext)) return 'Rust';
        return '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // Inline Project Creation
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) {
            setProjectError('Project name is required.');
            return;
        }

        setCreatingProject(true);
        setProjectError('');

        try {
            const res = await fetch(route('projects.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    name: newProjectName,
                    description: newProjectDesc,
                }),
            });

            const json = await res.json();
            if (res.ok && json.project) {
                setProjectList((prev) => [json.project, ...prev]);
                setData('project_id', String(json.project.id));
                setShowNewProjectModal(false);
                setNewProjectName('');
                setNewProjectDesc('');
            } else {
                setProjectError(json.message || 'Failed to create project');
            }
        } catch (err: any) {
            setProjectError(err.message || 'Network error');
        } finally {
            setCreatingProject(false);
        }
    };

    const handleLoadSample = (lang: string) => {
        const sample = SAMPLE_CODES[lang] || SAMPLE_CODES['PHP'];
        setData((prev) => ({
            ...prev,
            language: lang,
            source_code: sample,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('reviews.store'));
    };

    const isSubmitDisabled =
        processing ||
        charCount === 0 ||
        charCount > MAX_CHARS ||
        data.focus_areas.length === 0;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <Code2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            New Code Review Workspace
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Paste code or drag and drop source files for instantaneous AI security and performance inspection
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Try sample:</span>
                        {['PHP', 'JavaScript', 'Python'].map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => handleLoadSample(lang)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            }
        >
            <Head title="New Code Review Workspace" />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Split-Pane Layout (PRD §5.2) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* LEFT PANE (Code Editor & File Dropzone, 8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        <div
                            onDragEnter={() => setDragActive(true)}
                            onDragLeave={() => setDragActive(false)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            className={`relative overflow-hidden rounded-2xl border transition-all ${
                                dragActive
                                    ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30'
                                    : 'border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900'
                            }`}
                        >
                            {/* Editor Top Bar */}
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-2.5 w-2.5 gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    </span>
                                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                                        workspace_editor.{data.language.toLowerCase()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Upload file trigger */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".php,.js,.ts,.py,.go,.java,.cs,.sql,.rs,.jsx,.tsx"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                        <UploadCloud className="h-3.5 w-3.5" />
                                        Drop or Upload File
                                    </button>

                                    {data.source_code && (
                                        <button
                                            type="button"
                                            onClick={() => setData('source_code', '')}
                                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Code Area with Line Numbers */}
                            <div className="relative flex min-h-[460px] bg-slate-900 font-mono text-sm text-slate-100">
                                {/* Line Numbers Column */}
                                <div className="select-none border-r border-slate-800 bg-slate-950/80 px-3 py-4 text-right text-xs text-slate-600 dark:text-slate-500">
                                    {lineNumbers.map((num) => (
                                        <div key={num} className="leading-6">
                                            {num}
                                        </div>
                                    ))}
                                </div>

                                {/* Text Area */}
                                <textarea
                                    value={data.source_code}
                                    onChange={(e) => setData('source_code', e.target.value)}
                                    placeholder={`// Paste your ${data.language} source code here, or drop a file...\n// CodePulse AI will analyze Time/Space complexity, memory leaks, and OWASP security issues.`}
                                    rows={20}
                                    spellCheck={false}
                                    className="w-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-6 text-slate-200 placeholder-slate-600 focus:ring-0 focus:outline-none"
                                />
                            </div>

                            {/* Editor Bottom Bar: Live Char Counter (PRD FR-04) */}
                            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                <div>
                                    Supports <code>.php</code>, <code>.js</code>, <code>.ts</code>, <code>.py</code>, <code>.go</code>, <code>.sql</code>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span
                                        className={`font-mono font-medium ${
                                            charCount > MAX_CHARS
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : charCount > 40000
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                                    </span>
                                </div>
                            </div>
                        </div>

                        {errors.source_code && (
                            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.source_code}</p>
                        )}
                    </div>

                    {/* RIGHT PANE (Options, Focus Areas & Submit, 4 cols) */}
                    <div className="lg:col-span-4 space-y-5">
                        {/* Configuration Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                Review Configuration
                            </h3>

                            {/* Language Selector */}
                            <div>
                                <InputLabel htmlFor="language" value="Programming Language" />
                                <select
                                    id="language"
                                    value={data.language}
                                    onChange={(e) => setData('language', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-slate-200 bg-white py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l.value} value={l.value}>
                                            {l.label} ({l.ext})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Project Dropdown + Quick Add */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <InputLabel htmlFor="project_id" value="Project / Module" />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewProjectModal(true)}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 flex items-center gap-1"
                                    >
                                        <FolderPlus className="h-3 w-3" />
                                        + New Project
                                    </button>
                                </div>
                                <select
                                    id="project_id"
                                    value={data.project_id}
                                    onChange={(e) => setData('project_id', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-slate-200 bg-white py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                >
                                    <option value="">(Standalone Snippet — No Project)</option>
                                    {projectList.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Gemini Model Selector */}
                            <div>
                                <InputLabel htmlFor="model_used" value="AI Review Model" />
                                <select
                                    id="model_used"
                                    value={data.model_used}
                                    onChange={(e) => setData('model_used', e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-slate-200 bg-white py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                >
                                    <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended for Code & Performance)</option>
                                    <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast & Lightweight)</option>
                                    <option value="gemini-4-carbon">gemini-4-carbon (Deep Reasoning & Security)</option>
                                </select>
                            </div>
                        </div>

                        {/* Focus Areas Card (PRD FR-05) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Review Focus Areas
                                </h3>
                                <span className="text-[11px] font-medium text-slate-400">
                                    Min 1 required
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Select which inspection categories the AI model should focus on:
                            </p>

                            <div className="space-y-2 pt-1">
                                {[
                                    {
                                        id: 'performance',
                                        label: 'Performance & Big-O',
                                        desc: 'Bottlenecks, memory leaks, N+1 queries',
                                        icon: Zap,
                                        color: 'text-amber-500',
                                    },
                                    {
                                        id: 'security',
                                        label: 'Security & OWASP',
                                        desc: 'SQL injection, XSS, insecure input',
                                        icon: Shield,
                                        color: 'text-rose-500',
                                    },
                                    {
                                        id: 'bug',
                                        label: 'Bug Detection',
                                        desc: 'Logic errors, null pointer safety, edge cases',
                                        icon: Bug,
                                        color: 'text-indigo-500',
                                    },
                                    {
                                        id: 'style',
                                        label: 'Clean Code & Idioms',
                                        desc: 'Modern best practices and readability',
                                        icon: Paintbrush,
                                        color: 'text-emerald-500',
                                    },
                                ].map((item) => {
                                    const selected = data.focus_areas.includes(item.id);
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => toggleFocusArea(item.id)}
                                            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                                                selected
                                                    ? 'border-indigo-500/80 bg-indigo-50/50 dark:border-indigo-500/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500/20'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="mt-0.5">
                                                {selected ? (
                                                    <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                ) : (
                                                    <Square className="h-4 w-4 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                                                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                                                    <span>{item.label}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {item.desc}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {errors.focus_areas && (
                                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.focus_areas}</p>
                            )}
                        </div>

                        {/* Submit Button & Warnings */}
                        <div className="space-y-3">
                            {!hasApiKey && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <span>
                                        You need a configured Gemini API key to run reviews.{' '}
                                        <Link href={route('settings')} className="underline font-semibold">
                                            Setup Key
                                        </Link>
                                    </span>
                                </div>
                            )}

                            <PrimaryButton
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="w-full !py-3 flex justify-center items-center gap-2 text-sm shadow-md shadow-indigo-500/20"
                            >
                                <Sparkles className="h-4 w-4" />
                                {processing ? 'Submitting & Queueing...' : 'Launch Code Review'}
                            </PrimaryButton>

                            <p className="text-center text-[11px] text-slate-400">
                                Review is dispatched to background queue with 3 retries and live status polling.
                            </p>
                        </div>
                    </div>
                </div>
            </form>

            {/* Quick Add Project Modal */}
            <Modal show={showNewProjectModal} onClose={() => setShowNewProjectModal(false)}>
                <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Create New Project
                    </h3>

                    {projectError && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">{projectError}</p>
                    )}

                    <div>
                        <InputLabel htmlFor="modal_name" value="Project Name *" />
                        <TextInput
                            id="modal_name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="e.g. Payment Gateway Service"
                            className="mt-1 block w-full"
                            required
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="modal_desc" value="Description (Optional)" />
                        <TextInput
                            id="modal_desc"
                            value={newProjectDesc}
                            onChange={(e) => setNewProjectDesc(e.target.value)}
                            placeholder="Short description of the module or repository"
                            className="mt-1 block w-full"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton onClick={() => setShowNewProjectModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={creatingProject}>
                            {creatingProject ? 'Creating...' : 'Create & Select'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
