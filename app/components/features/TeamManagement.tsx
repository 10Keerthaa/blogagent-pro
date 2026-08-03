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
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-all"
                onClick={() => setIsTeamManagementOpen(false)}
            />

            {/* Modal Content */}
            <Card className="relative w-full max-w-5xl h-[90vh] bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden rounded-2xl">
                {/* Top Border Gradient Accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-400" />

                {/* Header */}
                <div 
                    className="border-b border-slate-100 flex items-center justify-between bg-slate-50/60"
                    style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '40px', paddingBottom: '32px' }}
                >
                    <h3 className="text-2xl font-bold text-slate-900 leading-tight font-serif">Team Management</h3>
                    <button 
                        onClick={() => setIsTeamManagementOpen(false)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-400 hover:text-slate-700 transition-all rounded-xl"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content */}
                <div 
                    className="flex-1 overflow-y-auto custom-scrollbar"
                    style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '32px', paddingBottom: '32px' }}
                >
                    {/* Add Member Bar */}
                    <div className="mb-10 p-6 bg-slate-50 border border-slate-150 grid grid-cols-1 md:grid-cols-12 gap-4 items-end group/add rounded-xl shadow-sm">
                        <div className="md:col-span-7 space-y-2 w-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Add New Team Member</label>
                            <div className="relative">
                                <input 
                                    type="email"
                                    placeholder="Enter email address..."
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    style={{ paddingLeft: '2.75rem' }}
                                    className="w-full h-[46px] bg-white border border-slate-200 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-slate-700 placeholder-slate-405 rounded-lg focus:border-violet-500/40"
                                />
                                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2 w-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-455">Assigned Role</label>
                            <div className="relative">
                                <select 
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full h-[46px] bg-white border border-slate-200 px-4 py-3 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all uppercase tracking-widest text-slate-700 rounded-lg focus:border-violet-500/40"
                                >
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-450 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-3 w-full">
                            <button 
                                onClick={onAddUser}
                                disabled={isAdding || !newEmail}
                                className="w-full h-[46px] bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-md shadow-violet-500/20 rounded-lg"
                            >
                                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Grant Access
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {isFetchingUsers ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-24 bg-slate-50 animate-pulse border border-slate-100 rounded-xl" />
                            ))
                        ) : users.length > 0 ? (
                            users.map((u) => (
                                <div 
                                    key={u.id}
                                    className="group p-6 bg-white border border-slate-150/70 hover:border-violet-200 hover:bg-slate-50/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-xl shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm transition-transform group-hover:scale-105">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-base font-bold text-slate-800 group-hover:text-violet-600 transition-colors">{u.email}</span>
                                                {u.role === 'admin' && (
                                                    <span className="px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 text-[9px] font-black uppercase tracking-widest leading-none rounded-full">Admin</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-450 font-medium">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Status: Optimized</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 lg:gap-8">
                                        {/* Role Switcher */}
                                        <div className="flex flex-col min-w-[140px]">
                                            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-455 font-bold mb-2">Authority Level</div>
                                            <div className="relative">
                                                <select 
                                                    value={u.role || 'editor'}
                                                    onChange={(e) => onRoleChange(u.id, e.target.value)}
                                                    disabled={(isUpdatingRole && updatingUserId === u.id)}
                                                    className="w-full bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 transition-all uppercase tracking-widest rounded-lg focus:border-violet-500/40"
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
                                                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-450 font-bold mb-2 opacity-0">Action</div>
                                                <button 
                                                    onClick={() => onDeleteUser(u.id)}
                                                    disabled={deletingUserId === u.id}
                                                    className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 transition-all rounded-lg group/del"
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
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <User className="w-8 h-8" />
                                </div>
                                <p className="text-slate-400 font-medium italic">No other team members detected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div 
                    className="border-t border-slate-100 bg-slate-50/50 text-center"
                    style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '24px', paddingBottom: '24px' }}
                >
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                        &copy; 2026 10xBlogAgent &bull; Security Cleared: Level 5
                    </p>
                </div>
            </Card>
        </div>
    );
};
