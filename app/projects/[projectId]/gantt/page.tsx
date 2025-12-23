"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { format, differenceInDays, isValid, parseISO } from 'date-fns';
import { GanttChartSquare, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Node } from '@/lib/types';
import { use } from 'react';

// Color Palette for Hierarchy
const TYPE_COLORS = {
    'GOAL': { bar: 'bg-blue-600', text: 'text-blue-200' },
    'TASK': { bar: 'bg-emerald-600', text: 'text-emerald-200' },
    'EMPTY': { bar: 'bg-zinc-800', text: 'text-zinc-500' }
};

export default function GanttViewPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    const { subscribeNodes, loading, nodesById } = useProjectNodesStore();

    useEffect(() => {
        const unsub = subscribeNodes(projectId);
        return () => unsub();
    }, [projectId, subscribeNodes]);

    // Flatten logic
    const { flatList, minDate, maxDate } = useMemo(() => {
        if (!nodesById || Object.keys(nodesById).length === 0) return { flatList: [], minDate: new Date(), maxDate: new Date() };

        // 1. Find Root
        const root = Object.values(nodesById).find(n => n.parentId === null || n.depth === 0);
        if (!root) return { flatList: [], minDate: new Date(), maxDate: new Date() };

        // 2. Recursive Flatten
        const visibleNodes: Array<{ node: Node; depth: number }> = [];

        const traverse = (nodeId: string, depth: number) => {
            const node = nodesById[nodeId];
            if (!node || node.nodeType === 'EMPTY') return; // Skip empty nodes for Gantt

            visibleNodes.push({ node, depth });

            // Sort children by slotIndex for consistent order
            const children = Object.values(nodesById)
                .filter(n => n.parentId === nodeId)
                .sort((a, b) => a.slotIndex - b.slotIndex);

            children.forEach(child => traverse(child.id, depth + 1));
        };

        traverse(root.id, 0);

        // 3. Calc Timeline Range
        let min = new Date();
        let max = new Date();
        // Init with root dates if exist
        if (root.dateRange) {
            min = new Date(root.dateRange.startDate);
            max = new Date(root.dateRange.endDate);
        }

        visibleNodes.forEach(({ node }) => {
            if (node.dateRange) {
                const s = new Date(node.dateRange.startDate);
                const e = new Date(node.dateRange.endDate);
                if (isValid(s) && s < min) min = s;
                if (isValid(e) && e > max) max = e;
            }
        });

        // Add padding
        min.setDate(min.getDate() - 5);
        max.setDate(max.getDate() + 15); // More space at end

        return { flatList: visibleNodes, minDate: min, maxDate: max };
    }, [nodesById]);

    if (loading) return <div className="p-8 text-zinc-500">Loading Gantt...</div>;
    if (flatList.length === 0) return <div className="p-12 text-center text-zinc-500">No nodes to display. Add Goals/Tasks first.</div>;

    const totalDays = Math.max(14, differenceInDays(maxDate, minDate));

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <GanttChartSquare className="text-orange-500" />
                    Integrated Gantt Chart
                </h2>
                <div className="text-zinc-500 text-sm">
                    {format(minDate, 'MMM d, yyyy')} - {format(maxDate, 'MMM d, yyyy')} ({totalDays} days)
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-full inline-block">
                    {/* Header Row */}
                    <div className="flex sticky top-0 bg-zinc-900 z-20 border-b border-zinc-800 h-10">
                        <div className="w-[300px] flex-shrink-0 px-4 flex items-center text-xs font-bold text-zinc-400 border-r border-zinc-800 bg-zinc-900 sticky left-0 z-30">
                            Task Hierarchy
                        </div>
                        <div className="flex-1 relative">
                            {/* Simple Date Markers */}
                            <div className="absolute inset-0 flex items-center">
                                <span className="text-xs text-zinc-600 px-2">Timeline Scale</span>
                            </div>
                        </div>
                    </div>

                    {/* Node Rows */}
                    <div className="relative">
                        {/* Background Grid Lines would go here */}

                        {flatList.map(({ node, depth }, index) => {
                            // Calc Bar Position
                            let leftPct = 0;
                            let widthPct = 0;
                            let hasDates = false;

                            if (node.dateRange) {
                                const start = new Date(node.dateRange.startDate);
                                const end = new Date(node.dateRange.endDate);
                                if (isValid(start) && isValid(end)) {
                                    hasDates = true;
                                    const offset = differenceInDays(start, minDate);
                                    const duration = differenceInDays(end, start) + 1; // +1 to include end day

                                    leftPct = (offset / totalDays) * 100;
                                    widthPct = (duration / totalDays) * 100;
                                }
                            }

                            const isGoal = node.nodeType === 'GOAL';
                            const isTask = node.nodeType === 'TASK';

                            return (
                                <div
                                    key={node.id}
                                    className={clsx(
                                        "flex h-12 border-b border-zinc-900 items-center hover:bg-zinc-900/40 transition group",
                                        index % 2 === 0 ? "bg-zinc-950" : "bg-zinc-950/50" // Striped
                                    )}
                                >
                                    {/* Left Panel: Tree */}
                                    <div
                                        className="w-[300px] flex-shrink-0 px-4 flex items-center border-r border-zinc-800 h-full sticky left-0 z-10 bg-inherit"
                                    >
                                        <div style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center gap-2 overflow-hidden">
                                            {isGoal ? <ChevronDown size={14} className="text-zinc-500 shrink-0" /> : <span className="w-3.5" />}
                                            <span className={clsx("truncate text-sm", isGoal ? "font-bold text-white" : "text-zinc-300")}>
                                                {node.title}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Panel: Bar */}
                                    <div className="flex-1 h-full relative">
                                        {hasDates ? (
                                            <div
                                                className={clsx(
                                                    "absolute top-2.5 h-7 rounded-md border border-white/5 shadow-sm overflow-hidden flex items-center",
                                                    isGoal ? "bg-blue-600/20 border-blue-500/30" : "bg-emerald-600/20 border-emerald-500/30"
                                                )}
                                                style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '4px' }}
                                            >
                                                {/* Progress Fill */}
                                                <div
                                                    className={clsx(
                                                        "h-full opacity-60",
                                                        isGoal ? "bg-blue-500" : "bg-emerald-500"
                                                    )}
                                                    style={{ width: `${node.progress || 0}%` }}
                                                />

                                                {/* Label */}
                                                <span className="absolute left-2 text-[10px] text-white/80 font-medium whitespace-nowrap">
                                                    {isGoal ? '' : `${node.progress}%`}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center px-4 text-xs text-zinc-700 italic">
                                                No dates
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
