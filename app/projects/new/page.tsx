"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';


export default function NewProjectPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { createProject, loading } = useProjectsStore();

    const [formData, setFormData] = useState({
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        mode: 'SOLO' as 'SOLO' | 'TEAM',
        institutionName: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const projectId = await createProject({
                ...formData,
                ownerId: user.uid,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                members: [user.uid]
            });
            router.push(`/projects/${projectId}/mandalart`);
        } catch (err) {
            console.error(err);
            alert("Failed to create project");
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto w-full">
            <Link href="/" className="inline-flex items-center text-zinc-400 hover:text-white mb-6">
                <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold text-white mb-2">Create New Project</h1>
            <p className="text-zinc-400 mb-8">Define the core structure of your goal.</p>

            <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900/50 p-8 rounded-xl border border-zinc-800">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Project Title</label>
                    <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none transition"
                        placeholder="e.g. Mastering Fullstack Development"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Start Date</label>
                        <input
                            type="date"
                            required
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none transition text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">End Date</label>
                        <input
                            type="date"
                            required
                            value={formData.endDate}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none transition text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Mode</label>
                        <select
                            value={formData.mode}
                            onChange={e => setFormData({ ...formData, mode: e.target.value as any })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none transition"
                        >
                            <option value="SOLO">Solo (Self-Managed)</option>
                            <option value="TEAM">Team (Approval Flow)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">Institution / Client (Optional)</label>
                        <input
                            type="text"
                            value={formData.institutionName}
                            onChange={e => setFormData({ ...formData, institutionName: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none transition"
                            placeholder="e.g. My Company or Personal"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Create Project
                    </button>
                </div>

            </form>
        </div>
    );
}
