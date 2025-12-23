"use client";

import React, { useEffect, useState } from 'react';
import { useLogsStore } from '@/store/useLogsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { format } from 'date-fns';
import { Check, X, Clock, FileText, ArrowRight, Activity } from 'lucide-react';
import clsx from 'clsx';
import { useProjectNodesStore } from '@/store/useProjectNodesStore'; // To execute
import { useRouter } from 'next/navigation';

export default function LogsPage({ params }: { params: Promise<{ projectId: string }> }) {
    const resolvedParams = React.use(params);
    const { user } = useAuthStore();
    const { projects } = useProjectsStore();
    const { logs, pendingRequests, subscribeLogs, subscribeRequests, approveRequest, rejectRequest } = useLogsStore();
    const { createNode, updateNode, moveNode } = useProjectNodesStore();

    // Determine if current user is owner
    const currentProject = projects.find(p => p.id === resolvedParams.projectId);
    const isOwner = currentProject?.ownerId === user?.uid;

    const [activeTab, setActiveTab] = useState<'LOGS' | 'APPROVALS'>('APPROVALS');

    useEffect(() => {
        const unsubLogs = subscribeLogs(resolvedParams.projectId);
        const unsubReqs = subscribeRequests(resolvedParams.projectId);
        return () => { unsubLogs(); unsubReqs(); };
    }, [resolvedParams.projectId, subscribeLogs, subscribeRequests]);

    const handleApprove = async (requestId: string) => {
        try {
            await approveRequest(requestId, async (payload: any) => {
                // Determine action type from request? 
                // The executor stores generic logic. We need the action type here or inside store.
                // Store `approveRequest` provides payload. But we need to switch on action type.
                // Wait, useLogsStore.approveRequest takes an executor callback.
                // We need to know WHAT to execute.
                // Let's find the request again here (optimization: pass it?)

                const req = pendingRequests.find(r => r.id === requestId);
                if (!req) return;

                if (req.action === 'CREATE_NODE') {
                    await createNode(req.payload.parentId, req.payload.slotIndex, req.payload.data);
                } else if (req.action === 'UPDATE_NODE') {
                    await updateNode(req.payload.nodeId, req.payload.data);
                } else if (req.action === 'MOVE_NODE') {
                    await moveNode(req.payload.nodeId, req.payload.targetParentId, req.payload.targetSlotIndex);
                }
            });
        } catch (e) {
            alert("Approval failed: " + e);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Activity className="text-orange-500" />
                        Project Activity
                    </h1>
                    <p className="text-zinc-400 mt-1">Audit logs and change control.</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-zinc-800 mb-6">
                <button
                    onClick={() => setActiveTab('APPROVALS')}
                    className={clsx(
                        "pb-3 text-sm font-bold transition flex items-center gap-2 relative",
                        activeTab === 'APPROVALS' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Pending Approvals
                    {pendingRequests.length > 0 && (
                        <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {pendingRequests.length}
                        </span>
                    )}
                    {activeTab === 'APPROVALS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('LOGS')}
                    className={clsx(
                        "pb-3 text-sm font-bold transition flex items-center gap-2 relative",
                        activeTab === 'LOGS' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Audit Logs
                    {activeTab === 'LOGS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500" />}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'APPROVALS' && (
                    <div className="space-y-4">
                        {pendingRequests.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500">
                                <Check className="mx-auto mb-3 opacity-20" size={48} />
                                <p>No pending requests.</p>
                            </div>
                        ) : (
                            pendingRequests.map(req => (
                                <div key={req.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={clsx("px-2 py-0.5 rounded textxs font-bold uppercase",
                                                req.action.includes('CREATE') ? "bg-emerald-500/20 text-emerald-400" :
                                                    req.action.includes('UPDATE') ? "bg-blue-500/20 text-blue-400" :
                                                        "bg-purple-500/20 text-purple-400"
                                            )}>
                                                {req.action}
                                            </span>
                                            <span className="text-sm text-zinc-400">
                                                requested by <strong className="text-white">{req.userName}</strong>
                                            </span>
                                            <span className="text-xs text-zinc-600 flex items-center gap-1">
                                                <Clock size={12} />
                                                {format(new Date(req.createdAt), 'MMM d, HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-zinc-300 text-sm pl-1">
                                            {/* We should probably serialize payload summary or store details in approval request */}
                                            {/* Currently Types has payload: any. Let's rely on inferred context for now or update type */}
                                            Request ID: {req.id}
                                        </p>
                                    </div>

                                    {isOwner && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(req.id)}
                                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition"
                                                title="Approve"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={() => rejectRequest(req.id)}
                                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                                                title="Reject"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'LOGS' && (
                    <div className="space-y-0 relative border-l border-zinc-800 ml-4">
                        {logs.map((log, i) => (
                            <div key={log.id} className="mb-8 ml-6 relative">
                                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-zinc-800 border-2 border-zinc-950" />
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-zinc-500">
                                        {format(new Date(log.timestamp), 'HH:mm')}
                                    </span>
                                    <span className="text-sm font-bold text-white">{log.userName}</span>
                                    <span className="text-xs text-zinc-500">{log.action}</span>
                                </div>
                                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 inline-block min-w-[300px]">
                                    <p className="text-sm text-zinc-300">
                                        {log.details || `Performed ${log.action} on ${log.targetName}`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
