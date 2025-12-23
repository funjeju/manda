"use client";

import { useState, useEffect } from 'react';
import { Node } from '@/lib/types';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { X, Calendar, RotateCcw, CheckSquare, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

interface TaskDetailProps {
    node: Node;
    isOpen: boolean;
    onClose: () => void;
}

export default function TaskDetail({ node, isOpen, onClose }: TaskDetailProps) {
    const { updateNode } = useProjectNodesStore();
    const [localNode, setLocalNode] = useState<Node>(node);

    useEffect(() => {
        setLocalNode(node);
    }, [node]);

    if (!isOpen) return null;

    const handleUpdate = async (patch: Partial<Node>) => {
        setLocalNode(prev => ({ ...prev, ...patch }));
        // Debounce could be good here, but for MVP direct update
        await updateNode(node.id, patch);
    };

    const handleTaskConfigUpdate = async (patch: any) => {
        const newConfig = { ...localNode.taskConfig, ...patch };

        // Calculate progress if recurring
        let newProgress = localNode.progress;
        if (newConfig.isRecurring && newConfig.targetCount > 0) {
            newProgress = Math.min(100, Math.floor((newConfig.currentCount || 0) / newConfig.targetCount * 100));
        }

        const updatePayload = {
            taskConfig: newConfig,
            progress: newProgress,
            status: newProgress >= 100 ? 'DONE' : localNode.status === 'DONE' ? 'IN_PROGRESS' : localNode.status
        } as any;

        setLocalNode(prev => ({ ...prev, ...updatePayload }));
        await updateNode(node.id, updatePayload);
    };

    const incrementCount = () => {
        if (!localNode.taskConfig?.isRecurring) return;
        handleTaskConfigUpdate({ currentCount: (localNode.taskConfig.currentCount || 0) + 1 });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckSquare className="text-emerald-500" />
                    Task Details
                </h2>
                <button onClick={onClose} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                </button>
            </div>

            <div className="space-y-8">
                {/* Title Edit */}
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                    <textarea
                        value={localNode.title}
                        onChange={e => handleUpdate({ title: e.target.value })}
                        className="w-full bg-zinc-950 border-zinc-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        rows={2}
                    />
                </div>

                {/* Status & Progress */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Status</label>
                        <select
                            value={localNode.status}
                            onChange={e => handleUpdate({ status: e.target.value as any })}
                            className="w-full bg-zinc-950 border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="REVIEW">Review</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Progress ({localNode.progress}%)</label>
                        <div className="h-9 flex items-center bg-zinc-950 rounded-lg px-3 border border-zinc-800">
                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${localNode.progress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recurring Logic */}
                <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <RotateCcw size={16} className="text-orange-500" />
                            <span className="font-bold text-sm">Recurring Goal</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={localNode.taskConfig?.isRecurring || false}
                            onChange={e => handleTaskConfigUpdate({
                                isRecurring: e.target.checked,
                                targetCount: localNode.taskConfig?.targetCount || 5, // Default target
                                currentCount: localNode.taskConfig?.currentCount || 0
                            })}
                            className="accent-orange-500 h-4 w-4"
                        />
                    </div>

                    {localNode.taskConfig?.isRecurring && (
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-zinc-500 mb-1">Target Count</label>
                                <input
                                    type="number"
                                    value={localNode.taskConfig?.targetCount || 0}
                                    onChange={e => handleTaskConfigUpdate({ targetCount: parseInt(e.target.value) })}
                                    className="w-full bg-zinc-900 border-zinc-800 rounded px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-zinc-500 mb-1">Current</label>
                                <div className="w-full bg-zinc-900 border-zinc-800 rounded px-3 py-2 text-sm flex items-center justify-between">
                                    <span>{localNode.taskConfig?.currentCount || 0}</span>
                                    <button
                                        onClick={incrementCount}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2 py-0.5 rounded"
                                    >
                                        +1
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results / Notes */}
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Results / Notes</label>
                    <textarea
                        value={localNode.taskConfig?.resultsSummary || ''}
                        onChange={e => handleTaskConfigUpdate({ resultsSummary: e.target.value })}
                        className="w-full bg-zinc-950 border-zinc-800 rounded-lg px-4 py-3 text-zinc-300 focus:ring-2 focus:ring-emerald-500 outline-none h-32 text-sm"
                        placeholder="Log your results here..."
                    />
                </div>

                {/* Delete (Not impl in store but placeholder) */}
                <div className="pt-8 border-t border-zinc-800">
                    <button className="text-red-500 text-sm flex items-center gap-2 hover:underline">
                        <Trash2 size={16} /> Delete Task
                    </button>
                </div>
            </div>
        </div>
    );
}
