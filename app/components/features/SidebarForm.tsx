'use client';

import React, { useRef } from 'react';
import { Zap, Loader2, X, RefreshCw, Star, AlertCircle, Check, AlertTriangle, Plus, Globe, Code, Link2, Linkedin } from 'lucide-react';
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
        targetPlatform, setTargetPlatform,
        referenceUrl1, setReferenceUrl1,
        referenceUrl2, setReferenceUrl2,
        referenceUrl3, setReferenceUrl3
    } = useDashboard();

    const isReadOnly = !!selectedReviewDraft;

    // Prioritize values from selectedReviewDraft if available
    const displayPrompt = selectedReviewDraft?.prompt || prompt;
    const displayKeywords = selectedReviewDraft ? (Array.isArray(selectedReviewDraft.keywords) ? selectedReviewDraft.keywords : (typeof selectedReviewDraft.keywords === 'string' ? selectedReviewDraft.keywords.split(',').map((k: string) => k.trim()) : [])) : keywords;
    const displayDescription = selectedReviewDraft?.metaDesc || description;

    return (
        <aside className="w-full shrink-0 bg-white dark:bg-slate-900 flex flex-col h-full border-r border-slate-400 dark:border-slate-800 transition-all duration-300 relative overflow-hidden">
            {/* STICKY TARGET ZONE - Multi-Platform Orchestration Switch */}
            <div className="px-8 py-8 border-b border-slate-50 dark:border-slate-800/50 shrink-0">
                <div className="space-y-4">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 !pl-4">Target Platform</label>
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl flex relative shadow-inner h-14">
                        <button
                            onClick={() => setTargetPlatform('wordpress')}
                            className={`flex-1 flex items-center justify-center gap-2 h-full text-[10px] font-bold transition-all relative z-10 ${targetPlatform === 'wordpress' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 fill-current transition-transform duration-300 ${targetPlatform === 'wordpress' ? 'scale-110' : 'scale-100 opacity-70'}`} xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.16 18.25c-.99 0-1.95-.2-2.83-.55l3.18-9.21 2.21 6.07c1.39-1.08 2.28-2.77 2.28-4.67 0-.84-.18-1.64-.5-2.36L12.16 20.25zM3.75 12c0 2.21.87 4.22 2.29 5.71L2.71 8.56C2.39 9.63 2.25 10.79 2.25 12zm7.64-4.32c.17.01.34.02.47.02.58 0 1.26-.07 1.26-.07.31-.02.35.42.04.46 0 0-.31.04-.66.06l2.08 6.2 1.25-3.76-.89-.04c-.31-.02-.35-.46-.04-.46 0 0 .69.07 1.24.07.53 0 1.23-.07 1.23-.07.31-.02.35.42.04.46 0 0-.29.04-.62.06l-1.35 3.99 1.3 3.88c.49-.02.87-.06.87-.06.31-.02.35.42.04.46 0 0-.58.06-1.19.06-.57 0-1.26-.06-1.26-.06-.31-.02-.35-.46-.04-.46 0 0 .34.04.65.06l-1.69-4.99-2.07 6-3.38-9.29c.33-.02.64-.06.64-.06.31-.02.27-.46-.04-.46 0 0-.55.04-1.13.04-.47 0-1.01-.04-1.01-.04-.31-.02-.35.42-.04.46 0 0 .35.04.62.06l3.52 9.69-3.21-9.45c-.32-.56-.69-1.17-.97-1.85l2.25 6.19-.63-.06c-.31-.02-.35-.46-.04-.46 0 0 .55.07 1.13.07.55 0 1.11-.07 1.11-.07.31-.02.35.42.04.46 0 0-.31.04-.62.06l1.36 3.73 1.23-3.73-.62-.06c-.31-.02-.27-.46.04-.46z"/>
                            </svg>
                            WordPress
                        </button>
                        <button
                            onClick={() => setTargetPlatform('framer')}
                            className={`flex-1 flex items-center justify-center gap-2 h-full text-[10px] font-bold transition-all relative z-10 ${targetPlatform === 'framer' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 fill-current transition-transform duration-300 ${targetPlatform === 'framer' ? 'scale-110' : 'scale-100 opacity-70'}`} xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 2h14v6H5zm0 6h14l-7 7H5zm7 7h7l-7 7z"/>
                            </svg>
                            Framer
                        </button>
                        <button
                            onClick={() => setTargetPlatform('linkedin')}
                            className={`flex-1 flex items-center justify-center gap-2 h-full text-[10px] font-bold transition-all relative z-10 ${targetPlatform === 'linkedin' ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Linkedin className={`w-3.5 h-3.5 transition-transform duration-300 ${targetPlatform === 'linkedin' ? 'scale-110' : 'scale-100 opacity-70'}`} />
                            LinkedIn
                        </button>
                        <div
                            className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-6px)] bg-white dark:bg-slate-700 shadow-md rounded-xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
                                targetPlatform === 'framer' 
                                    ? 'left-[33.33%] ml-0.5' 
                                    : targetPlatform === 'linkedin' 
                                        ? 'left-[66.66%] ml-[1px]' 
                                        : 'left-1.5'
                            }`}
                        />
                    </div>
                </div>
            </div>

            {/* SCROLLABLE INPUT ZONE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 space-y-10">
                {/* Blog Topic */}
                <section className="space-y-4">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 !pl-4">Main Blog Topic</label>
                    <Textarea
                        placeholder="E.g., The Future of AI in Enterprise Automation..."
                        value={displayPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="!bg-slate-50/50 dark:!bg-slate-800/50 !border-slate-200 dark:!border-slate-800 !rounded-xl !p-4 !pl-4 !text-sm !font-medium focus:!border-violet-500 focus:!ring-4 focus:!ring-violet-500/5 transition-all"
                        readOnly={isReadOnly}
                    />
                </section>

                {/* SEO Keywords */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between !pl-4">
                        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Keywords</label>
                        <button
                            onClick={handleFetchKeywords}
                            disabled={isFetchingKeywords || !prompt || isReadOnly}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 disabled:opacity-30 flex items-center gap-1.5 transition-all mr-2"
                        >
                            {isFetchingKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            AUTO FETCH
                        </button>
                    </div>
                    <div
                        className={`flex flex-wrap items-center gap-2 min-h-[100px] p-4 !pl-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl transition-all ${isReadOnly ? 'cursor-default opacity-80' : 'cursor-text focus-within:ring-4 focus-within:ring-violet-500/5 focus-within:border-violet-500'}`}
                        onClick={() => !isReadOnly && inputRef.current?.focus()}
                    >
                        {displayKeywords.map((tag: string, idx: number) => {
                            const isPrimary = tag === primaryKeyword;
                            return (
                                <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold animate-fadeIn transition-all ${isPrimary
                                        ? 'bg-slate-100 dark:bg-slate-800 text-violet-600 shadow-sm ring-1 ring-violet-200 dark:ring-violet-900/50'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                >
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPrimaryKeyword(isPrimary ? null : tag); }}
                                            className={`transition-colors ${isPrimary ? 'text-violet-500 hover:text-violet-600' : 'text-slate-400 hover:text-violet-500'}`}
                                        >
                                            <Star className={`w-3 h-3 ${isPrimary ? 'fill-current' : ''}`} />
                                        </button>
                                    )}
                                    {tag}
                                    {!isReadOnly && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeKeyword(tag); if (isPrimary) setPrimaryKeyword(null); }}
                                            className={`transition-colors ml-1 ${isPrimary ? 'text-violet-400 hover:text-violet-600' : 'hover:text-red-500'}`}
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
                    <div className="flex items-center justify-between !pl-4">
                        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Description</label>
                        <button
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !prompt || isReadOnly || !primaryKeyword}
                            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 disabled:opacity-30 flex items-center gap-1.5 transition-all mr-2"
                        >
                            {isGeneratingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            REFINE
                        </button>
                    </div>
                    {!isReadOnly && displayKeywords.length > 0 && !primaryKeyword && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl mx-4">
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
                        className="!min-h-[140px] !bg-slate-50/50 dark:!bg-slate-800/50 !border-slate-200 dark:!border-slate-800 !rounded-xl !p-4 !pl-4 !text-sm !font-medium focus:!border-violet-500 focus:!ring-4 focus:!ring-violet-500/5 transition-all"
                        readOnly={isReadOnly}
                        maxLength={200}
                    />
                </section>

                {/* Reference URLs (Optional) */}
                {!isReadOnly && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 !pl-4">
                            <Link2 className="w-3.5 h-3.5 text-slate-400" />
                            <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Reference URLs <span className="normal-case font-medium tracking-normal text-slate-300">(Optional)</span></label>
                        </div>
                        <div className="space-y-3">
                            <input
                                type="url"
                                placeholder="https://example.com/related-article-1"
                                value={referenceUrl1}
                                onChange={(e) => setReferenceUrl1(e.target.value)}
                                className="w-full h-[52px] bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl !pl-4 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 transition-all"
                            />
                            <input
                                type="url"
                                placeholder="https://example.com/related-article-2"
                                value={referenceUrl2}
                                onChange={(e) => setReferenceUrl2(e.target.value)}
                                className="w-full h-[52px] bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl !pl-4 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 transition-all"
                            />
                            <input
                                type="url"
                                placeholder="https://example.com/related-article-3"
                                value={referenceUrl3}
                                onChange={(e) => setReferenceUrl3(e.target.value)}
                                className="w-full h-[52px] bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl !pl-4 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/5 transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 !pl-4 leading-relaxed">
                            Add up to 3 related URLs. The AI will weave relevant facts from these into existing sections without creating new ones.
                        </p>
                    </section>
                )}
            </div>

            {/* STICKY ACTION ZONE */}
            <div className={`px-8 py-8 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0 ${isReadOnly ? 'hidden' : ''}`}>
                {user && (
                    <Button
                        variant="secondary"
                        onClick={handleResumeDraft}
                        isLoading={isResuming}
                        disabled={!hasResumeDraft}
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
                    className="w-full text-[11px] font-bold uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white py-6 rounded-xl shadow-xl shadow-violet-500/20 transition-all active:scale-[0.98]"
                >
                    {isProcessingFullPost ? 'Processing...' : 'Generate Elite Post'}
                </Button>
            </div>
        </aside>
    );
};
