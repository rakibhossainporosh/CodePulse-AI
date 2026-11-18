import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React from 'react';

interface Props {
    projects: Array<{ id: number; name: string }>;
    defaultModel: string;
    hasApiKey: boolean;
}

export default function Create({ projects, defaultModel, hasApiKey }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    New Code Review Workspace
                </h2>
            }
        >
            <Head title="New Code Review" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg dark:bg-gray-800">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Submit Code for AI Review
                        </h3>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
