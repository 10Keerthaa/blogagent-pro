'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { User, Shield, BarChart3, Users, ChevronDown, Zap, Plus } from 'lucide-react';
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
        setIsPerformanceOpen,
        handleClearForm,
        selectedReviewDraft
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
            className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 grid grid-cols-3 px-10 shrink-0 z-40 sticky top-0 transition-all duration-300"
        >
            {/* WING 1: Branding Logo (Left) */}
            <div className="flex items-center">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-10 h-10 rounded-none bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-none transition-transform group-hover:scale-105">
                        <Zap className="text-white w-6 h-6 fill-current" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[17px] font-black tracking-tight text-slate-800 dark:text-white leading-tight">10x<span className="text-violet-600">Blogagent</span></span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-tight">Enterprise Engine v3.0</span>
                    </div>
                </div>

                {/* NEW POST ACTION (Hoisted to Header) */}
                <button
                    onClick={() => {
                        handleClearForm();
                        setActiveTab('create');
                    }}
                    className="ml-6 flex items-center gap-1.5 px-3 py-1.5 text-violet-600 hover:text-violet-700 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest transition-all group/new"
                >
                    <Plus className="w-3.5 h-3.5 transition-transform group-hover/new:rotate-90" />
                    New Post
                </button>
            </div>

            {/* WING 2: Underline Tabs (True Center Pillar) */}
            <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-10 h-full relative">
                    {tabs.map((tab) => {
                        const isDisabled = !!selectedReviewDraft && activeTab === 'review' && tab.id !== 'review';
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                                disabled={isDisabled}
                                className={`relative h-full flex items-center px-2 transition-all duration-300 group ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                            >
                                <span className={`text-xs font-bold tracking-tight transition-colors duration-300 ${activeTab === tab.id ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className="absolute -top-1 -right-2 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
                                        </span>
                                    )}
                                </span>
                                
                                {/* THE ELITE UNDERLINE */}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-violet-600 rounded-t-full animate-fadeIn" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* WING 3: Controls (Right Wing) */}
            <div className="flex items-center justify-end gap-8">
                {/* ADMIN CONSOLE PILL */}
                {role === 'admin' && (
                    <div className="relative">
                        <button 
                            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                            className={`flex items-center gap-3 px-6 py-2 rounded-full border transition-all duration-500 group shadow-sm
                                ${isAdminMenuOpen 
                                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-200/50' 
                                    : 'bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800 hover:bg-violet-100'}`}
                        >
                            <Shield className={`w-3.5 h-3.5 ${isAdminMenuOpen ? 'text-white' : 'text-violet-600'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isAdminMenuOpen ? 'text-white' : 'text-violet-600'}`}>Admin Console</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isAdminMenuOpen ? 'rotate-180 text-white' : 'text-violet-400'}`} />
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
                        className="flex items-center gap-4 cursor-pointer group p-1 transition-all"
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-200 leading-none capitalize">{formattedEmail}</span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500 mt-1.5 group-hover:text-violet-600 transition-colors">
                                {displayRole}
                            </span>
                        </div>
                        <div className={`w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent flex items-center justify-center text-slate-400 transition-all ${isProfileOpen ? 'ring-2 ring-violet-500 border-white shadow-lg' : 'group-hover:scale-105'}`}>
                            <User className="w-6 h-6" />
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
