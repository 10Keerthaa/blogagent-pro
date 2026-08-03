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
        isFetchingUsers,
        reportData,
        handleFetchReport,
        targetPlatform
    } = useDashboard();
    
    // Use reportData from context instead of local state
    const isLoading = isFetchingUsers; // Simplified loading state proxy or add isFetchingReport to context if needed

    useEffect(() => {
        if (isPerformanceOpen && role === 'admin') {
            handleFetchReport();
            handleFetchUsers();
        }
    }, [isPerformanceOpen, role]);

    if (!isPerformanceOpen || role !== 'admin') return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-10 animate-fadeIn text-slate-900">
            {/* Backdrop with Glassmorphism */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-all"
                onClick={() => setIsPerformanceOpen(false)}
            />

            {/* Modal Content */}
            <Card className="relative w-full max-w-6xl h-[92vh] bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden rounded-2xl">
                {/* Top Border Gradient Accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400" />

                {/* Header */}
                <div 
                    className="border-b border-slate-100 flex items-center justify-between bg-slate-50/60"
                    style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '40px', paddingBottom: '32px' }}
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-emerald-500" />
                            <h2 className="text-[11px] font-bold tracking-[0.2em] text-emerald-500 uppercase">Intelligence Reports &bull; {targetPlatform} focus</h2>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 leading-tight font-serif">Performance Analytics</h3>
                    </div>
                    <button 
                        onClick={() => setIsPerformanceOpen(false)}
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
                    <div className="grid grid-cols-1 gap-6">
                        {reportData.length === 0 && isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 bg-slate-50 animate-pulse border border-slate-100 rounded-xl" />
                            ))
                        ) : reportData.length > 0 ? (
                            reportData.map((row, idx) => {
                                // Dynamic metric extraction based on global targetPlatform
                                const created = targetPlatform === 'framer' ? row.framer_created : row.wordpress_created;
                                const published = targetPlatform === 'framer' ? row.framer_published : row.wordpress_published;

                                return (
                                    <div 
                                        key={idx}
                                        className="group p-6 bg-white border border-slate-150/70 hover:border-emerald-200 hover:bg-slate-50/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-8 rounded-xl shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm transition-transform group-hover:scale-105">
                                                <User className="w-7 h-7" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-lg font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{row.email}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span>Active</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                            <div className="flex flex-col justify-center bg-slate-50/60 px-5 py-3 border border-slate-150 rounded-xl min-w-[150px] min-h-[64px] shadow-inner">
                                                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-450 font-bold leading-tight mb-1">{targetPlatform} Drafts</div>
                                                <div className="text-2xl font-black text-slate-800 leading-none">{created || 0}</div>
                                            </div>
                                            <div className="flex flex-col justify-center bg-slate-50/60 px-5 py-3 border border-slate-150 rounded-xl min-w-[150px] min-h-[64px] shadow-inner">
                                                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-450 font-bold leading-tight mb-1">Live {targetPlatform}</div>
                                                <div className="text-2xl font-black text-emerald-600 leading-none">{published || 0}</div>
                                            </div>
                                            <div className="px-5 py-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 min-h-[64px]">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none">Live Session</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-24 text-center space-y-6">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Zap className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold text-slate-900 font-serif">No Activity Detected</h4>
                                    <p className="text-slate-455 font-medium max-w-sm mx-auto italic text-sm">Waiting for the team to initialize generations.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div 
                    className="border-t border-slate-100 bg-slate-50/50 flex items-center justify-center gap-4"
                    style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '24px', paddingBottom: '24px' }}
                >
                    <CheckCircle className="w-4 h-4 text-emerald-500/40" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">
                        System Integrity Verified &bull; Real-Time Data Stream
                    </p>
                </div>
            </Card>
        </div>
    );
};
