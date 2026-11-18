import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import React from 'react';

interface Props {
    reviews: {
        data: Array<any>;
        links: Array<any>;
    };
    projects: Array<{ id: number; name: string }>;
    filters: Record<string, string>;
}

export default function Index({ reviews, projects, filters }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Review History
                </h2>
            }
        >
            <Head title="Review History" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Your Code Reviews
                            </h3>
                            <Link
                                href={route('reviews.create')}
                                className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                New Review
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total reviews: {reviews.data.length}
                        </p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
