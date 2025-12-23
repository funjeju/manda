"use client";

import React, { useEffect, useState } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, differenceInDays, isBefore, isToday, isWithinInterval, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Calendar as CalendarIcon, Target, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';
import { Node } from '@/lib/types';

export default function CalendarPage({ params }: { params: Promise<{ projectId: string }> }) {
    const resolvedParams = React.use(params);
    const { nodesById, subscribeNodes, loading: nodesLoading } = useProjectNodesStore();
    const { projects } = useProjectsStore();

    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const unsub = subscribeNodes(resolvedParams.projectId);
        return () => unsub();
    }, [resolvedParams.projectId, subscribeNodes]);

    const project = projects.find(p => p.id === resolvedParams.projectId);
    const allNodes = Object.values(nodesById);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDayOfWeek = monthStart.getDay();
    const paddingDays = Array.from({ length: startDayOfWeek });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const isWithinProjectRange = (day: Date) => {
        if (!project?.startDate || !project?.endDate) return false;
        try {
            const start = parseISO(project.startDate);
            const end = parseISO(project.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return day >= start && day <= end;
        } catch (e) {
            return false;
        }
    };

    const getRiskLevel = (node: Node) => {
        if (node.nodeType !== 'TASK' || !node.dateRange?.endDate || !node.taskConfig?.estimatedDuration) return null;
        if (node.status === 'DONE') return null;

        const endDate = new Date(node.dateRange.endDate);
        const daysRemaining = differenceInDays(endDate, new Date());
        const estimatedWorkDays = (node.taskConfig.estimatedDuration / 60) / 8;

        if (daysRemaining < estimatedWorkDays) return 'HIGH';
        if (daysRemaining < estimatedWorkDays * 1.5) return 'MEDIUM';
        return 'LOW';
    };

    return (
        <div className="h-full flex flex-col text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-1 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="text-orange-500" />
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex bg-zinc-800 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-zinc-700 rounded"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold hover:bg-zinc-700 rounded">Today</button>
                        <button onClick={nextMonth} className="p-1 hover:bg-zinc-700 rounded"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400">
                    <div className="flex items-center gap-1.5"><Target size={14} className="text-blue-400" /> Goal</div>
                    <div className="flex items-center gap-1.5"><Circle size={14} className="text-zinc-500" /> Task</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></span> Risk</div>
                </div>
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="grid grid-cols-7 bg-zinc-950 border-b border-zinc-800">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-2.5 text-center text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-auto custom-scrollbar">
                    {paddingDays.map((_, i) => (
                        <div key={`pad-${i}`} className="bg-zinc-950/30 border-b border-r border-zinc-800/50" />
                    ))}

                    {calendarDays.map((day) => {
                        const inProjectRange = isWithinProjectRange(day);
                        const dayNodes = allNodes.filter(n => {
                            if (!n.dateRange) return false;
                            const start = new Date(n.dateRange.startDate);
                            const end = new Date(n.dateRange.endDate);
                            start.setHours(0, 0, 0, 0);
                            end.setHours(0, 0, 0, 0);
                            return day >= start && day <= end;
                        }).sort((a, b) => (a.nodeType === 'GOAL' ? -1 : 1)); // Goals first

                        return (
                            <div
                                key={day.toString()}
                                className={clsx(
                                    "min-h-[100px] border-b border-r border-zinc-800 p-1.5 sm:p-2 transition relative group",
                                    inProjectRange ? "bg-orange-500/[0.03] sm:bg-orange-500/[0.05]" : "bg-zinc-900",
                                    isToday(day) && "bg-orange-500/[0.08]",
                                    !isSameMonth(day, currentDate) && "opacity-40"
                                )}
                            >
                                <div className={clsx(
                                    "text-xs sm:text-sm font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                                    isToday(day) ? "bg-orange-500 text-white shadow-lg shadow-orange-900/40" : "text-zinc-500 group-hover:text-zinc-300"
                                )}>
                                    {format(day, 'd')}
                                </div>

                                <div className="space-y-1 sm:space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar pb-1">
                                    {dayNodes.map(node => {
                                        const risk = getRiskLevel(node);
                                        const isStart = isSameDay(new Date(node.dateRange!.startDate), day);
                                        const isEnd = isSameDay(new Date(node.dateRange!.endDate), day);
                                        const isGoal = node.nodeType === 'GOAL';

                                        return (
                                            <div
                                                key={node.id}
                                                className={clsx(
                                                    "text-[9px] sm:text-xs px-1.5 py-0.5 sm:py-1 rounded-sm flex items-center gap-1 border-l-2 truncate transition-all",
                                                    isGoal
                                                        ? "bg-blue-500/10 border-blue-500 text-blue-200"
                                                        : "bg-zinc-800 border-zinc-600 text-zinc-300",
                                                    node.status === 'DONE' && "opacity-40 line-through border-emerald-500 bg-emerald-900/20 text-emerald-300",
                                                    risk === 'HIGH' && node.status !== 'DONE' && "bg-red-950/40 border-red-500 text-red-200 shadow-sm",
                                                    risk === 'MEDIUM' && node.status !== 'DONE' && "bg-yellow-950/20 border-yellow-500/50 text-yellow-100"
                                                )}
                                                title={`${node.title} (${node.status})`}
                                            >
                                                {isStart && !isEnd && <span className="text-[10px] text-current mr-0.5">▶</span>}
                                                {!isStart && isEnd && <span className="text-[10px] text-current mr-0.5">◀</span>}

                                                {isGoal ? <Target size={10} className="shrink-0" /> : <Circle size={10} className="shrink-0 opacity-50" />}
                                                {risk === 'HIGH' && node.status !== 'DONE' && <AlertTriangle size={10} className="text-red-500 shrink-0" />}

                                                <span className="truncate flex-1">{node.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
