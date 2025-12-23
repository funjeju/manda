"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { collectionGroup, query, where, onSnapshot, getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Node } from '@/lib/types';
import TodoItem from '@/components/task/TodoItem';
import { useRouter } from 'next/navigation';
import { Loader2, SlidersHorizontal, ArrowDownWideNarrow, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

export default function GlobalTodoPage() {
    const { user } = useAuthStore();
    const { projects, subscribeProjects } = useProjectsStore();
    const router = useRouter();

    const [tasks, setTasks] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);

    // Sort/Filter state
    const [sortBy, setSortBy] = useState<'DUE_DATE' | 'CREATED' | 'PROJECT'>('DUE_DATE');
    const [hideDone, setHideDone] = useState(false);

    // 1. Subscribe projects first (to map projectId -> Project)
    useEffect(() => {
        if (user) {
            subscribeProjects(user.uid, user.isAnonymous);
        }
    }, [user, subscribeProjects]);

    // 2. Subscribe "Global" Tasks
    // Note: In a real app with proper permissions, we'd rely on security rules.
    // Here we assume we can query filtering by 'nodeType' == 'TASK'.
    // Depending on Firestore indexes, this might require an index creation for (nodeType + dueDate) etc.
    // For MVP prototype, we handle this gracefully - if index error, check console.
    useEffect(() => {
        if (!user) return;

        const q = query(
            collectionGroup(db, 'nodes'),
            where('nodeType', '==', 'TASK')
        );

        // Note: We ideally filter by owner via rules or by joining with projectIds.
        // Since map/reduce client side is easier now:
        const unsub = onSnapshot(q, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(d => d.data() as Node);
            // Filter tasks belonging to my projects only by checking 'projects' store? 
            // Or just show all if we assume single-user-ish env for prototype.
            // To be safe: we filter tasks where `projectId` is in `projects.map(p=>p.id)`.
            // But `projects` loads async.

            setTasks(fetchedTasks);
            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    // Process Tasks (Filter & Sort)
    const myProjectIds = projects.map(p => p.id);
    const filteredTasks = tasks
        .filter(t => myProjectIds.includes(t.projectId))
        .filter(t => !hideDone || t.status !== 'DONE');

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortBy === 'DUE_DATE') {
            const d1 = a.taskConfig?.dueDate || '9999-99-99';
            const d2 = b.taskConfig?.dueDate || '9999-99-99';
            return d1.localeCompare(d2);
        } else if (sortBy === 'CREATED') {
            return b.createdAt.localeCompare(a.createdAt);
        } else if (sortBy === 'PROJECT') {
            return a.projectId.localeCompare(b.projectId);
        }
        return 0;
    });

    const handleUpdate = async (task: Node, patch: Partial<Node>) => {
        const ref = doc(db, `projects/${task.projectId}/nodes`, task.id);
        await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
    };

    const handleToggle = (task: Node) => {
        const newStatus = task.status === 'DONE' ? 'IN_PROGRESS' : 'DONE';
        const progress = newStatus === 'DONE' ? 100 : (task.taskConfig?.isRecurring ? task.progress : 0); // Reset for normal task
        handleUpdate(task, { status: newStatus, progress });
    };

    const handleIncrement = (task: Node) => {
        if (!task.taskConfig?.isRecurring) return;

        const current = (task.taskConfig.currentCount || 0) + 1;
        const target = task.taskConfig.targetCount || 1;
        const progress = Math.min(100, Math.floor((current / target) * 100));
        const status = progress >= 100 ? 'DONE' : task.status;

        // Update nested object taskConfig is tricky with dot notation in firestore 'taskConfig.currentCount'
        // But updateDoc supports dot notation!
        handleUpdate(task, {
            'taskConfig.currentCount': current,
            progress,
            status
        } as any);
    };

    const handleJump = (task: Node) => {
        router.push(`/projects/${task.projectId}/mandalart?target=${task.id}`);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto w-full">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Global Todo</h1>
                    <p className="text-zinc-400">All your actionable tasks in one place.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        <button
                            onClick={() => setSortBy('DUE_DATE')}
                            className={clsx("px-3 py-1.5 rounded text-xs font-medium transition", sortBy === 'DUE_DATE' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
                        >
                            Due Date
                        </button>
                        <button
                            onClick={() => setSortBy('PROJECT')}
                            className={clsx("px-3 py-1.5 rounded text-xs font-medium transition", sortBy === 'PROJECT' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
                        >
                            Project
                        </button>
                    </div>
                    <button
                        onClick={() => setHideDone(!hideDone)}
                        className={clsx("text-xs font-medium px-3 py-2 rounded-lg border transition", hideDone ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500")}
                    >
                        Hide Done
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-orange-500" />
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedTasks.length === 0 ? (
                        <div className="text-center py-20 text-zinc-500 border-2 border-dashed border-zinc-900 rounded-xl">
                            No tasks found. Go create a project and add some tasks!
                        </div>
                    ) : (
                        sortedTasks.map(task => (
                            <TodoItem
                                key={task.id}
                                task={task}
                                project={projects.find(p => p.id === task.projectId)}
                                onToggle={() => handleToggle(task)}
                                onIncrement={() => handleIncrement(task)}
                                onJump={() => handleJump(task)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
