"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { LayoutDashboard, CheckSquare, LogOut, Disc } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, loading, error, initialized, init, signInAnonymously, logout } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const unsub = init();
        return () => unsub();
    }, [init]);

    const handleLogin = async () => {
        await signInAnonymously();
    };

    if (loading && !initialized) {
        return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading Manda-Task...</div>;
    }

    if (!user) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white gap-6">
                <div className="text-4xl font-bold tracking-tighter flex items-center gap-2">
                    <Disc className="h-10 w-10 text-orange-500" /> Manda-Task
                </div>
                <p className="text-zinc-400 max-w-md text-center">
                    A fractal project management tool structured by Mandalart charts.
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-md max-w-md text-center text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition disabled:opacity-50"
                >
                    {loading ? 'Signing in...' : 'Start Demo (Anonymous)'}
                </button>
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
