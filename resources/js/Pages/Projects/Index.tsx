import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Head, Link, useForm, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    FolderKanban,
    PlusCircle,
    FileText,
    Trash2,
    ArrowRight,
    FolderGit2,
} from 'lucide-react';

interface Project {
    id: number;
    name: string;
    description: string | null;
    reviews_count: number;
    created_at: string;
}

interface Props {
    projects: Project[];
}

export default function Index({ projects }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('projects.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                reset();
            },
        });
    };

    const handleDelete = () => {
        if (!deletingProject) return;

        router.delete(route('projects.destroy', deletingProject.id), {
            onSuccess: () => setDeletingProject(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <FolderKanban className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Projects & Repositories
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Organize code reviews by application, microservice, or repository
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500"
                    >
                        <PlusCircle className="h-4 w-4" />
                        New Project
                    </button>
                </div>
            }
        >
            <Head title="Projects" />

            <div className="space-y-6">
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                            <FolderGit2 className="h-5 w-5" />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setDeletingProject(project)}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                                            title="Delete Project"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {project.name}
                                    </h3>

                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {project.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
                                    <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                        <FileText className="h-3.5 w-3.5" />
                                        {project.reviews_count} reviews
                                    </span>

                                    <Link
                                        href={route('reviews.index', { project_id: project.id })}
                                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        View reviews
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
                        <FolderKanban className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            No projects created yet
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Group your code reviews by repository, module, or feature branch.
                        </p>
                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Create First Project
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)}>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Create New Project
                    </h3>

                    <div>
                        <InputLabel htmlFor="name" value="Project Name *" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="e.g. Core Billing Microservice"
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="description" value="Description (Optional)" />
                        <TextInput
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Primary repository for subscription processing"
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Project'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Project Confirmation Modal */}
            <Modal show={deletingProject !== null} onClose={() => setDeletingProject(null)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Delete Project '{deletingProject?.name}'?
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Are you sure you want to delete this project? Any reviews associated with this project will be updated or deleted accordingly.
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setDeletingProject(null)}>
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
