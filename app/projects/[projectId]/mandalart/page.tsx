"use client";

import { useEffect, useState } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import Grid3x3 from '@/components/mandalart/Grid3x3';
import NodeModal from '@/components/mandalart/NodeModal';
import TaskDetail from '@/components/task/TaskDetail';
import { Node } from '@/lib/types';
import { ChevronRight, Home, ZoomIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';

import { use } from 'react';

export default function MandalartPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    const searchParams = useSearchParams();
    const targetId = searchParams.get('target');

    const {
        subscribeNodes,
        setFocusNodeId,
        focusNodeId,
        getBreadcrumbPath,
        getNode,
        loading
    } = useProjectNodesStore();

    // State for modals
    const [createModalState, setCreateModalState] = useState<{ isOpen: boolean, parentId: string | null, slotIndex: number, depth: number } | null>(null);
    const [taskDetailNodeId, setTaskDetailNodeId] = useState<string | null>(null);

    // Subscribe to inputs
    useEffect(() => {
        const unsub = subscribeNodes(projectId);
        return () => unsub();
    }, [projectId, subscribeNodes]);

    // Handle Jump-to-Target (Deep Link)
    useEffect(() => {
        if (targetId && !loading && getNode) {
            const targetNode = getNode(targetId);
            if (targetNode) {
                // If target is GOAL, we might want to focus IT.
                // If target is TASK, we want to focus its PARENT so we can see the task in the grid.
                // Usually for "Jump to Cell", we want to see the cell.
                if (targetNode.parentId) {
                    setFocusNodeId(targetNode.parentId);
                    // Highlight logic could be added here (e.g. flash effect)
                } else {
                    setFocusNodeId(targetNode.id); // It's root
                }
            }
        }
    }, [targetId, loading, getNode, setFocusNodeId]);

    const handleNodeClick = (node: Node | any) => {
        if (node.nodeType === 'EMPTY') {
            setCreateModalState({
                isOpen: true,
                parentId: node.parentId,
                slotIndex: node.slotIndex,
                depth: node.depth
            });
        } else if (node.nodeType === 'GOAL') {
            // If clicked center, maybe do nothing? (Already focused)
            if (node.id === focusNodeId) return;
            setFocusNodeId(node.id);
        } else if (node.nodeType === 'TASK') {
            setTaskDetailNodeId(node.id);
        }
    };

    const breadcrumbs = getBreadcrumbPath(focusNodeId);

    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Breadcrumbs */}
            <div className="px-6 py-2 border-b border-zinc-800/50 flex items-center text-sm overflow-x-auto">
                <button
                    onClick={() => setFocusNodeId(null)} // Reset to root implicitly by setting null which store handles
                    className="flex items-center text-zinc-500 hover:text-white transition mr-2"
                >
                    <Home size={14} className="mr-1" /> Root
                </button>
                {breadcrumbs.map((crumb, i) => (
                    <div key={crumb.id} className="flex items-center">
                        <ChevronRight size={14} className="text-zinc-700 mx-1" />
                        <button
                            onClick={() => setFocusNodeId(crumb.id)}
                            className={clsx(
                                "hover:text-white transition whitespace-nowrap",
                                i === breadcrumbs.length - 1 ? "text-white font-bold" : "text-zinc-500"
                            )}
                        >
                            {crumb.title}
                        </button>
                    </div>
                ))}
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex items-center justify-center p-4 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
                {loading ? (
                    <div className="text-zinc-500 animate-pulse">Loading Board...</div>
                ) : (
                    <Grid3x3 onNodeClick={handleNodeClick} />
                )}
            </div>

            {/* Modals */}
            {createModalState && (
                <NodeModal
                    isOpen={createModalState.isOpen}
                    onClose={() => setCreateModalState(null)}
                    parentId={createModalState.parentId}
                    slotIndex={createModalState.slotIndex}
                    depth={createModalState.depth}
                    projectId={projectId}
                />
            )}

            <TaskDetail
                node={taskDetailNodeId ? getNode(taskDetailNodeId)! : {} as Node}
                isOpen={!!taskDetailNodeId}
                onClose={() => setTaskDetailNodeId(null)}
            />
        </div>
    );
}
