'use client';

import React, { useRef } from 'react';
import { Zap, Loader2, X, RefreshCw, Star, AlertCircle, Check, AlertTriangle, Plus } from 'lucide-react';
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
        hasResumeDraft, handleClearForm, setActiveTab
    } = useDashboard();

    const isReadOnly = !!selectedReviewDraft;

    // Prioritize values from selectedReviewDraft if available
    const displayPrompt = selectedReviewDraft?.prompt || prompt;
    const displayKeywords = selectedReviewDraft ? (Array.isArray(selectedReviewDraft.keywords) ? selectedReviewDraft.keywords : (typeof selectedReviewDraft.keywords === 'string' ? selectedReviewDraft.keywords.split(',').map((k: string) => k.trim()) : [])) : keywords;
    const displayDescription = selectedReviewDraft?.metaDesc || description;

    return (
        <aside className="w-full shrink-0 bg-white dark:bg-slate-900 flex flex-col h-screen lg:h-auto overflow-y-auto custom-scrollbar border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
            {/* Brand Header */}
            <div className="py-8 pl-10 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-10 h-10 bg-violet-600 rounded-none flex items-center justify-center shadow-lg shadow-violet-100 dark:shadow-none transition-transform group-hover:scale-110">
                        <Zap className="text-white w-6 h-6 fill-current" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none tracking-tight">10x<span className="text-violet-600">Blogagent</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise Engine V3.0</p>
                    </div>

                    <button
                        onClick={() => {
                            handleClearForm();
                            setActiveTab('create');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-none border border-violet-100/50 dark:border-violet-800/50 text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-sm"
                        title="Start a fresh post"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Post
                    </button>
                </div>
            </div>

            <div className="py-8 pl-10 space-y-8 flex-1 bg-slate-50/30 dark:bg-transparent">
                {/* Blog Topic */}
                <section className="space-y-3 pl-20 transition-all duration-300">
                    <Textarea
                        label="Main Blog Topic"
                        placeholder="E.g., The Future of AI in Enterprise Automation..."
                        value={displayPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="shadow-sm focus:shadow-md"
                        readOnly={isReadOnly}
                    />
                </section>
                {/* SEO Keywords */}
                <section className="space-y-4 pl-20 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Keywords</label>
                        <button
                            onClick={handleFetchKeywords}
                            disabled={isFetchingKeywords || !prompt || isReadOnly}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                        >
                            {isFetchingKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Auto Fetch
                        </button>
                    </div>
                    <div
                        className={`flex flex-wrap items-center gap-2 min-h-[100px] pl-6 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none transition-all shadow-sm ${isReadOnly ? 'cursor-default opacity-80' : 'cursor-text focus-within:ring-4 focus-within:ring-violet-500/10 focus-within:border-violet-500'}`}
                        onClick={() => !isReadOnly && inputRef.current?.focus()}
                    >
                        {displayKeywords.map((tag: string, idx: number) => {
                            const isPrimary = tag === primaryKeyword;
                            return (
                                <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-none text-[11px] font-bold shadow-sm animate-fadeIn transition-all ${isPrimary
                                        ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPrimaryKeyword(isPrimary ? null : tag); }}
                                            className={`transition-colors ${isPrimary ? 'text-violet-600 animate-pulse' : 'text-slate-400 hover:text-violet-500'}`}
                                            title={isPrimary ? "Primary Keyword" : "Mark as Primary"}
                                        >
                                            <Star className={`w-3 h-3 ${isPrimary ? 'fill-current' : ''}`} />
                                        </button>
                                    )}
                                    {isPrimary && <span className="w-1 h-3 bg-violet-500 mr-1 opacity-50" />}
                                    <span className={isPrimary ? 'underline decoration-violet-500/50 underline-offset-4' : ''}>
                                        {tag}
                                    </span>
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeKeyword(tag); if (isPrimary) setPrimaryKeyword(null); }}
                                            className="hover:text-red-500 transition-colors ml-1"
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
                <section className="space-y-4 pl-20 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Description</label>
                        <button
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !prompt || isReadOnly || !primaryKeyword}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 disabled:opacity-30 flex items-center gap-1.5 transition-all"
                        >
                            {isGeneratingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Refine
                        </button>
                    </div>
                    {/* Mandatory primary keyword notification */}
                    {!isReadOnly && displayKeywords.length > 0 && !primaryKeyword && (
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-none">
                            <Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                Select a <span className="underline decoration-amber-500/60">primary keyword</span> by clicking the ★ icon on a keyword above to enable description generation.
                            </p>
                        </div>
                    )}
                    <div>
                        <Textarea
                            placeholder="SEO optimized summary..."
                            value={displayDescription}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[140px] shadow-sm focus:shadow-md"
                            readOnly={isReadOnly}
                            maxLength={200}
                        />

                    </div>
                </section>
            </div>

            {/* Action Bar */}
            <div className={`py-8 pr-0 pl-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-transparent ${isReadOnly ? 'hidden' : ''} space-y-4`}>
                {user && (
                    <div className="space-y-2">
                        <Button
                            variant="secondary"
                            onClick={handleResumeDraft}
                            isLoading={isResuming}
                            disabled={!hasResumeDraft}
                            title={!hasResumeDraft ? "No unsaved drafts to recover." : "Recover your last interrupted work"}
                            className={`w-full text-xs font-bold uppercase tracking-widest border-slate-200 dark:border-slate-800 gap-2 transition-all duration-500 ${!hasResumeDraft ? 'grayscale opacity-40 bg-slate-100/50 cursor-not-allowed shadow-none' : 'hover:shadow-md'}`}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isResuming ? 'animate-spin' : ''}`} />
                            Resume Last Draft
                        </Button>
                        {!hasResumeDraft && (
                            <p className="text-[10px] text-center text-slate-400 font-medium italic animate-fadeIn">
                                No unsaved drafts to recover.
                            </p>
                        )}
                    </div>
                )}

                {humanizationError && !isGenerating && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-none space-y-3 animate-fadeIn">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Refinement Interrupted</p>
                                <p className="text-[10px] text-red-600 dark:text-red-500 font-medium leading-relaxed">
                                    The automated humanization pass encountered a hiccup. You can proceed with the current draft or attempt to refine the tone again.
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="secondary" 
                            onClick={handleRetryHumanization}
                            className="w-full h-10 text-[10px] bg-white hover:bg-red-50 text-red-600 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                        >
                            <RefreshCw className={`w-3 h-3 mr-2 ${isHumanizing ? 'animate-spin' : ''}`} />
                            Retry Tone Refinement
                        </Button>
                    </div>
                )}

                <Button
                    onClick={handleGenerate}
                    isLoading={isGenerating || isHumanizing}
                    disabled={!prompt}
                    className="w-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-violet-600/10 dark:shadow-none"
                >
                    {isGenerating ? 'Synthesizing...' : isHumanizing ? 'Refining Tone...' : 'Generate Elite post'}
                </Button>
            </div>
        </aside>
    );
};
