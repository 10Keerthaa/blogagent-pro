'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { User } from 'lucide-react';

export const TabNavigation = () => {
    const { activeTab, setActiveTab, reviewDrafts } = useDashboard();

    const tabs = [
        { id: 'create', label: 'Editor' },
        { id: 'review', label: 'Review', count: reviewDrafts.length },
        { id: 'history', label: 'History' }
    ];

    return (
        <nav
            aria-label="Dashboard Navigation"
            className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-10 shrink-0 z-10 sticky top-0 transition-all duration-300"
        >
            <div className="flex items-center gap-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            px-6 py-2.5 text-[11px] font-bold rounded-xl transition-all duration-200 ease-in-out border
                            ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 shadow-sm shadow-indigo-100/20'
                                : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-200 dark:hover:border-slate-700'}
                        `}
                        aria-selected={activeTab === tab.id}
                        role="tab"
                    >
                        <span className="relative">
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="absolute -top-1 -right-4 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end group cursor-default">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-none">Keerthana Jossy</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 group-hover:text-indigo-600 transition-colors">Elite Editor</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-sm group hover:scale-110 transition-transform">
                    <User className="w-6 h-6" />
                </div>
            </div>
        </nav>
    );
};
