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
        <div className="animate-fadeIn flex-1 w-full flex justify-center p-8 pb-24 bg-slate-50 dark:bg-[#060606] transition-all duration-500 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-4xl flex flex-col gap-8">
                {/* Header aligned with cards */}
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 mb-2">
                    <h2 className="text-[11px] font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">
                        Production History ({history.length})
                    </h2>
                </div>
                
                {history.length > 0 ? (
                    history.map((item, idx) => {
                        return (
                            <div
                                key={idx}
                                onClick={() => handleSelectHistoryItem(item)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] cursor-pointer transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:border-violet-200 dark:hover:border-violet-800 flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-6">
                                    {/* Globe Icon Box - Refined 64x64 */}
                                    <div className="w-16 h-16 rounded-2xl bg-[#f8f5ff] dark:bg-violet-900/20 flex items-center justify-center shrink-0 border border-violet-50 dark:border-violet-800/50">
                                        <Globe className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    {/* Text Content */}
                                    <div className="space-y-1.5 min-w-0">
                                        <h3 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-violet-600 transition-colors truncate">
                                            {item.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 text-[13px]">
                                            <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                                                <Calendar className="w-3.5 h-3.5 opacity-70" />
                                                {formatDate(item.date || item.published_at || item.last_edited_at || item.createdAt)}
                                            </span>
                                            <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 rounded uppercase tracking-wide text-[11px]">
                                                Published
                                            </span>
                                            {(item.publishedBy?.email || item.authorEmail) && (
                                                <span className="text-slate-400 font-medium">
                                                    <span className="uppercase tracking-widest text-[9px] font-black opacity-60">Published by: </span>
                                                    <span className="text-slate-600 dark:text-slate-300 font-bold lowercase">{item.publishedBy?.email || item.authorEmail}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* VIEW LIVE Button */}
                                {item.url && (
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="shrink-0 px-5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:hover:bg-white dark:hover:text-slate-900 transition-all shadow-sm"
                                    >
                                        View Live
                                    </a>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center p-24 text-center bg-gradient-to-br from-violet-50/50 to-fuchsia-50/50 dark:from-violet-950/10 dark:to-fuchsia-950/10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800/50 shadow-sm">
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center mb-8 shadow-xl shadow-violet-100 dark:shadow-none">
                            <Globe className="w-9 h-9 text-slate-200 dark:text-slate-700" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Launch Protocol Pending</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is awaiting the first production deployment to the WordPress cloud.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
