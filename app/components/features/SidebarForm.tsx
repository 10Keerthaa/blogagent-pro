'use client';

import React, { useRef } from 'react';
import { Zap, Loader2, X, RefreshCw } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

export const SidebarForm = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const {
        prompt, setPrompt,
        keywordInput, setKeywordInput,
        keywords, handleAddKeyword, removeKeyword,
        description, setDescription,
        isGenerating, handleGenerate,
        isFetchingKeywords, handleFetchKeywords,
        isGeneratingDescription, handleGenerateDescription,
        selectedReviewDraft
    } = useDashboard();

    const isReadOnly = !!selectedReviewDraft;

    return (
        <aside className="w-full lg:w-[40%] shrink-0 bg-white dark:bg-slate-900 flex flex-col h-screen lg:h-auto overflow-y-auto custom-scrollbar border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
            {/* Brand Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-10 h-10 bg-indigo-600 rounded-none flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none transition-transform group-hover:scale-110">
                        <Zap className="text-white w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight">BlogAgent <span className="text-indigo-600">Pro</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise Engine V3.0</p>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 flex-1 bg-slate-50/30 dark:bg-transparent">
                {/* Blog Topic */}
                <section className="space-y-3">
                    <Textarea
                        label="Main Blog Topic"
                        placeholder="E.g., The Future of AI in Enterprise Automation..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="shadow-sm focus:shadow-md"
                        readOnly={isReadOnly}
                    />
                </section>

                {/* SEO Keywords */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Keywords</label>
                        <button
                            onClick={handleFetchKeywords}
                            disabled={isFetchingKeywords || !prompt || isReadOnly}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                        >
                            {isFetchingKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Auto Fetch
                        </button>
                    </div>
                    <div
                        className={`flex flex-wrap items-center gap-2 min-h-[100px] p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none transition-all shadow-sm ${isReadOnly ? 'cursor-default opacity-80' : 'cursor-text focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500'}`}
                        onClick={() => !isReadOnly && inputRef.current?.focus()}
                    >
                        {keywords.map((tag, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-none text-[11px] font-bold shadow-sm animate-fadeIn"
                            >
                                {tag}
                                {!isReadOnly && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeKeyword(tag); }}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                        {!isReadOnly && (
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={keywords.length === 0 ? "Add keywords..." : "Add more..."}
                                className="flex-1 min-w-[80px] bg-transparent border-none outline-none ring-0 focus:ring-0 text-xs font-bold p-0 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={handleAddKeyword}
                            />
                        )}
                    </div>
                </section>

                {/* Meta Description */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Description</label>
                        <button
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !prompt || isReadOnly}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                        >
                            {isGeneratingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Refine
                        </button>
                    </div>
                    <Textarea
                        placeholder="SEO optimized summary..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[140px] shadow-sm focus:shadow-md"
                        readOnly={isReadOnly}
                    />
                </section>
            </div>

            {/* Action Bar */}
            <div className={`p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-transparent ${isReadOnly ? 'hidden' : ''}`}>
                <Button
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={!prompt}
                    className="w-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/10 dark:shadow-none"
                >
                    {isGenerating ? 'Synthesizing...' : 'Generate Elite post'}
                </Button>
            </div>
        </aside>
    );
};
