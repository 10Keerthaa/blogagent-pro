'use client';

import React, { useRef } from 'react';
import { Zap, Loader2, X, RefreshCw, Star, PlusCircle, Sparkles } from 'lucide-react';
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
        selectedReviewDraft,
        primaryKeyword, setPrimaryKeyword,
        handleClearForm
    } = useDashboard();

    const isReadOnly = !!selectedReviewDraft;

    // Prioritize values from selectedReviewDraft if available
    const displayPrompt = selectedReviewDraft?.prompt || prompt;
    const displayKeywords = selectedReviewDraft ? (Array.isArray(selectedReviewDraft.keywords) ? selectedReviewDraft.keywords : (typeof selectedReviewDraft.keywords === 'string' ? selectedReviewDraft.keywords.split(',').map((k: string) => k.trim()) : [])) : keywords;
    const displayDescription = selectedReviewDraft?.metaDesc || description;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* View Header */}
            <div className="flex items-center justify-between pb-8 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600">
                        <PlusCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Create New Post</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your content strategy</p>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    onClick={handleClearForm}
                    className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 hover:text-red-500"
                >
                    Clear Form
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left Column: Topic & Meta */}
                <div className="space-y-10">
                    <section className="space-y-4">
                        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 px-1">Content focus</label>
                        <Textarea
                            placeholder="E.g., The Future of AI in Enterprise Automation..."
                            value={displayPrompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[120px] shadow-sm focus:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-base"
                            readOnly={isReadOnly}
                        />
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">SEO Strategy</label>
                            <button
                                onClick={handleGenerateDescription}
                                disabled={isGeneratingDescription || !prompt || isReadOnly}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                            >
                                {isGeneratingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI Assist
                            </button>
                        </div>
                        <Textarea
                            placeholder="SEO optimized summary..."
                            value={displayDescription}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[160px] shadow-sm focus:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-base"
                            readOnly={isReadOnly}
                        />
                    </section>
                </div>

                {/* Right Column: Keywords */}
                <div className="space-y-10">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Target Keywords</label>
                            <button
                                onClick={handleFetchKeywords}
                                disabled={isFetchingKeywords || !prompt || isReadOnly}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                            >
                                {isFetchingKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Semantic Sync
                            </button>
                        </div>
                        <div
                            className={`flex flex-wrap items-center gap-2 min-h-[180px] p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all shadow-sm ${isReadOnly ? 'cursor-default opacity-80' : 'cursor-text focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500'}`}
                            onClick={() => !isReadOnly && inputRef.current?.focus()}
                        >
                            {displayKeywords.map((tag: string, idx: number) => {
                                const isPrimary = tag === primaryKeyword;
                                return (
                                    <span
                                        key={idx}
                                        className={`inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-[11px] font-bold shadow-sm animate-fadeIn transition-all ${isPrimary
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        {!isReadOnly && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPrimaryKeyword(isPrimary ? null : tag); }}
                                                className={`transition-colors ${isPrimary ? 'text-white/80' : 'text-slate-400 hover:text-indigo-500'}`}
                                            >
                                                <Star className={`w-3.5 h-3.5 ${isPrimary ? 'fill-current' : ''}`} />
                                            </button>
                                        )}
                                        {tag}
                                        {!isReadOnly && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeKeyword(tag); if (isPrimary) setPrimaryKeyword(null); }}
                                                className={`transition-colors ml-1 ${isPrimary ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </span>
                                );
                            })}
                            {!isReadOnly && (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder={keywords.length === 0 ? "Add keywords..." : "Add more..."}
                                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none ring-0 focus:ring-0 text-sm font-bold p-0 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={handleAddKeyword}
                                />
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Sticky Action Footer - Simplified for Create view */}
            <div className={`pt-12 border-t border-slate-100 dark:border-slate-800 flex justify-center ${isReadOnly ? 'hidden' : ''}`}>
                <Button
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={!prompt}
                    className="w-full max-w-xl h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 dark:shadow-none"
                >
                    {isGenerating ? 'Synthesizing Content...' : 'Generate Enterprise Post'}
                </Button>
            </div>
        </div>
    );
};
