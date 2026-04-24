'use client';

import React, { useRef } from 'react';
import { Zap, Loader2, X, RefreshCw, Star, AlertCircle, Check, AlertTriangle, Plus, Globe, Code } from 'lucide-react';
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
        handleResumeDraft, isResuming, user, isHumanizing,
        humanizationError, handleRetryHumanization,
        hasResumeDraft, handleClearForm, setActiveTab, isProcessingFullPost,
        targetPlatform, setTargetPlatform
    } = useDashboard();

    const isReadOnly = !!selectedReviewDraft;

    // Prioritize values from selectedReviewDraft if available
    const displayPrompt = selectedReviewDraft?.prompt || prompt;
    const displayKeywords = selectedReviewDraft ? (Array.isArray(selectedReviewDraft.keywords) ? selectedReviewDraft.keywords : (typeof selectedReviewDraft.keywords === 'string' ? selectedReviewDraft.keywords.split(',').map((k: string) => k.trim()) : [])) : keywords;
    const displayDescription = selectedReviewDraft?.metaDesc || description;

    return (
        <aside className="w-full shrink-0 bg-white dark:bg-slate-900 flex flex-col h-screen border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
            {/* STICKY TARGET ZONE */}
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800/50 shrink-0">
                <div className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Orchestration Target</label>
                    <div className="p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex relative">
                        <button
                            onClick={() => setTargetPlatform('wordpress')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all relative z-10 ${targetPlatform === 'wordpress' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            WordPress
                        </button>
                        <button
                            onClick={() => setTargetPlatform('framer')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all relative z-10 ${targetPlatform === 'framer' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Code className="w-3.5 h-3.5" />
                            Framer
                        </button>
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 shadow-sm rounded-lg transition-all duration-300 ease-out ${targetPlatform === 'framer' ? 'translate-x-full left-0 ml-1' : 'left-1'}`}
                        />
                    </div>
                </div>
            </div>

            {/* SCROLLABLE INPUT ZONE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 space-y-10">
                {/* Blog Topic */}
                <section className="space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Main Blog Topic</label>
                    <Textarea
                        placeholder="E.g., The Future of AI in Enterprise Automation..."
                        value={displayPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="!bg-transparent !border-slate-200 dark:!border-slate-800 !rounded-xl !p-4 !text-sm !font-medium focus:!border-violet-500 focus:!ring-4 focus:!ring-violet-500/5 transition-all"
                        readOnly={isReadOnly}
                    />
                </section>

                {/* SEO Keywords */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Keywords</label>
                        <button
                            onClick={handleFetchKeywords}
                            disabled={isFetchingKeywords || !prompt || isReadOnly}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                        >
                            {isFetchingKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            AUTO FETCH
                        </button>
                    </div>
                    <div
                        className={`flex flex-wrap items-center gap-2 min-h-[100px] p-4 bg-transparent border border-slate-200 dark:border-slate-800 rounded-xl transition-all ${isReadOnly ? 'cursor-default opacity-80' : 'cursor-text focus-within:ring-4 focus-within:ring-violet-500/5 focus-within:border-violet-500'}`}
                        onClick={() => !isReadOnly && inputRef.current?.focus()}
                    >
                        {displayKeywords.map((tag: string, idx: number) => {
                            const isPrimary = tag === primaryKeyword;
                            return (
                                <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold animate-fadeIn transition-all ${isPrimary
                                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPrimaryKeyword(isPrimary ? null : tag); }}
                                            className={`transition-colors ${isPrimary ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-violet-500'}`}
                                        >
                                            <Star className={`w-3 h-3 ${isPrimary ? 'fill-current' : ''}`} />
                                        </button>
                                    )}
                                    {tag}
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeKeyword(tag); if (isPrimary) setPrimaryKeyword(null); }}
                                            className={`transition-colors ml-1 ${isPrimary ? 'text-white/80 hover:text-white' : 'hover:text-red-500'}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </span>
                            );
                        })}
                        {!isReadOnly && (
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={keywords.length === 0 ? "Add keywords..." : ""}
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
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Description</label>
                        <button
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !prompt || isReadOnly || !primaryKeyword}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                        >
                            {isGeneratingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            REFINE
                        </button>
                    </div>
                    {!isReadOnly && displayKeywords.length > 0 && !primaryKeyword && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                Select a <span className="underline decoration-amber-500/30">primary keyword</span> to enable description generation.
                            </p>
                        </div>
                    )}
                    <Textarea
                        placeholder="SEO optimized summary..."
                        value={displayDescription}
                        onChange={(e) => setDescription(e.target.value)}
                        className="!min-h-[140px] !bg-transparent !border-slate-200 dark:!border-slate-800 !rounded-xl !p-4 !text-sm !font-medium focus:!border-violet-500 focus:!ring-4 focus:!ring-violet-500/5 transition-all"
                        readOnly={isReadOnly}
                        maxLength={200}
                    />
                </section>
            </div>

            {/* STICKY ACTION ZONE */}
            <div className={`px-8 py-8 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0 ${isReadOnly ? 'hidden' : ''}`}>
                {user && hasResumeDraft && (
                    <Button
                        variant="secondary"
                        onClick={handleResumeDraft}
                        isLoading={isResuming}
                        className="w-full text-[11px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 py-6 rounded-xl transition-all"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isResuming ? 'animate-spin' : ''}`} />
                        Resume Last Draft
                    </Button>
                )}

                <Button
                    onClick={handleGenerate}
                    isLoading={isProcessingFullPost}
                    disabled={!prompt || keywords.length === 0 || !description}
                    className="w-full text-[11px] font-bold uppercase tracking-widest bg-slate-900 dark:bg-violet-600 hover:bg-black dark:hover:bg-violet-700 text-white py-6 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-none transition-all active:scale-[0.98]"
                >
                    {isProcessingFullPost ? 'Processing...' : 'Generate Elite Post'}
                </Button>
            </div>
        </aside>
    );
};
