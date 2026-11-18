import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React from 'react';

interface Props {
    review: {
        id: number;
        language: string;
        status: string;
        overall_score: number | null;
        source_code: string;
        findings: Array<any>;
    };
}

export default function Show({ review }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Review #{review.id} — {review.language}
                </h2>
            }
        >
            <Head title={`Review #${review.id}`} />
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow sm:rounded-lg dark:bg-gray-800">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Status: {review.status}
                        </h3>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
