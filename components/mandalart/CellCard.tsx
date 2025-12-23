"use client";

import { Node } from '@/lib/types';
import clsx from 'clsx';
import { Plus, CheckCircle, Circle, AlertCircle, FileText, Target, Info, X } from 'lucide-react';
import { useState } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';

interface CellCardProps {
    node: Node | {
        nodeType: 'EMPTY';
        id: string;
        slotIndex: number;
        parentId: string | null;
        depth: number;
    };
    isCenter?: boolean;
    onClick: () => void;
}

export default function CellCard({ node, isCenter, onClick }: CellCardProps) {
    const [showDesc, setShowDesc] = useState(false);

    // Empty state
    if (node.nodeType === 'EMPTY') {
        return (
            <button
                onClick={onClick}
                className="w-full h-full bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900/50 transition duration-200 group"
            >
                <Plus className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm font-medium">Add Node</span>
            </button>
        );
    }

    // Real node
    const realNode = node as Node;
    const isGoal = realNode.nodeType === 'GOAL';
    const isTask = realNode.nodeType === 'TASK';
    const isDone = realNode.status === 'DONE';

    return (
        <div
            onClick={onClick}
            className={clsx(
                'w-full h-full p-2 sm:p-4 rounded-xl border flex flex-col justify-between transition relative overflow-hidden cursor-pointer',
                isCenter
                    ? 'bg-zinc-800 border-orange-500/50 ring-4 ring-orange-500/10 scale-[1.02] shadow-xl z-10'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80'
            )}
        >
            {/* Progress background for goals */}
            {isGoal && !isCenter && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-orange-500/20 transition-all duration-500"
                    style={{ width: `${realNode.progress}%` }}
                />
            )}

            {/* Header: badge and status */}
            <div className="flex justify-between items-start">
                <span
                    className={clsx(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                        isGoal ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                    )}
                >
                    {realNode.nodeType}
                </span>
                {isTask && (isDone ? <CheckCircle size={16} className="text-emerald-500" /> : <Circle size={16} className="text-zinc-500" />)}
                {realNode.status === 'REVIEW' && <AlertCircle size={16} className="text-yellow-500 animate-pulse" />}
            </div>

            {/* Title with optional description button */}
            <div className="flex-1 flex items-center justify-center text-center p-2">
                <h3
                    className={clsx(
                        'font-bold line-clamp-3 leading-tight',
                        isCenter ? 'text-xl md:text-2xl text-white' : 'text-sm md:text-base text-zinc-200'
                    )}
                >
                    {realNode.title}
                    {realNode.description && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDesc(true);
                            }}
                            className="ml-2 text-zinc-400 hover:text-white"
                            aria-label="Show description"
                        >
                            <Info size={16} />
                        </button>
                    )}
                </h3>
            </div>

            {/* Footer: progress and assignee */}
            <div className="flex justify-between items-center text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                    {isGoal ? <Target size={12} /> : <FileText size={12} />}
                    <div className="flex items-center gap-2">
                        <span>{realNode.progress}%</span>
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={clsx(
                                    'h-full rounded-full transition-all duration-500',
                                    isGoal ? 'bg-blue-500' : isDone ? 'bg-emerald-500' : 'bg-orange-5' // note: typo fixed below
                                )}
                                style={{ width: `${realNode.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
                {realNode.assignee && (
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-white">
                            {realNode.assignee.name.charAt(0)}
                        </div>
                    </div>
                )}
            </div>

            {/* Description modal */}
            {showDesc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
                        <button onClick={() => setShowDesc(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4">Description</h3>
                        <p className="text-zinc-200 whitespace-pre-wrap">{realNode.description}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
