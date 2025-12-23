"use client";

import React, { useEffect, useState } from 'react';
import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, differenceInDays, isBefore, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';
import { Node } from '@/lib/types';

export default function CalendarPage({ params }: { params: Promise<{ projectId: string }> }) {
    const resolvedParams = React.use(params);
    const { subscribeNodes, getAllTasks, loading } = useProjectNodesStore();
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const unsub = subscribeNodes(resolvedParams.projectId);
        return () => unsub();
    }, [resolvedParams.projectId, subscribeNodes]);

    const tasks = getAllTasks();

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Handle "padding" days for grid alignment
    const startDayOfWeek = monthStart.getDay(); // 0 (Sun) - 6 (Sat)
    const paddingDays = Array.from({ length: startDayOfWeek });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    // Risk Analysis Helper
    const getRiskLevel = (task: Node) => {
        if (!task.dateRange?.endDate || !task.taskConfig?.estimatedDuration) return null;
        if (task.status === 'DONE') return null;

        const endDate = new Date(task.dateRange.endDate);
        const daysRemaining = differenceInDays(endDate, new Date());

        // Estimated Duration is in minutes. Convert to days (rough 8h work day? or 24h?)
        // Let's assume 8h work day for estimation risk
        const estimatedHours = task.taskConfig.estimatedDuration / 60;
        const estimatedWorkDays = estimatedHours / 8;

        // Risk Logic:
        // High Risk: Days Remaining < Estimated Work Days (You don't have enough time)
        // Medium Risk: Days Remaining < Estimated Work Days * 1.5 (Tight)

        if (daysRemaining < estimatedWorkDays) return 'HIGH';
        if (daysRemaining < estimatedWorkDays * 1.5) return 'MEDIUM';
        return 'LOW';
    };

    return (
        <div className="h-full flex flex-col text-white">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="text-orange-500" />
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex bg-zinc-800 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-zinc-700 rounded"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold hover:bg-zinc-700 rounded">Today</button>
                        <button onClick={nextMonth} className="p-1 hover:bg-zinc-700 rounded"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span> High Risk</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Medium Risk</div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                {/* Days Header */}
                <div className="grid grid-cols-7 bg-zinc-950 border-b border-zinc-800">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-2 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {/* Padding Days */}
                    {paddingDays.map((_, i) => (
                        <div key={`pad-${i}`} className="bg-zinc-900/50 border-b border-r border-zinc-800/50" />
                    ))}

                    {/* Actual Days */}
                    {calendarDays.map((day) => {
                        // Find tasks for this day (either Start, End, or In-between? Usually Calendar shows "Due" or "Spans")
                        // Let's show tasks that are ACTIVE on this day (overlap), OR just Due Date?
                        // "프로젝트 캘린더" usually implies Gantt-like span or Due Dates.
                        // "기한" emphasis suggests showing Due Dates is critical.
                        // Let's list tasks that END on this day, or maybe start?
                        // A safer bet for a monthly view is "Tasks spanning this day" might be too crowded.
                        // Let's show tasks that have this day within their range.

                        const dayTasks = tasks.filter(t => {
                            if (!t.dateRange) return false;
                            const start = new Date(t.dateRange.startDate);
                            const end = new Date(t.dateRange.endDate);
                            // Normalize time
                            start.setHours(0, 0, 0, 0);
                            end.setHours(0, 0, 0, 0);
                            // Check overlap
                            return day >= start && day <= end;
                        });

                        return (
                            <div
                                key={day.toString()}
                                className={clsx(
                                    "min-h-[100px] bg-zinc-900 border-b border-r border-zinc-800 p-2 transition hover:bg-zinc-800/50 relative group",
                                    isToday(day) && "bg-zinc-800/30"
                                )}
                            >
                                <div className={clsx(
                                    "text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday(day) ? "bg-orange-500 text-white" : "text-zinc-500"
                                )}>
                                    {format(day, 'd')}
                                </div>

                                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                    {dayTasks.map(task => {
                                        const risk = getRiskLevel(task);
                                        const isDueToday = task.dateRange?.endDate && isSameDay(new Date(task.dateRange?.endDate), day);

                                        return (
                                            <div
                                                key={task.id}
                                                className={clsx(
                                                    "text-xs px-1.5 py-1 rounded truncate flex items-center gap-1 border border-transparent",
                                                    task.status === 'DONE' ? "bg-emerald-900/30 text-emerald-400 line-through opacity-50" : "bg-zinc-800 text-zinc-300",
                                                    risk === 'HIGH' && task.status !== 'DONE' && "border-red-500/50 bg-red-900/10 text-red-200",
                                                    risk === 'MEDIUM' && task.status !== 'DONE' && "border-yellow-500/30 text-yellow-200"
                                                )}
                                                title={`${task.title} (${task.status})`}
                                            >
                                                {risk === 'HIGH' && <AlertTriangle size={10} className="text-red-500 shrink-0 animate-pulse" />}
                                                {isDueToday && <Clock size={10} className="text-orange-400 shrink-0" />}
                                                <span className="truncate">{task.title}</span>
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
