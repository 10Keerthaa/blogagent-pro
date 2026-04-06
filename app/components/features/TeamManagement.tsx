'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { X, Shield, User, Loader2, ChevronDown, Check } from 'lucide-react';
import { Card } from '../ui/Card';

export const TeamManagement = () => {
    const { 
        isTeamManagementOpen, 
        setIsTeamManagementOpen, 
        users, 
        isFetchingUsers, 
        handleUpdateUserRole, 
        isUpdatingRole,
        handleFetchUsers,
        reportData,
        handleFetchReport
    } = useDashboard();

    const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (isTeamManagementOpen) {
            handleFetchUsers();
            handleFetchReport();
        }
    }, [isTeamManagementOpen]);

    if (!isTeamManagementOpen) return null;

    const ROLES = ['admin', 'editor', 'viewer'];

    const onRoleChange = async (userId: string, newRole: string) => {
        setUpdatingUserId(userId);
        await handleUpdateUserRole(userId, newRole);
        setUpdatingUserId(null);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-10 animate-fadeIn">
            {/* Backdrop with Glassmorphism */}
            <div 
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-all"
                onClick={() => setIsTeamManagementOpen(false)}
            />

            {/* Modal Content */}
            <Card className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-[#0d0d0d] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden rounded-none">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">Executive Controls</h2>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight font-serif">Team Management</h3>
                    </div>
                    <button 
                        onClick={() => setIsTeamManagementOpen(false)}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-4">
                        {isFetchingUsers ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-24 bg-slate-50 dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-slate-800" />
                            ))
                        ) : users.length > 0 ? (
                            users.map((u) => (
                                <div 
                                    key={u.id}
                                    className="group p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm transition-transform group-hover:scale-110">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-bold text-slate-900 dark:text-slate-200">{u.email}</span>
                                                {u.role === 'admin' && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-widest leading-none">Admin</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                                <span>UUID: {u.id.slice(0, 8)}...</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span>Status: Optimized</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 lg:gap-10">
                                        {/* Performance Mini-Stats */}
                                        <div className="hidden sm:flex items-center gap-6">
                                            {(() => {
                                                const stats = reportData.find(r => r.email === u.email);
                                                return (
                                                    <>
                                                        <div className="text-center px-4 border-r border-slate-100 dark:border-slate-800">
                                                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Created</div>
                                                            <div className="text-sm font-black text-slate-700 dark:text-slate-300">{stats?.total_created || 0}</div>
                                                        </div>
                                                        <div className="text-center px-4">
                                                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Approved</div>
                                                            <div className="text-sm font-black text-emerald-500">{stats?.total_published || 0}</div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Role Switcher */}
                                        <div className="flex flex-col min-w-[140px]">
                                            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">Authority Level</div>
                                            <div className="relative">
                                                <select 
                                                    value={u.role || 'editor'}
                                                    onChange={(e) => onRoleChange(u.id, e.target.value)}
                                                    disabled={isUpdatingRole && updatingUserId === u.id}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all uppercase tracking-widest"
                                                >
                                                    {ROLES.map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none text-slate-400">
                                                    {isUpdatingRole && updatingUserId === u.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <ChevronDown className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <User className="w-8 h-8" />
                                </div>
                                <p className="text-slate-400 font-medium italic">No other team members detected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                        &copy; 2026 BlogAgent Pro &bull; Security Cleared: Level 5
                    </p>
                </div>
            </Card>
        </div>
    );
};
