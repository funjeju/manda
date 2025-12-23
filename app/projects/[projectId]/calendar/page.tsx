"use client";

import React, { useEffect, useState } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, differenceInDays, isBefore, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalendarIcon, Target, Circle } from 'lucide-react';
import clsx from 'clsx';
import { Node } from '@/lib/types';

const GOAL_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1'
];

export default function CalendarPage({ params }: { params: Promise<{ projectId: string }> }) {
    const resolvedParams = React.use(params);
    const { nodesById, subscribeNodes } = useProjectNodesStore();
    const { projects } = useProjectsStore();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribeNodes(resolvedParams.projectId);
        return () => unsub();
    }, [resolvedParams.projectId, subscribeNodes]);

    const project = projects.find(p => p.id === resolvedParams.projectId);
    const allNodes = Object.values(nodesById);
    const goals = allNodes.filter(n => n.nodeType === 'GOAL').sort((a, b) => a.slotIndex - b.slotIndex);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDayOfWeek = monthStart.getDay();
    const paddingDays = Array.from({ length: startDayOfWeek });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const getNodeColor = (nodeId: string) => {
        const idx = goals.findIndex(g => g.id === nodeId);
        return GOAL_COLORS[idx % GOAL_COLORS.length] || '#71717a';
    };

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
        <div className="h-full flex flex-col text-white select-none">
            {/* Header & Main Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-1 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="text-orange-500" />
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex bg-zinc-800 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-zinc-700 rounded transition-colors"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold hover:bg-zinc-700 rounded transition-colors">Today</button>
                        <button onClick={nextMonth} className="p-1 hover:bg-zinc-700 rounded transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-400">
                    <div className="flex items-center gap-1.5"><Circle size={14} className="text-zinc-500" /> Tasks</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></span> Risk</div>
                </div>
            </div>

            {/* Goals Legend (Dynamic) */}
            <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
                    <Target size={14} /> Goal Legend
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-4 min-w-max sm:min-w-0">
                    {goals.map((goal) => (
                        <div
                            key={goal.id}
                            onMouseEnter={() => setHoveredNodeId(goal.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-default",
                                hoveredNodeId === goal.id ? "bg-white/10 border-white/20 scale-105 shadow-lg" : "bg-zinc-900 border-zinc-800 opacity-80"
                            )}
                        >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNodeColor(goal.id) }} />
                            <span className={clsx("text-xs font-medium whitespace-nowrap", hoveredNodeId === goal.id ? "text-white" : "text-zinc-400")}>
                                {goal.title}
                            </span>
                        </div>
                    ))}
                    {goals.length === 0 && <span className="text-xs text-zinc-600 italic">No goals defined yet.</span>}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <div className="grid grid-cols-7 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-10">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-3 text-center text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-auto custom-scrollbar">
                    {paddingDays.map((_, i) => (
                        <div key={`pad-${i}`} className="bg-zinc-950/20 border-b border-r border-zinc-800/30" />
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
                        });

                        const dayGoals = dayNodes.filter(n => n.nodeType === 'GOAL');
                        const dayTasks = dayNodes.filter(n => n.nodeType === 'TASK');

                        return (
                            <div
                                key={day.toString()}
                                className={clsx(
                                    "min-h-[120px] border-b border-r border-zinc-800/50 p-2 transition-all relative group overflow-hidden",
                                    inProjectRange ? "bg-orange-500/[0.02] sm:bg-orange-500/[0.04]" : "bg-zinc-900",
                                    isToday(day) && "bg-orange-500/[0.1] ring-1 ring-inset ring-orange-500/20",
                                    !isSameMonth(day, currentDate) && "opacity-30"
                                )}
                            >
                                <div className={clsx(
                                    "text-xs sm:text-sm font-bold mb-3 w-7 h-7 flex items-center justify-center rounded-xl transition-all",
                                    isToday(day) ? "bg-orange-500 text-white shadow-lg shadow-orange-900/40" : "text-zinc-500 group-hover:text-zinc-200"
                                )}>
                                    {format(day, 'd')}
                                </div>

                                <div className="space-y-1.5 overflow-visible">
                                    {/* Goal Range Bars */}
                                    <div className="flex flex-wrap gap-1">
                                        {dayGoals.map((goal) => {
                                            const isStart = isSameDay(new Date(goal.dateRange!.startDate), day);
                                            const isEnd = isSameDay(new Date(goal.dateRange!.endDate), day);
                                            const color = getNodeColor(goal.id);
                                            const isHovered = hoveredNodeId === goal.id;

                                            return (
                                                <div
                                                    key={goal.id}
                                                    onMouseEnter={() => setHoveredNodeId(goal.id)}
                                                    onMouseLeave={() => setHoveredNodeId(null)}
                                                    className={clsx(
                                                        "h-2.5 sm:h-3 transition-all duration-200 relative",
                                                        isStart && !isEnd ? "rounded-l-full pl-1 ml-0.5" :
                                                            !isStart && isEnd ? "rounded-r-full pr-1 mr-0.5" :
                                                                isStart && isEnd ? "rounded-full px-1 mx-0.5" : "w-full mx-0",
                                                        isHovered ? "scale-y-125 opacity-100 z-10" : "opacity-60 grayscale-[0.3]"
                                                    )}
                                                    style={{ backgroundColor: color, width: isStart || isEnd ? 'auto' : '100%', minWidth: (isStart || isEnd) ? '12px' : '0' }}
                                                    title={goal.title}
                                                >
                                                    {isStart && !isEnd && <span className="absolute left-[-2px] top-1/2 -translate-y-1/2 text-[8px] text-white">▶</span>}
                                                    {!isStart && isEnd && <span className="absolute right-[-2px] top-1/2 -translate-y-1/2 text-[8px] text-white">◀</span>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Task List */}
                                    <div className="space-y-1">
                                        {dayTasks.map(task => {
                                            const risk = getRiskLevel(task);
                                            return (
                                                <div
                                                    key={task.id}
                                                    className={clsx(
                                                        "text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 truncate transition-colors",
                                                        task.status === 'DONE' ? "bg-emerald-900/10 text-emerald-500 opacity-40 line-through" : "bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200",
                                                        risk === 'HIGH' && task.status !== 'DONE' && "bg-red-950/30 text-red-400 font-bold",
                                                        risk === 'MEDIUM' && task.status !== 'DONE' && "bg-yellow-950/20 text-yellow-500"
                                                    )}
                                                    title={task.title}
                                                >
                                                    <Circle size={8} className={clsx("shrink-0", task.status === 'DONE' ? "text-emerald-500" : "text-zinc-600")} fill="currentColor" />
                                                    <span className="truncate">{task.title}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {isToday(day) && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
