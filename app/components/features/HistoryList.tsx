'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Globe, Calendar, ExternalLink } from 'lucide-react';

export const HistoryList = () => {
    const { history, handleSelectHistoryItem, selectedHistoryItem } = useDashboard();

    // If an item is selected, we show a simplified "Back" experience or just keep the list?
    // User wants the sidebar to slide in when selected.
    
    return (
        <div className="animate-fadeIn max-w-4xl mx-auto w-full space-y-8 pb-20 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                    {selectedHistoryItem ? 'Selection Protocol' : `Production History (${history.length})`}
                </h2>
                {selectedHistoryItem && (
                    <button 
                        onClick={() => handleSelectHistoryItem(null)}
                        className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                    >
                        Return to Archives
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {history.length > 0 ? (
                    history.map((item, idx) => {
                        const isSelected = selectedHistoryItem?.id === item.id || (selectedHistoryItem?.title === item.title && selectedHistoryItem?.date === item.date);
                        
                        return (
                            <Card
                                key={idx}
                                hoverable
                                onClick={() => handleSelectHistoryItem(item)}
                                className={`p-8 group border-slate-200 dark:border-slate-800 border-l-4 transition-all duration-300 shadow-sm cursor-pointer
                                    ${isSelected ? 'border-l-indigo-500 bg-indigo-50/10 dark:bg-indigo-900/5' : 'border-l-transparent hover:border-l-indigo-500'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-7">
                                        <div className={`w-16 h-16 rounded-[1.25rem] border transition-all duration-300 shadow-sm flex items-center justify-center
                                            ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/50 group-hover:bg-indigo-600 group-hover:border-indigo-600'}`}>
                                            <Globe className={`w-8 h-8 transition-colors ${isSelected ? 'text-white' : 'text-indigo-500 group-hover:text-white'}`} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className={`text-base font-bold transition-colors tracking-tight leading-tight
                                                ${isSelected ? 'text-indigo-600' : 'text-slate-900 dark:text-white group-hover:text-indigo-600'}`}>
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-6">
                                                <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(item.date).toLocaleDateString()}
                                                </span>
                                                <Badge variant="success" className="px-3">Published</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    {!isSelected && (
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-950 transition-all text-slate-400 shadow-sm opacity-0 group-hover:opacity-100 duration-300 -translate-x-4 group-hover:translate-x-0"
                                            title="View published article"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
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
