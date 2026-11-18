import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    Key,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Trash2,
    RefreshCw,
    Eye,
    EyeOff,
    Cpu,
    History,
    Sparkles,
} from 'lucide-react';

interface ApiKeyData {
    key_hint: string;
    default_model: string;
    is_active: boolean;
    last_verified_at: string | null;
}

interface AuditLog {
    id: number;
    action: string;
    ip_address: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
}

interface Props {
    apiKey: ApiKeyData | null;
    auditLogs: AuditLog[];
}

export default function Settings({ apiKey, auditLogs }: Props) {
    const { flash, errors } = usePage().props as unknown as {
        flash?: { success?: string; error?: string };
        errors: Record<string, string>;
    };

    const [showKeyInput, setShowKeyInput] = useState(false);
    const [confirmingDeletion, setConfirmingDeletion] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    // Form for adding / replacing API key
    const {
        data,
        setData,
        post,
        processing,
        errors: formErrors,
        reset,
    } = useForm({
        api_key: '',
        default_model: apiKey?.default_model || 'gemini-2.5-flash',
    });

    // Form for quick model update
    const {
        data: modelData,
        setData: setModelData,
        patch: patchModel,
        processing: modelProcessing,
    } = useForm({
        default_model: apiKey?.default_model || 'gemini-2.5-flash',
    });

    const handleSaveKey = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('settings.api-key.store'), {
            onSuccess: () => reset('api_key'),
        });
    };

    const handleTestConnection = () => {
        setTestingConnection(true);
        router.post(
            route('settings.api-key.test'),
            {},
            {
                onFinish: () => setTestingConnection(false),
            }
        );
    };

    const handleUpdateModel = (e: React.FormEvent) => {
        e.preventDefault();
        patchModel(route('settings.api-key.model'));
    };

    const handleDeleteKey = () => {
        router.delete(route('settings.api-key.destroy'), {
            onSuccess: () => setConfirmingDeletion(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                            BYOK & AI Settings
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Manage your personal Google Gemini API key and AI model preferences
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="BYOK & AI Settings" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-medium">{flash.success}</p>
                        </div>
                    )}

                    {flash?.error && (
                        <div className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
                            <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                            <p className="text-sm font-medium">{flash.error}</p>
                        </div>
                    )}

                    {/* Section 1: BYOK Gemini Key Management */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="border-b border-gray-100 p-6 dark:border-gray-700/60">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                        <Key className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Google Gemini API Key (BYOK)
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Your key is securely encrypted using AES-256-CBC at rest.
                                        </p>
                                    </div>
                                </div>

                                {/* Status badge & Test connection button */}
                                <div className="flex items-center gap-3">
                                    {apiKey ? (
                                        apiKey.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Active & Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                <XCircle className="h-3.5 w-3.5" />
                                                Verification Failed
                                            </span>
                                        )
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            No Key Configured
                                        </span>
                                    )}

                                    {apiKey && (
                                        <button
                                            type="button"
                                            onClick={handleTestConnection}
                                            disabled={testingConnection}
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                        >
                                            <RefreshCw
                                                className={`h-3.5 w-3.5 ${
                                                    testingConnection ? 'animate-spin text-indigo-600' : ''
                                                }`}
                                            />
                                            {testingConnection ? 'Testing...' : 'Test Connection'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Current Key Information */}
                            {apiKey && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700/60 dark:bg-gray-900/40">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                Active Key Hint
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="rounded bg-white px-2.5 py-1 text-sm font-mono font-medium text-gray-900 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700">
                                                    {apiKey.key_hint}
                                                </code>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    (Only first 4 & last 4 characters stored unencrypted)
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {apiKey.last_verified_at && (
                                                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                                                    Verified:{' '}
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                        {new Date(apiKey.last_verified_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                            <DangerButton
                                                onClick={() => setConfirmingDeletion(true)}
                                                className="!px-3 !py-1.5 text-xs flex items-center gap-1.5"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Remove Key
                                            </DangerButton>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Store / Replace Key Form */}
                            <form onSubmit={handleSaveKey} className="space-y-4">
                                <div>
                                    <InputLabel
                                        htmlFor="api_key"
                                        value={apiKey ? 'Replace Existing API Key' : 'Enter Gemini API Key'}
                                    />
                                    <div className="relative mt-1">
                                        <TextInput
                                            id="api_key"
                                            type={showKeyInput ? 'text' : 'password'}
                                            name="api_key"
                                            value={data.api_key}
                                            className="block w-full pr-10 font-mono text-sm"
                                            placeholder="AIzaSy... or AQ...."
                                            onChange={(e) => setData('api_key', e.target.value)}
                                            autoComplete="off"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKeyInput(!showKeyInput)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            {showKeyInput ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError message={formErrors.api_key || errors.api_key} className="mt-2" />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Get your free API key from{' '}
                                        <a
                                            href="https://aistudio.google.com/app/apikey"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                                        >
                                            Google AI Studio
                                        </a>
                                        . When you submit, a live ping to <code>models.list</code> verifies the key before saving.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="default_model" value="Default Model" />
                                        <select
                                            id="default_model"
                                            value={data.default_model}
                                            onChange={(e) => setData('default_model', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 text-sm"
                                        >
                                            <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Recommended)</option>
                                            <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Architecture & Reasoning)</option>
                                            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                                            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                                        </select>
                                    </div>

                                    <div className="flex items-end">
                                        <PrimaryButton
                                            type="submit"
                                            disabled={processing || !data.api_key}
                                            className="w-full sm:w-auto flex justify-center items-center gap-2"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            {processing ? 'Verifying & Encrypting...' : apiKey ? 'Update & Re-verify Key' : 'Save & Verify Key'}
                                        </PrimaryButton>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Section 2: Model Preference (If Key is already active) */}
                    {apiKey && (
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
                            <div className="border-b border-gray-100 p-6 dark:border-gray-700/60">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                                        <Cpu className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Default AI Model Configuration
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Select which Gemini model to use for automated code & performance reviews.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateModel} className="p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 max-w-xl">
                                    <div className="flex-1 w-full">
                                        <InputLabel htmlFor="quick_model" value="Active Model Preference" />
                                        <select
                                            id="quick_model"
                                            value={modelData.default_model}
                                            onChange={(e) => setModelData('default_model', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 text-sm"
                                        >
                                            <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & recommended)</option>
                                            <option value="gemini-2.5-pro">gemini-2.5-pro (In-depth analysis)</option>
                                            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                                            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                                        </select>
                                    </div>
                                    <PrimaryButton
                                        type="submit"
                                        disabled={modelProcessing || modelData.default_model === apiKey.default_model}
                                    >
                                        {modelProcessing ? 'Saving...' : 'Save Preference'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Section 3: Security Audit Trail */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
                        <div className="border-b border-gray-100 p-6 dark:border-gray-700/60">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                                    <History className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        Security Audit Trail
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Immutable log of all key modifications, verifications, and security events.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Action</th>
                                        <th scope="col" className="px-6 py-3">Details</th>
                                        <th scope="col" className="px-6 py-3">IP Address</th>
                                        <th scope="col" className="px-6 py-3">Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {auditLogs.length > 0 ? (
                                        auditLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                                                <td className="px-6 py-3 font-medium text-gray-900 dark:text-gray-200">
                                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-xs font-mono">
                                                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                                                </td>
                                                <td className="px-6 py-3 text-xs">
                                                    {log.ip_address || '—'}
                                                </td>
                                                <td className="px-6 py-3 text-xs text-gray-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-6 text-center text-xs text-gray-400">
                                                No audit logs recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal for Key Deletion */}
            <Modal show={confirmingDeletion} onClose={() => setConfirmingDeletion(false)}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Are you sure you want to remove your API Key?
                    </h2>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Removing your API key will permanently delete the encrypted key from our database.
                        Any new code reviews will require you to re-enter your key.
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setConfirmingDeletion(false)}>
                            Cancel
                        </SecondaryButton>

                        <DangerButton onClick={handleDeleteKey}>
                            Confirm Removal
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
