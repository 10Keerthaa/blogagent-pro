'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Globe, Calendar, ExternalLink } from 'lucide-react';

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
                                    {selectedHistoryItem.date && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Publication Date</p>
                                            <p className="text-slate-900 dark:text-white font-semibold text-base">{new Date(selectedHistoryItem.date).toLocaleDateString()}</p>
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
                                            className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-600 font-bold transition-colors"
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
                                            <div key={i} className="flex items-center justify-between gap-8 px-5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 w-full">
                                                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{log.email}</p>
                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
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
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{new Date(selectedHistoryItem.publishedBy.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
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
        <div className="animate-fadeIn w-full space-y-10 pb-24 transition-all duration-500 px-4 lg:px-8">
            <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                    Production History ({history.length})
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {history.length > 0 ? (
                    history.map((item, idx) => {
                        return (
                            <Card
                                key={idx}
                                hoverable
                                onClick={() => handleSelectHistoryItem(item)}
                                className="p-8 group border-slate-200 dark:border-slate-800 border-l-4 border-l-transparent hover:border-l-indigo-500 transition-all duration-500 shadow-sm cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-7">
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-500 shadow-sm">
                                            <Globe className="w-8 h-8 text-indigo-500 group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-6">
                                                <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(item.date).toLocaleDateString()}
                                                </span>
                                                <Badge variant="success" className="px-3">Published</Badge>
                                                {item.authorEmail && (
                                                    <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/50 lowercase italic">
                                                        by {item.authorEmail}
                                                    </span>
                                                )}
                                            </div>
                                            {item.auditLog && item.auditLog.length > 0 && (
                                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reviewed by:</span>
                                                    {item.auditLog.map((log: any, i: number) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50"
                                                        >
                                                            {log.email}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {item.publishedBy && (
                                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Published by:</span>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                                                        {item.publishedBy.email}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 transition-all text-slate-400 shadow-sm opacity-0 group-hover:opacity-100 duration-500 -translate-x-4 group-hover:translate-x-0"
                                        title="View published article"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                            </Card>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center p-24 text-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800/50 shadow-sm">
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center mb-8 shadow-xl shadow-indigo-100 dark:shadow-none">
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
