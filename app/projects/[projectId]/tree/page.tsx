"use client";

import { useEffect } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { Node } from '@/lib/types';
import { ChevronRight, ChevronDown, Circle, CheckCircle, Target, FileText } from 'lucide-react';
import clsx from 'clsx';

import { use } from 'react';

export default function TreeViewPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    const { subscribeNodes, nodesById, loading } = useProjectNodesStore();

    useEffect(() => {
        const unsub = subscribeNodes(projectId);
        return () => unsub();
    }, [projectId, subscribeNodes]);

    if (loading) return <div className="p-8 text-zinc-500">Loading Tree...</div>;

    const rootNode = Object.values(nodesById).find(n => !n.parentId);
    if (!rootNode) return <div className="p-8 text-zinc-500">No root node found.</div>;

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Target className="text-orange-500" /> Project Structure
                </h2>
                <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/50">
                    <TreeNodeItem node={rootNode} allNodes={nodesById} />
                </div>
            </div>
        </div>
    );
}

function TreeNodeItem({ node, allNodes }: { node: Node, allNodes: Record<string, Node> }) {
    const children = Object.values(allNodes)
        .filter(n => n.parentId === node.id)
        .sort((a, b) => a.slotIndex - b.slotIndex); // Sort by slot (visual order approx)

    const isGoal = node.nodeType === 'GOAL';
    const isTask = node.nodeType === 'TASK';
    const isDone = node.status === 'DONE';

    return (
        <div className="ml-4 border-l border-zinc-800 pl-4 py-1">
            <div className="flex items-center gap-2 group">
                {isGoal ? (
                    <div className="text-blue-500"><Target size={14} /></div>
                ) : (
                    <div className={isDone ? "text-emerald-500" : "text-zinc-500"}>
                        {isDone ? <CheckCircle size={14} /> : <Circle size={14} />}
                    </div>
                )}
                <span className={clsx(
                    "text-sm",
                    isTask && isDone ? "text-zinc-500 line-through" : "text-zinc-200 group-hover:text-white"
                )}>
                    {node.title}
                </span>
                {node.progress > 0 && (
                    <span className="text-[10px] text-zinc-500 ml-2 bg-zinc-800 px-1 rounded">
                        {node.progress}%
                    </span>
                )}
            </div>

            {children.length > 0 && (
                <div className="mt-1">
                    {children.map(child => (
                        <TreeNodeItem key={child.id} node={child} allNodes={allNodes} />
                    ))}
                </div>
            )}
        </div>
    );
}
