'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Globe, Calendar, ExternalLink } from 'lucide-react';

const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
        let d: Date;
        if (date && typeof date === 'object') {
            if ('seconds' in date) d = new Date(date.seconds * 1000);
            else if ('_seconds' in date) d = new Date(date._seconds * 1000);
            else d = new Date(date);
        } else {
            d = new Date(date);
        }

        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString();
    } catch (e) {
        return 'N/A';
    }
};

const formatDateTime = (date: any) => {
    if (!date) return 'N/A';
    try {
        let d: Date;
        if (date && typeof date === 'object') {
            if ('seconds' in date) d = new Date(date.seconds * 1000);
            else if ('_seconds' in date) d = new Date(date._seconds * 1000);
            else d = new Date(date);
        } else {
            d = new Date(date);
        }

        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
        return 'N/A';
    }
};

export const HistoryList = () => {
    const { history, handleSelectHistoryItem, selectedHistoryItem } = useDashboard();

    if (selectedHistoryItem) {
        return (
            <div className="animate-fadeIn w-full pb-24 space-y-10 px-4 lg:px-8">
                {/* Header with Return Button */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
                    <div className="space-y-1">
                        <Badge variant="success" className="mb-2">Published Archive</Badge>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {selectedHistoryItem.title}
                        </h2>
                    </div>
                    <button 
                        onClick={() => handleSelectHistoryItem(null)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all duration-500 shadow-sm"
                    >
                        <Globe className="w-4 h-4" />
                        Return to archives
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-10">
                    {/* Meta Info Section (Read Only) */}
                    <section className="space-y-8">
                        <div className="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wide mb-8">Article Metadata</h3>
                            <div className="space-y-8 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {selectedHistoryItem.primaryKeyword && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Primary Keyword</p>
                                            <p className="text-slate-900 dark:text-white font-semibold text-base">{selectedHistoryItem.primaryKeyword}</p>
                                        </div>
                                    )}
                                    { (selectedHistoryItem.date || selectedHistoryItem.published_at || selectedHistoryItem.last_edited_at || selectedHistoryItem.createdAt) && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Publication Date</p>
                                            <p className="text-slate-900 dark:text-white font-semibold text-base">{formatDate(selectedHistoryItem.date || selectedHistoryItem.published_at || selectedHistoryItem.last_edited_at || selectedHistoryItem.createdAt)}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Meta Description</p>
                                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-500 italic leading-relaxed">
                                        {selectedHistoryItem.metaDesc || "No meta description provided."}
                                    </div>
                                </div>
                                {selectedHistoryItem.url && (
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <a 
                                            href={selectedHistoryItem.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-violet-500 hover:text-violet-600 font-bold transition-colors"
                                        >
                                            View Live Article <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* EDITORIAL JOURNEY — clean flat layout, no circles */}
                        <div className="p-10 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-8">
                            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">Editorial Journey</h3>

                            {/* Reviewers */}
                            {selectedHistoryItem.auditLog && selectedHistoryItem.auditLog.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Reviewed By</p>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedHistoryItem.auditLog.map((log: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between gap-8 px-5 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 w-full">
                                                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">{log.email}</p>
                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Publisher */}
                            {selectedHistoryItem.publishedBy && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Published By</p>
                                    <div className="flex items-center justify-between gap-8 px-5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
                                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{selectedHistoryItem.publishedBy.email}</p>
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatDateTime(selectedHistoryItem.publishedBy.timestamp)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Featured Image Section */}
                    {selectedHistoryItem.imageUrl && (
                        <Card className="overflow-hidden border-none shadow-2xl">
                             <img 
                                src={selectedHistoryItem.imageUrl} 
                                alt={selectedHistoryItem.title} 
                                className="w-full aspect-[21/9] object-cover"
                             />
                        </Card>
                    )}

                    {/* Content Section */}
                    <section className="prose prose-slate dark:prose-invert max-w-none">
                        <Card className="p-12 md:p-16 border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-[#0d0d0d]">
                            <div 
                                className="blog-content-view text-slate-700 dark:text-slate-300 leading-loose"
                                dangerouslySetInnerHTML={{ __html: selectedHistoryItem.content || '<p class="text-slate-400 italic">Historical content body not found in cache.</p>' }}
                            />
                        </Card>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className={`animate-fadeIn flex-1 bg-slate-100/50 dark:bg-slate-950/20 p-8 lg:p-12 transition-all duration-500 ${!selectedHistoryItem ? 'h-full min-h-screen' : ''}`}>
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
                    <h2 className="text-[11px] font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">
                        Production History ({history.length})
                    </h2>
                </div>

                <div className="flex flex-col gap-6">
                    {history.length > 0 ? (
                        history.map((item, idx) => {
                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleSelectHistoryItem(item)}
                                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 flex items-center justify-between border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
                                >
                                    <div className="flex items-center gap-6 flex-1">
                                        {/* Left: The Icon (Precision alignment) */}
                                        <div className="w-16 h-16 shrink-0 rounded-xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-violet-600 shadow-sm">
                                            <Globe className="w-8 h-8 text-violet-500 group-hover:text-white transition-colors" />
                                        </div>

                                        {/* Middle: The Data Hub */}
                                        <div className="flex-1 flex flex-col justify-center space-y-1.5">
                                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-violet-600 transition-colors">
                                                {item.title}
                                            </h3>
                                            {/* Bottom Row: Metadata Strip */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(item.date || item.published_at || item.last_edited_at || item.createdAt)}
                                                </div>
                                                <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-800">
                                                    Published
                                                </div>
                                                {item.authorEmail && (
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <span className="opacity-50">BY:</span> <span className="text-slate-500 dark:text-slate-300">{item.authorEmail}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center p-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center mb-8">
                                <Globe className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Archive Protocol Empty</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is awaiting the initial production sync from your WordPress engine.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

