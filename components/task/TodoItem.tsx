"use client";

import { Node, Project } from '@/lib/types';
import { format } from 'date-fns';
import { CheckCircle, Circle, ArrowRight, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

interface TodoItemProps {
    task: Node;
    project: Project | undefined;
    onToggle: () => void;
    onIncrement: () => void;
    onJump: () => void;
}

export default function TodoItem({ task, project, onToggle, onIncrement, onJump }: TodoItemProps) {
    const isDone = task.status === 'DONE';
    const isRecurring = task.taskConfig?.isRecurring;

    return (
        <div className="group bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition">
            <div className="flex items-center gap-4 py-8">
                <button
                    onClick={onToggle}
                    className={clsx(
                        "flex-shrink-0 transition-colors",
                        isDone ? "text-emerald-500" : "text-zinc-600 group-hover:text-zinc-400"
                    )}
                >
                    {isDone ? <CheckCircle size={24} /> : <Circle size={24} />}
                </button>

                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {project && (
                            <span
                                className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-white"
                                style={{ backgroundColor: project.colorTag || '#333' }}
                            >
                                {project.title}
                            </span>
                        )}
                        {task.taskConfig?.dueDate && (
                            <span className={clsx(
                                "text-xs font-medium",
                                new Date(task.taskConfig.dueDate) < new Date() && !isDone ? "text-red-400" : "text-zinc-500"
                            )}>
                                Due {format(new Date(task.taskConfig.dueDate), 'MMM d')}
                            </span>
                        )}
                    </div>
                    <h3 className={clsx(
                        "font-medium text-base",
                        isDone ? "text-zinc-500 line-through" : "text-zinc-200"
                    )}>
                        {task.title}
                    </h3>

                    {/* Recurring Progress Bar */}
                    {isRecurring && (
                        <div className="mt-2 w-32">
                            <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
                                <span>{task.taskConfig?.currentCount} / {task.taskConfig?.targetCount}</span>
                                <span>{task.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 transition-all" style={{ width: `${task.progress}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isRecurring && !isDone && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onIncrement(); }}
                        className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition"
                    >
                        <RotateCcw size={12} /> +1
                    </button>
                )}

                <button
                    onClick={onJump}
                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                    title="Jump to Board"
                >
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}
