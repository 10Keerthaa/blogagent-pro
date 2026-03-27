'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { RefreshCw, Copy, BarChart2, Zap, Sparkles, Bold, Italic, Link as LinkIcon } from 'lucide-react';

export const PostPreview = () => {
    const {
        preview, handleGenerate, isGenerating,
        feedback, setFeedback,
        isApplyingFeedback, handleApplyFeedback,
        isGeneratingInfographic, handleGenerateInfographic,
        infographicUrl, isSavingDraft, handleSaveDraft,
        resetEditorState, setPreview
    } = useDashboard();

    const handleFormat = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
    };

    if (isGenerating) {
        return (
            <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto w-full px-24 py-20">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-[400px] w-full rounded-none" />
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fadeIn bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 rounded-none border-2 border-dashed border-slate-200 dark:border-slate-800/50 min-h-[500px] shadow-sm">
                <div className="w-20 h-20 rounded-none bg-white dark:bg-slate-900 flex items-center justify-center mb-8 shadow-xl shadow-indigo-100 dark:shadow-none group hover:scale-110 transition-transform duration-500 border border-slate-100 dark:border-slate-800">
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
            <div className="max-w-4xl mx-auto px-24 py-20">

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
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetEditorState}
                            className="border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Start New Post
                        </Button>
                    </div>
                </div>
            </div>

            {/* Toolbar for ContentEditable */}
            <div className="flex items-center gap-2 mb-6 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sticky top-[72px] z-30 shadow-sm backdrop-blur-md">
                <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                <button onClick={() => {
                    const url = prompt('Enter link URL:');
                    if (url) handleFormat('createLink', url);
                }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Editor Tools</span>
            </div>

            <div className="max-w-4xl mx-auto px-24 pb-20">
                {/* Blog Title (h1) REMOVED FROM HERE as it overlaps with overlay/redundant */}

                {preview.imageUrl && (
                    <div className="relative mb-12 group overflow-hidden rounded-none shadow-2xl">
                        {/* Base Image */}
                        <img
                            src={preview.imageUrl}
                            alt={preview.title}
                            className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                            style={{ aspectRatio: '4/3' }}
                        />

                        {/* Solid Purple Overlay (#7E57C2 at 0.45 opacity) */}
                        <div
                            className="absolute inset-0 z-10 pointer-events-none"
                            style={{ backgroundColor: 'rgba(126, 87, 194, 0.45)' }}
                        />

                        {/* Overlays Container */}
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            {/* Blog Tag Overlay (Top-Left: 40px) */}
                            <img
                                src="/Blog.png"
                                alt="Blog Tag"
                                className="absolute top-[40px] left-[40px] w-auto h-10 object-contain"
                            />

                            {/* Title Overlay (20px below blog tag, 40px from left) */}
                            <div
                                className="absolute left-[40px] text-white flex flex-col gap-2 max-w-2xl drop-shadow-xl"
                                style={{ top: 'calc(40px + 40px + 20px)' }}
                            >
                                <h1 className="text-[56px] font-bold leading-[1.1] tracking-tight m-0">
                                    {preview.title.split(':')[0]}
                                </h1>
                                {preview.title.includes(':') && (
                                    <p className="text-[44px] font-medium leading-tight opacity-90 m-0">
                                        {preview.title.split(':').slice(1).join(':')}
                                    </p>
                                )}
                            </div>

                            {/* Logo Overlay (Bottom-Right: 40px) */}
                            <img
                                src="/10xDS.png"
                                alt="Brand Logo"
                                className="absolute bottom-[40px] right-[40px] w-auto h-14 object-contain"
                            />
                        </div>
                    </div>
                )}

                {/* Article Content - Now contentEditable */}
                <article
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setPreview({ ...preview, content: e.currentTarget.innerHTML })}
                    dangerouslySetInnerHTML={{ __html: preview.content }}
                    className="text-black dark:text-white text-base leading-relaxed prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[400px]
                        prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold
                        prose-h2:text-2xl prose-h2:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:font-serif
                        prose-h3:text-xl prose-h3:tracking-tight prose-h3:mt-8 prose-h3:mb-4 prose-h3:font-serif
                        prose-p:mb-6 prose-a:font-bold prose-a:no-underline prose-a:border-b-2 prose-a:border-indigo-100 hover:prose-a:border-indigo-500 transition-all font-sans"
                />

                {/* Infographic Section */}
                <div className="mt-24 pt-16 border-t border-slate-100 dark:border-slate-800/50 space-y-12">
                    <div className="flex flex-col items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={handleGenerateInfographic}
                            isLoading={isGeneratingInfographic}
                            className="px-10 h-14 rounded-none"
                        >
                            <BarChart2 className="w-5 h-5 mr-3" />
                            {infographicUrl ? 'Regenerate Insight' : 'Generate Visual Insight'}
                        </Button>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Data Engine</p>
                    </div>

                    {infographicUrl && (
                        <Card className="animate-fadeIn rounded-none p-3 shadow-sm hover:shadow-md border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="relative overflow-hidden rounded-none">
                                <img src={infographicUrl} alt="Infographic" className="w-full h-auto object-contain" />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Refinement Interface */}
                <div className="mt-28">
                    <Card className="p-10 rounded-none bg-slate-100/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 border-dashed shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-end">
                            <div className="space-y-5">
                                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    AI Refinement
                                </label>
                                <Textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Inject directives to refine this draft..."
                                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-800 min-h-[160px] shadow-sm text-sm rounded-none p-6"
                                />
                            </div>
                            <div className="flex flex-col gap-5">
                                <Button
                                    variant="primary"
                                    onClick={handleApplyFeedback}
                                    isLoading={isApplyingFeedback}
                                    disabled={!feedback}
                                    className="px-10 h-16 w-full lg:w-64 text-[11px] font-extrabold tracking-widest shadow-xl shadow-indigo-600/10 dark:shadow-none rounded-none"
                                >
                                    Apply Refinement
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleSaveDraft}
                                    isLoading={isSavingDraft}
                                    className="px-10 h-16 w-full lg:w-64 rounded-none font-bold"
                                >
                                    Save to Review Queue
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
