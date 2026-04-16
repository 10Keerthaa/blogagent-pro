'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { User, Shield, BarChart3, Users, ChevronDown } from 'lucide-react';
import { TeamManagement } from './TeamManagement';
import { PerformanceManagement } from './PerformanceManagement';

export const TabNavigation = () => {
    const { 
        activeTab, 
        setActiveTab, 
        reviewDrafts, 
        user, 
        role, 
        handleLogout,
        setIsTeamManagementOpen,
        setIsPerformanceOpen
    } = useDashboard();

    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = React.useState(false);

    const formattedEmail = user?.email?.split('@')[0] || 'User';

    // Improved role display for Admin/Editor
    const displayRole = role?.toLowerCase() === 'admin' ? 'Elite Admin' : 'Elite Editor';

    const tabs = [
        { id: 'create', label: 'Editor' },
        { id: 'review', label: 'Review', count: reviewDrafts.length },
        { id: 'history', label: 'History' }
    ];

    return (
        <nav
            aria-label="Dashboard Navigation"
            className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 transition-all duration-300"
        >
            <div className="flex items-center gap-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            px-6 py-2.5 text-[11px] font-bold rounded-xl transition-all duration-200 ease-in-out border
                            ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/50 shadow-sm shadow-violet-100/20'
                                : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-200 dark:hover:border-slate-700'}
                        `}
                        aria-selected={activeTab === tab.id}
                        role="tab"
                    >
                        <span className="relative">
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="absolute -top-1 -right-4 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-6">
                {/* Admin Mode Toggle (Relocated from Admin tab) */}
                {role === 'admin' && (
                    <div className="relative">
                        <button 
                            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group
                                ${isAdminMenuOpen 
                                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-200/50' 
                                    : 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-100'}`}
                        >
                            <Shield className={`w-3.5 h-3.5 transition-transform ${isAdminMenuOpen ? 'rotate-12' : 'group-hover:rotate-12'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Admin Console</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAdminMenuOpen && (
                            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 p-1.5 animate-fadeIn z-[100]">
                                <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrative Actions</span>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsPerformanceOpen(true);
                                        setIsAdminMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group/item"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover/item:bg-violet-100 transition-colors">
                                        <BarChart3 className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Performance</span>
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsTeamManagementOpen(true);
                                        setIsAdminMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group/item"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover/item:bg-violet-100 transition-colors">
                                        <Users className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Manage Team</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="relative">
                <div
                    className="flex items-center gap-6 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 rounded-2xl transition-all"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-none capitalize">{formattedEmail}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 group-hover:text-violet-600 transition-colors">
                            {displayRole}
                        </span>
                    </div>
                    <div className={`w-10 h-10 rounded-2xl bg-violet-50 dark:bg-slate-900 border border-violet-100 dark:border-slate-800 flex items-center justify-center text-violet-500 dark:text-violet-400 shadow-sm transition-all ${isProfileOpen ? 'ring-2 ring-violet-500/20 scale-105' : 'group-hover:scale-105'}`}>
                        <User className="w-6 h-6" />
                    </div>
                </div>

                {/* Profile Dropdown: Simplified (Logout Only) */}
                {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 p-1.5 animate-fadeIn z-[100]">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all group/logout"
                        >
                            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover/logout:bg-red-100 transition-colors">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </div>
                            <span className="text-xs font-extrabold uppercase tracking-widest">Log Out</span>
                        </button>
                    </div>
                )}
                </div>
            </div>
            
            {/* Global Overlays */}
            <TeamManagement />
            <PerformanceManagement />
        </nav>
    );
};
