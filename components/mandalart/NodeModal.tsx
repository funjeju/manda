"use client";
import { useState } from 'react';
import clsx from 'clsx';
import { X, Target, CheckCircle } from 'lucide-react';

import { useProjectsStore } from '@/store/useProjectsStore'; // Import Projects Store
import { useProjectNodesStore } from '@/store/useProjectNodesStore'; // Import Project Nodes Store
import { useLogsStore } from '@/store/useLogsStore'; // Import Logs Store
import { useAuthStore } from '@/store/useAuthStore'; // Import Auth

import { NodeType } from '@/lib/types';

interface NodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentId: string | null;
    slotIndex: number;
    depth: number;
    projectId: string; // Add projectId prop
}

export default function NodeModal({ isOpen, onClose, parentId, slotIndex, depth, projectId }: NodeModalProps) {
    const { createNode } = useProjectNodesStore();
    const { user } = useAuthStore();
    const { projects } = useProjectsStore();
    const { submitRequest, addLog } = useLogsStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [nodeType, setNodeType] = useState<NodeType>('GOAL');
    const [loading, setLoading] = useState(false);

    // Permission Check
    const project = projects.find(p => p.id === projectId);
    const isOwner = user && project && user.uid === project.ownerId;
    const isTeam = project?.mode === 'TEAM';

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const startDate = formData.get('startDate') as string;
        const endDate = formData.get('endDate') as string;
        const estHours = formData.get('estHours') ? parseFloat(formData.get('estHours') as string) : 0;

        const nodeData = {
            title,
            description,
            nodeType,
            status: 'PENDING' as const, // Explicit cast
            progress: 0,
            taskConfig: nodeType === 'TASK' ? {
                isRecurring: false,
                estimatedDuration: estHours * 60
            } : undefined,
            dateRange: (startDate || endDate) ? { startDate: startDate || '', endDate: endDate || '' } : null
        };

        setLoading(true);
        try {
            if (isOwner || !isTeam) {
                // Direct Execution
                const newNodeId = await createNode(parentId, slotIndex, nodeData);
                await addLog(projectId, 'CREATE_NODE', newNodeId, title, `Created ${nodeType}`);
                alert("Node Created!");
            } else {
                // Request Approval
                await submitRequest(projectId, 'CREATE_NODE', { parentId, slotIndex, data: nodeData }, `Request to create ${nodeType}: ${title}`);
                alert("Request sent to Project Owner for approval.");
            }

            onClose();
            setTitle('');
            setNodeType('GOAL');
        } catch (error) {
            console.error(error);
            alert('Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Create New Goal/Task</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none text-white placeholder-zinc-600"
                            placeholder="What is this goal?"
                        />
                        <div className="mt-2">
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none text-white placeholder-zinc-600"
                                placeholder="Add a description (optional)"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setNodeType('GOAL')}
                                className={clsx(
                                    "flex flex-col items-center justify-center p-4 rounded-lg border transition",
                                    nodeType === 'GOAL' ? "bg-blue-500/10 border-blue-500 text-blue-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                )}
                            >
                                <Target className="mb-2" />
                                <span className="font-bold">GOAL</span>
                                <span className="text-xs opacity-70 mt-1">Has sub-goals (Zoomable)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setNodeType('TASK')}
                                className={clsx(
                                    "flex flex-col items-center justify-center p-4 rounded-lg border transition",
                                    nodeType === 'TASK' ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                )}
                            >
                                <CheckCircle className="mb-2" />
                                <span className="font-bold">TASK</span>
                                <span className="text-xs opacity-70 mt-1">Actionable Item (Leaf)</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label>
                            <input
                                type="date"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none text-white [color-scheme:dark]"
                                name="startDate"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">End Date</label>
                            <input
                                type="date"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none text-white [color-scheme:dark]"
                                name="endDate"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !title}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </form>
            </div >
        </div >
    );
}
