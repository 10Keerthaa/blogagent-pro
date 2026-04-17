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
            className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-10 shrink-0 z-10 sticky top-0 transition-all duration-300"
        >
            {/* ── LEFT: BRANDING ── */}
            <div className="flex-1 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-600 rounded-none flex items-center justify-center shadow-lg shadow-violet-100 dark:shadow-none transition-transform hover:scale-105">
                    <BarChart3 className="text-white w-5 h-5" />
                </div>
                <div className="hidden md:block">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                        10x<span className="text-violet-600">Blogagent</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Enterprise Engine V3.0</p>
                </div>
            </div>

            {/* ── CENTER: TABS ── */}
            <div className="flex items-center gap-8 h-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            h-full px-4 text-[12px] font-bold tracking-tight transition-all duration-200 relative flex items-center
                            ${activeTab === tab.id
                                ? 'text-violet-600'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                        `}
                        aria-selected={activeTab === tab.id}
                        role="tab"
                    >
                        <span className="relative">
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="absolute -top-1.5 -right-3.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></span>
                                </span>
                            )}
                        </span>
                        {/* Underline Indicator */}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-violet-600 rounded-t-full shadow-[0_-2px_6px_rgba(139,92,246,0.2)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* ── RIGHT: ADMIN & PROFILE ── */}
            <div className="flex-1 flex items-center justify-end gap-6">
                {/* Admin Console Pill */}
                {role === 'admin' && (
                    <div className="relative">
                        <button 
                            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 group
                                ${isAdminMenuOpen 
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' 
                                    : 'bg-[#f3e8ff] dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 shadow-sm'}`}
                        >
                            <Shield className={`w-3.5 h-3.5 ${isAdminMenuOpen ? 'text-white' : 'text-violet-700 dark:text-violet-400'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Admin Console</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isAdminMenuOpen && (
                            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 p-1.5 animate-fadeIn z-[100]">
                                <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrative Actions</span>
                                </div>
                                <button 
                                    onClick={() => { setIsPerformanceOpen(true); setIsAdminMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group/item"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover/item:bg-violet-100 transition-colors">
                                        <BarChart3 className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Performance</span>
                                </button>
                                <button 
                                    onClick={() => { setIsTeamManagementOpen(true); setIsAdminMenuOpen(false); }}
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

                {/* Profile Section */}
                <div className="relative">
                    <div
                        className="flex items-center gap-4 cursor-pointer group p-1.5 pl-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-100"
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 leading-none capitalize">{formattedEmail}</span>
                            <span className="text-[9px] text-violet-600 dark:text-violet-400 font-black uppercase tracking-[0.1em] mt-1.5 opacity-80">
                                {displayRole}
                            </span>
                        </div>
                        <div className={`w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner transition-all ${isProfileOpen ? 'ring-2 ring-violet-500/20' : 'group-hover:scale-105'}`}>
                            <User className="w-5 h-5" />
                        </div>
                    </div>

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
                                <span className="text-[10px] font-black uppercase tracking-widest">Log Out Routine</span>
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
