'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import {
    PlusCircle, ListTodo, PenTool, History, Settings,
    LogOut, User as UserIcon, Sparkles
} from 'lucide-react';

export const Sidebar = () => {
    const { activeTab, setActiveTab, reviewDrafts } = useDashboard();

    const menuItems = [
        { id: 'create', label: 'Create Post', icon: PlusCircle },
        { id: 'review', label: 'Review Queue', icon: ListTodo, count: reviewDrafts.length },
        { id: 'editor', label: 'Editor Workspace', icon: PenTool },
        { id: 'history', label: 'History/Published', icon: History },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <aside className="w-[280px] h-screen fixed left-0 top-0 bg-white dark:bg-[#0a0a0a] border-r border-slate-100 dark:border-slate-900 flex flex-col z-50">
            {/* Branding */}
            <div className="p-8 pb-10">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">BlogAgent</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest leading-none mt-1">Pro Edition</p>
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-4 mb-4 mt-2">Main Menu</div>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`
                                w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all duration-300 group
                                ${isActive
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 ring-1 ring-white/10'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors`} />
                                <span>{item.label}</span>
                            </div>

                            {item.count !== undefined && item.count > 0 && !isActive && (
                                <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800 animate-pulse">
                                    {item.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User Profile / Footer */}
            <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-4 px-2 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                        <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-none mb-1">Keerthana Jossy</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Elite Editor</p>
                    </div>
                </div>

                <button className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-bold text-[10px] uppercase tracking-widest">
                    <LogOut className="w-4 h-4" />
                    Logout Account
                </button>
            </div>
        </aside>
    );
};
