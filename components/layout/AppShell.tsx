"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { LayoutDashboard, CheckSquare, LogOut, Disc, Eye, UserPlus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useState } from 'react';
import AuthModal from '@/components/auth/AuthModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, loading, error, initialized, init, signInAnonymously, logout } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    useEffect(() => {
        const unsub = init();
        return () => unsub();
    }, [init]);

    const handleSampleView = async () => {
        await signInAnonymously();
    };

    if (loading && !initialized) {
        return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white font-medium animate-pulse">Loading Manda-Task...</div>;
    }

    if (!user) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white p-6 overflow-hidden relative">
                {/* Background Decoration */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center max-w-2xl text-center">
                    <div className="mb-8 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl inline-flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Disc className="h-10 w-10 text-orange-500 animate-spin-slow" />
                        <span className="text-4xl font-black tracking-tighter">Manda-Task</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
                        Visualize Your Goals with <span className="text-orange-500">Mandalart</span>
                    </h1>

                    <p className="text-zinc-400 text-lg mb-12 max-w-lg mx-auto">
                        Manage your fractal projects and tasks structured by the elegant Mandalart architecture.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleSampleView}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 border border-zinc-800 transition shadow-xl disabled:opacity-50 group hover:-translate-y-0.5"
                        >
                            <Eye size={20} className="text-zinc-400 group-hover:text-white transition-colors" />
                            {loading ? 'Entering...' : 'View Sample'}
                        </button>

                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-500 transition shadow-xl shadow-orange-900/20 hover:-translate-y-0.5"
                        >
                            <UserPlus size={20} />
                            Get Started
                        </button>
                    </div>

                    {error && (
                        <div className="mt-8 bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm max-w-md">
                            {error}
                        </div>
                    )}
                </div>

                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            </div>
        );
    }

    const navItems = [
        { label: 'Projects', href: '/', icon: LayoutDashboard },
        { label: 'Global Todo', href: '/todos', icon: CheckSquare },
    ];

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 flex-col lg:flex-row overflow-hidden">
            {/* Mobile Header */}
            <header className="flex lg:hidden items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                    <Disc className="h-5 w-5 text-orange-500" /> Manda-Task
                </div>
                <button onClick={() => logout()} className="p-2 text-zinc-400 hover:text-white transition-colors">
                    <LogOut size={18} />
                </button>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 border-r border-zinc-800 flex-col">
                <div className="p-6 flex items-center gap-2 font-bold text-xl tracking-tight">
                    <Disc className="h-6 w-6 text-orange-500" /> Manda-Task
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                )}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-500 truncate max-w-[120px]">
                            {user.isAnonymous ? 'Guest User' : user.email}
                        </div>
                        <button onClick={() => logout()} className="text-zinc-400 hover:text-white">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col relative pb-16 lg:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-lg z-50 items-center justify-around px-6">
                {navItems.map((item) => {
                    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex flex-col items-center gap-1 transition-colors px-4 py-1 rounded-lg",
                                isActive ? "text-orange-500" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
