'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { RefreshCw, Copy, BarChart2, Zap, Sparkles } from 'lucide-react';

export const PostPreview = () => {
    const {
        preview, handleGenerate, isGenerating,
        feedback, setFeedback,
        isApplyingFeedback, handleApplyFeedback,
        isGeneratingInfographic, handleGenerateInfographic,
        infographicUrl, isSavingDraft, handleSaveDraft
    } = useDashboard();

    if (isGenerating) {
        return (
            <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto w-full px-8 py-10">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-[400px] w-full rounded-[2rem]" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                </div>
            </div>
        );
    }

    if (!preview) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fadeIn bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800/50 min-h-[500px] shadow-sm">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center mb-8 shadow-xl shadow-indigo-100 dark:shadow-none group hover:scale-110 transition-transform duration-500 border border-slate-100 dark:border-slate-800">
                    <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400 fill-current opacity-80" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Generate Your Elite Post</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-[320px] font-medium">
                    Leverage our enterprise AI engine to synthesize production-grade content in seconds.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn w-full transition-all duration-300">
            <div className="max-w-4xl mx-auto px-8 py-10">

                {/* Sticky Toolbar */}
                <div className="flex items-center justify-between mb-10 sticky top-[-1px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-20 pb-6 border-b border-slate-100 dark:border-slate-800/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Draft Preview</p>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(preview.title + '\n\n' + preview.content.replace(/<[^>]*>/g, ''))}
                            aria-label="Copy to clipboard"
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleGenerate}
                            aria-label="Regenerate content"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Blog Title (h1) above the image */}
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-8">
                    {preview.title}
                </h1>

                {/* Hero Image — title & logo are baked in server-side */}
                {preview.imageUrl && (
                    <Card className="mb-12 rounded-[2rem] shadow-xl shadow-indigo-100/20 dark:shadow-none overflow-hidden border-none ring-1 ring-slate-200/50 dark:ring-slate-800/50 group">
                        <img
                            src={preview.imageUrl}
                            alt={preview.title}
                            className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                            style={{ maxHeight: '540px' }}
                        />
                    </Card>
                )}

                {/* Article Content */}
                <article
                    dangerouslySetInnerHTML={{ __html: preview.content }}
                    className="text-slate-600 dark:text-slate-300 text-base leading-relaxed prose prose-indigo dark:prose-invert max-w-none
                        prose-h2:text-2xl prose-h2:font-extrabold prose-h2:tracking-tight prose-h2:mt-12 prose-h2:mb-6
                        prose-p:mb-6 prose-a:font-bold prose-a:no-underline prose-a:border-b-2 prose-a:border-indigo-100 hover:prose-a:border-indigo-500 transition-all"
                />

                {/* Infographic Section */}
                <div className="mt-24 pt-16 border-t border-slate-100 dark:border-slate-800/50 space-y-12">
                    <div className="flex flex-col items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={handleGenerateInfographic}
                            isLoading={isGeneratingInfographic}
                            className="px-10 h-14 rounded-2xl"
                        >
                            <BarChart2 className="w-5 h-5 mr-3" />
                            {infographicUrl ? 'Regenerate Insight' : 'Generate Visual Insight'}
                        </Button>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Data Engine</p>
                    </div>

                    {infographicUrl && (
                        <Card className="animate-fadeIn rounded-[2.5rem] p-3 shadow-sm hover:shadow-md border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="relative overflow-hidden rounded-[2rem]">
                                <img src={infographicUrl} alt="Infographic" className="w-full h-auto object-contain" />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Refinement Interface */}
                <div className="mt-28">
                    <Card className="p-10 rounded-[2.5rem] bg-slate-100/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 border-dashed shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-end">
                            <div className="space-y-5">
                                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    Contextual Refinement
                                </label>
                                <Textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Inject directives to refine this draft..."
                                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 min-h-[160px] shadow-sm text-sm rounded-2xl p-6"
                                />
                            </div>
                            <div className="flex flex-col gap-5">
                                <Button
                                    variant="primary"
                                    onClick={handleApplyFeedback}
                                    isLoading={isApplyingFeedback}
                                    disabled={!feedback}
                                    className="px-10 h-16 w-full lg:w-64 text-[11px] font-extrabold tracking-widest shadow-xl shadow-indigo-600/10 dark:shadow-none rounded-2xl"
                                >
                                    Apply Directives
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleSaveDraft}
                                    isLoading={isSavingDraft}
                                    className="px-10 h-16 w-full lg:w-64 rounded-2xl font-bold"
                                >
                                    Finalize Draft
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
