'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { X, BarChart2, CheckCircle, Zap, User, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';

export const PerformanceManagement = () => {
    const { 
        isPerformanceOpen, 
        setIsPerformanceOpen, 
        role, 
        users, 
        handleFetchUsers, 
        isFetchingUsers 
    } = useDashboard();
    
    const [report, setReport] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReport = async () => {
        setIsLoading(true);
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
        if (isPerformanceOpen && role === 'admin') {
            fetchReport();
            handleFetchUsers();
        }
    }, [isPerformanceOpen, role]);

    if (!isPerformanceOpen || role !== 'admin') return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-10 animate-fadeIn text-slate-900 dark:text-slate-100">
            {/* Backdrop with Glassmorphism */}
            <div 
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md transition-all"
                onClick={() => setIsPerformanceOpen(false)}
            />

            {/* Modal Content */}
            <Card className="relative w-full max-w-6xl h-[92vh] bg-white dark:bg-[#080808] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden rounded-none">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-emerald-500" />
                            <h2 className="text-[11px] font-bold tracking-[0.2em] text-emerald-500 uppercase">Intelligence Reports</h2>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight font-serif">Performance Analytics</h3>
                    </div>
                    <button 
                        onClick={() => setIsPerformanceOpen(false)}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-6">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 bg-slate-50 dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-slate-800" />
                            ))
                        ) : report.length > 0 ? (
                            report.map((row, idx) => (
                                <div 
                                    key={idx}
                                    className="group p-8 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-8"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm transition-transform group-hover:scale-110">
                                            <User className="w-7 h-7" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">{row.email}</span>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                <span>Active Producer</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                <span className="text-emerald-500/80">Premium Access</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 lg:gap-16">
                                        <div className="flex items-center gap-12">
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Drafts Created</div>
                                                <div className="text-2xl font-black text-slate-900 dark:text-white">{row.total_created || 0}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Live Posts</div>
                                                <div className="text-2xl font-black text-emerald-500">{row.total_published || 0}</div>
                                            </div>
                                        </div>

                                        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Session</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-24 text-center space-y-6">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                    <Zap className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white font-serif">No Activity Detected</h4>
                                    <p className="text-slate-400 font-medium max-w-sm mx-auto italic text-sm">Waiting for the team to initialize generations.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-center gap-4">
                    <CheckCircle className="w-4 h-4 text-emerald-500/50" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">
                        System Integrity Verified &bull; Real-Time Data Stream
                    </p>
                </div>
            </Card>
        </div>
    );
};
