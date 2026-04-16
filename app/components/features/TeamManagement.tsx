'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { X, Shield, User, Loader2, ChevronDown, Check, Trash2, Plus, UserPlus } from 'lucide-react';
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
        handleFetchReport,
        handleAddUser,
        handleDeleteUser,
        user: currentUser
    } = useDashboard();
    
    const [newEmail, setNewEmail] = React.useState('');
    const [newRole, setNewRole] = React.useState('editor');
    const [isAdding, setIsAdding] = React.useState(false);
    const [deletingUserId, setDeletingUserId] = React.useState<string | null>(null);

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

    const onAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;
        setIsAdding(true);
        const success = await handleAddUser(newEmail, newRole);
        if (success) {
            setNewEmail('');
            setNewRole('editor');
        }
        setIsAdding(false);
    };

    const onDeleteUser = async (userId: string) => {
        if (!window.confirm("Are you sure you want to remove this team member? This action cannot be undone.")) return;
        setDeletingUserId(userId);
        await handleDeleteUser(userId);
        setDeletingUserId(null);
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
                            <Shield className="w-4 h-4 text-violet-500" />
                            <h2 className="text-[11px] font-bold tracking-[0.2em] text-violet-500 uppercase">Executive Controls</h2>
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

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Add Member Bar */}
                    <div className="mb-10 p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-end gap-6 group/add">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add New Team Member</label>
                            <input 
                                type="email"
                                placeholder="Enter email address..."
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-slate-700 dark:text-slate-300"
                            />
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Role</label>
                            <div className="relative">
                                <select 
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all uppercase tracking-widest text-slate-700 dark:text-slate-300"
                                >
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <button 
                            onClick={onAddUser}
                            disabled={isAdding || !newEmail}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                        >
                            {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Grant Access
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {isFetchingUsers ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-24 bg-slate-50 dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-slate-800" />
                            ))
                        ) : users.length > 0 ? (
                            users.map((u) => (
                                <div 
                                    key={u.id}
                                    className="group p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 hover:border-violet-200 dark:hover:border-violet-900/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm transition-transform group-hover:scale-110">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-bold text-slate-900 dark:text-slate-200">{u.email}</span>
                                                {u.role === 'admin' && (
                                                    <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[9px] font-black uppercase tracking-widest leading-none">Admin</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                                <span>UUID: {u.id.slice(0, 8)}...</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span>Status: Optimized</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 lg:gap-8">
                                        {/* Role Switcher */}
                                        <div className="flex flex-col min-w-[140px]">
                                            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">Authority Level</div>
                                            <div className="relative">
                                                <select 
                                                    value={u.role || 'editor'}
                                                    onChange={(e) => onRoleChange(u.id, e.target.value)}
                                                    disabled={(isUpdatingRole && updatingUserId === u.id)}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 transition-all uppercase tracking-widest"
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

                                        {/* Delete Action */}
                                        {u.id !== currentUser?.uid && (
                                            <div className="flex flex-col items-center">
                                                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2 opacity-0">Action</div>
                                                <button 
                                                    onClick={() => onDeleteUser(u.id)}
                                                    disabled={deletingUserId === u.id}
                                                    className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/50 transition-all group/del"
                                                    title="Remove Access"
                                                >
                                                    {deletingUserId === u.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4 transition-transform group-hover/del:scale-110" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
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
                        &copy; 2026 10xBlogagent &bull; Security Cleared: Level 5
                    </p>
                </div>
            </Card>
        </div>
    );
};
