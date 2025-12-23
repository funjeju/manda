"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutGrid, GanttChartSquare, FolderTree, Calendar, History } from 'lucide-react';

import { use } from 'react';

export default function ProjectLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ projectId: string }>;
}) {
    const pathname = usePathname();
    const { projectId } = use(params);

    const tabs = [
        { label: 'Mandalart', href: `/projects/${projectId}/mandalart`, icon: LayoutGrid },
        { label: 'Tree View', href: `/projects/${projectId}/tree`, icon: FolderTree },
        { label: 'Gantt', href: `/projects/${projectId}/gantt`, icon: GanttChartSquare },
        { label: 'Calendar', href: `/projects/${projectId}/calendar`, icon: Calendar },
        { label: 'Logs & Approvals', href: `/projects/${projectId}/logs`, icon: History },
    ];

    return (
        <div className="flex flex-col h-full">
            <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex space-x-1">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                    isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </header>
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
}
