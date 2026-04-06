'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Card } from '../ui/Card';
import { Users, BarChart2, CheckCircle } from 'lucide-react';

export const AdminTracking = () => {
    const { role, users, handleFetchUsers, isFetchingUsers } = useDashboard();
    const [report, setReport] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<'performance' | 'team'>('performance');

    const fetchReport = async () => {
        try {
            const { auth } = await import('../../lib/firebase');
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            
            const r = await fetch('/api/admin/report', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const d = await r.json();
            setReport(d.report || []);
        } catch (e) {
            console.error('Fetch Report Error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'admin') {
            fetchReport();
            handleFetchUsers();
        }
    }, [role]);

    if (role !== 'admin') return null;

    return (
        <section className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800 w-full">
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">Team Performance</h2>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight font-serif">User Activity Tracking</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-none border border-slate-200 dark:border-slate-800">
                            <button 
                                onClick={() => setActiveView('performance')}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'performance' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Performance
                            </button>
                            <button 
                                onClick={() => setActiveView('team')}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'team' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Team Management
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/30">
                            <Users className="w-3.5 h-3.5" />
                            Admin View Mode
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xl rounded-none">
                    <div className="overflow-x-auto">
                        {activeView === 'performance' ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">User Email</th>
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Items Created</th>
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Items Published</th>
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-8 py-6"><div className="h-4 w-48 bg-slate-100 dark:bg-slate-800" /></td>
                                                <td className="px-8 py-6"><div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 mx-auto" /></td>
                                                <td className="px-8 py-6"><div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 mx-auto" /></td>
                                                <td className="px-8 py-6"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 ml-auto" /></td>
                                            </tr>
                                        ))
                                    ) : report.length > 0 ? (
                                        report.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                                                            {row.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                                                            {row.email}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-flex items-center px-4 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-none">
                                                        {row.total_created || 0}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="inline-flex items-center px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-none">
                                                        {row.total_published || 0}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                                                        <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Active Now</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic text-sm">
                                                No user activity recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Member</th>
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Level / Role</th>
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Total Production</th>
                                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Access Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {isFetchingUsers ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-8 py-6"><div className="h-4 w-48 bg-slate-100 dark:bg-slate-800" /></td>
                                                <td className="px-8 py-6"><div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 mx-auto" /></td>
                                                <td className="px-8 py-6"><div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 mx-auto" /></td>
                                                <td className="px-8 py-6"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 ml-auto" /></td>
                                            </tr>
                                        ))
                                    ) : users.length > 0 ? (
                                        users.map((u, idx) => {
                                            const stats = report.find(r => r.email === u.email);
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                                                                {u.email?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                    {u.email}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                                                                    ID: {u.id.slice(0, 8)}...
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-none border ${
                                                            u.role === 'admin' 
                                                            ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' 
                                                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                                        }`}>
                                                            {u.role || 'editor'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                                            {stats?.total_created || 0} Items
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Authorized</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic text-sm">
                                                No team members found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </section>
    );
};
