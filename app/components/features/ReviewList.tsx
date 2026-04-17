'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import {
    FileText, Calendar, ArrowLeft, ArrowRight, X, CheckCircle, XCircle, Zap, Sparkles, Users,
    AlertCircle, Shield, Loader2, Lock
} from 'lucide-react';
import { FloatingToolbar } from './FloatingToolbar';
import { Portal } from '../ui/Portal';
import { CategorySelector } from './CategorySelector';
import { CATEGORIES, LOCKED_CATEGORY_ID } from '@/lib/constants/categories';

export const ReviewList = () => {
    const {
        reviewDrafts, isFetchingDrafts,
        selectedReviewDraft, setSelectedReviewDraft,
        isRejecting, handleRejectDraft,
        isSavingManual, handleSaveManualEdits,
        isPublished, handleApproveDraft,
        feedback, setFeedback,
        isApplyingFeedback, handleApplyReviewFeedback,
        infographicUrl, handleSelectReviewDraft,
        infographicFeedback, setInfographicFeedback, isInfographicRefining,
        handleGenerateInfographic,
        handleClearForm,
        user, role,
        handleRefineSelection, primaryKeyword,
        handleMarkAsReviewed, isPreviewOpen, setIsPreviewOpen,
        selectedCategories, setSelectedCategories
    } = useDashboard();

    const [selectionRect, setSelectionRect] = React.useState<DOMRect | null>(null);
    const [isToolbarVisible, setIsToolbarVisible] = React.useState(false);
    const [isLinkActive, setIsLinkActive] = React.useState(false);
    const [isEditorFocused, setIsEditorFocused] = React.useState(false);
    const [isRefiningVisual, setIsRefiningVisual] = React.useState(false);
    const editorRef = React.useRef<HTMLDivElement>(null);

    const isReadOnly = role === 'editor';

    // Helper for category name
    const getCategoryName = () => {
        const cat = CATEGORIES.find(c => c.id === selectedCategories[0]);
        return cat ? cat.name : 'Uncategorized';
    };

    // Ensure we start at the top when a draft is selected
    React.useEffect(() => {
        if (selectedReviewDraft) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [selectedReviewDraft?.id]);

    // Sync HTML content into the editor DOM only when NOT focused
    React.useEffect(() => {
        if (!isEditorFocused && editorRef.current && selectedReviewDraft?.content) {
            editorRef.current.innerHTML = selectedReviewDraft.content;
        }
    }, [selectedReviewDraft?.content, isEditorFocused]);

    const updateSelectionRect = React.useCallback(() => {
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || !editorRef.current) {
                setIsToolbarVisible(false);
                return;
            }
            const range = selection.getRangeAt(0);
            if (!editorRef.current.contains(range.commonAncestorContainer)) return;
            const container = range.commonAncestorContainer;
            const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
            const activeLink = element?.closest('a') || 
                             selection.anchorNode?.parentElement?.closest('a') || 
                             selection.focusNode?.parentElement?.closest('a');
            setIsLinkActive(!!activeLink);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 && !selection.isCollapsed) {
                setSelectionRect(rect);
                setIsToolbarVisible(true);
            } else {
                setIsToolbarVisible(false);
            }
        }, 0);
    }, []);

    const execCommand = (command: string, value: any = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current && selectedReviewDraft) {
            const newContent = editorRef.current.innerHTML;
            const updatedDraft = { ...selectedReviewDraft, content: newContent };
            setSelectedReviewDraft(updatedDraft);
            handleSaveManualEdits(updatedDraft);
        }
    };

    const handleToolbarAction = async (action: string, value?: string) => {
        if (!editorRef.current) return;
        switch (action) {
            case 'bold': execCommand('bold'); break;
            case 'italic': execCommand('italic'); break;
            case 'unlink':
                if (editorRef.current && selectedReviewDraft) {
                    editorRef.current.focus();
                    document.execCommand('unlink', false, undefined);
                    const html = editorRef.current.innerHTML;
                    const updated = { ...selectedReviewDraft, content: html };
                    setSelectedReviewDraft(updated);
                    handleSaveManualEdits(updated);
                    setIsToolbarVisible(false);
                }
                break;
            case 'link': {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !value) return;
                const range = sel.getRangeAt(0);
                const anchor = document.createElement('a');
                anchor.href = value;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.className = 'text-violet-500 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-600 transition-all font-medium';
                anchor.appendChild(range.extractContents());
                range.insertNode(anchor);
                sel.collapseToEnd();
                if (editorRef.current && selectedReviewDraft) {
                    handleSaveManualEdits({ ...selectedReviewDraft, content: editorRef.current.innerHTML });
                }
                break;
            }
            case 'rephrase':
            case 'shorten':
            case 'expand': {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed) return;
                const selectedText = sel.toString();
                const placeholder = document.createElement('span');
                placeholder.className = 'bg-violet-100 animate-pulse rounded px-1 text-violet-500';
                placeholder.innerText = '✦';
                const liveRange = sel.getRangeAt(0);
                liveRange.deleteContents();
                liveRange.insertNode(placeholder);
                let fullText = '';
                await handleRefineSelection(selectedText, action, (newText: string) => {
                    fullText = newText;
                    placeholder.innerText = fullText;
                });
                const finalNode = document.createTextNode(fullText || selectedText);
                placeholder.parentNode?.replaceChild(finalNode, placeholder);
                if (editorRef.current && selectedReviewDraft) {
                    handleSaveManualEdits({ ...selectedReviewDraft, content: editorRef.current.innerHTML });
                }
                break;
            }
        }
    };

    const filteredDrafts = React.useMemo(() => {
        if (!role || !user) return null;
        if (role === 'admin') return reviewDrafts;
        return reviewDrafts.filter(d => d.createdBy === user?.uid);
    }, [reviewDrafts, role, user]);

    if (selectedReviewDraft) {
        return (
            <div className="animate-fadeIn w-full max-w-5xl mx-auto space-y-12 pb-32">
                {/* MORNING BASELINE TOP BAR: Back + Category */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => setSelectedReviewDraft(null)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">WordPress Category</span>
                        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-none px-4 py-2 bg-white dark:bg-slate-900 group">
                            <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                            <select 
                                value={selectedCategories[0] || ''}
                                onChange={(e) => setSelectedCategories(e.target.value ? [Number(e.target.value)] : [])}
                                className="bg-transparent text-[11px] font-bold text-slate-400 outline-none cursor-pointer focus:ring-0 select-none appearance-none min-w-[120px]"
                            >
                                <option value="">Select Category</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* THE CINEMATIC HERO (RESTORED MORNING STYLE) */}
                <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl relative bg-slate-100 dark:bg-slate-900">
                    <div className="relative aspect-[16/9] w-full overflow-hidden flex flex-col items-center justify-center p-12 text-center">
                        {selectedReviewDraft.imageUrl ? (
                            <>
                                <img 
                                    src={selectedReviewDraft.imageUrl} 
                                    alt={selectedReviewDraft.title} 
                                    className="absolute inset-0 w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-violet-900/40 mix-blend-multiply" />
                                
                                {/* Overlay Content Header Labels */}
                                <div className="absolute top-12 left-12 flex items-center gap-3">
                                    <div className="bg-violet-600 px-6 py-2 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl border border-white/10">
                                        Blog
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-xl px-6 py-2 text-white font-bold text-[10px] uppercase tracking-[0.2em] border border-white/20">
                                        {getCategoryName()}
                                    </div>
                                </div>

                                {/* CENTERED TITLE GROUP OVERLAY (MORNING STYLE) */}
                                <div className="relative z-10 max-w-[85%] mx-auto space-y-6 flex flex-col items-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full mb-4">
                                        <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Production Draft</span>
                                    </div>
                                    <textarea
                                        value={selectedReviewDraft.title}
                                        onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                        className="w-full bg-transparent border-none p-0 text-center text-4xl lg:text-6xl font-black leading-tight text-white focus:ring-0 resize-none scroll-hidden drop-shadow-2xl"
                                        rows={2}
                                    />
                                </div>

                                <img src="/10xDS.png" className="absolute bottom-12 right-12 h-12 w-auto object-contain opacity-90" alt="logo" />
                            </>
                        ) : (
                            <div className="relative z-10 w-full">
                                <textarea
                                    value={selectedReviewDraft.title}
                                    onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 text-center text-4xl lg:text-6xl font-black text-slate-950 focus:ring-0 leading-tight resize-none scroll-hidden"
                                    rows={2}
                                />
                            </div>
                        )}
                    </div>

                    {/* DYNAMIC DOCUMENT CONTENT (RESTORED BASELINE FLOW) */}
                    <div className="p-12 lg:p-20 relative bg-white dark:bg-slate-950">
                        {selectionRect && (
                            <FloatingToolbar
                                isVisible={isToolbarVisible}
                                rect={selectionRect}
                                onAction={handleToolbarAction}
                                isLink={isLinkActive}
                                onClose={() => {
                                    setIsToolbarVisible(false);
                                    setSelectionRect(null);
                                }}
                            />
                        )}
                        <div 
                            ref={editorRef}
                            contentEditable={!isReadOnly}
                            onMouseUp={updateSelectionRect}
                            onFocus={() => setIsEditorFocused(true)}
                            onBlur={() => {
                                setIsEditorFocused(false);
                                handleSaveManualEdits({ ...selectedReviewDraft, content: editorRef.current?.innerHTML || '' });
                            }}
                            className="outline-none prose prose-slate prose-lg lg:prose-xl dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed font-sans min-h-[400px]"
                        />

                        {/* Infographic Logic (PROPERLY PRESERVED) */}
                        {selectedReviewDraft.infographicUrl && (
                            <div className="mt-24 pt-16 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-10">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Executive Summary Visual</h4>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                        className="text-[10px] uppercase font-black tracking-widest text-violet-600 border-violet-100 border px-4 h-9 rounded-xl"
                                    >
                                        {isRefiningVisual ? 'Close Refinement' : 'Refine Design'}
                                    </Button>
                                </div>
                                <div className="space-y-12">
                                    {isRefiningVisual && (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-10 space-y-6 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                                            <Textarea
                                                value={infographicFeedback}
                                                onChange={(e) => setInfographicFeedback(e.target.value)}
                                                placeholder="Describe your design adjustments..."
                                                className="w-full bg-white dark:bg-slate-950 border-slate-200 rounded-2xl p-6 text-sm"
                                            />
                                            <Button
                                                variant="primary"
                                                onClick={() => handleGenerateInfographic(infographicFeedback)}
                                                isLoading={isInfographicRefining}
                                                className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-[11px] font-black tracking-widest uppercase rounded-xl"
                                            >
                                                Regenerate Visual Artifact
                                            </Button>
                                        </div>
                                    )}
                                    <div className="shadow-2xl rounded-[3rem] overflow-hidden border border-slate-100 dark:border-slate-800"><img src={selectedReviewDraft.infographicUrl} alt="infographic" className="w-full h-auto" /></div>
                                </div>
                            </div>
                        )}

                        {/* BOTTOM ACTIONS AND AI INTERFACE (RESTORED MORNING PLACEMENT) */}
                        <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800 space-y-12">
                            {/* AI Context Interface */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse"></div>
                                    <span className="text-[11px] font-black text-violet-900 dark:text-violet-400 uppercase tracking-widest">Global Refinement Context</span>
                                </div>
                                <Textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Instruct AI to rewrite or adjust the tone of this draft..."
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 text-base shadow-inner min-h-[140px]"
                                />
                                <Button
                                    variant="primary"
                                    onClick={handleApplyReviewFeedback}
                                    isLoading={isApplyingFeedback}
                                    disabled={!feedback}
                                    className="w-full h-16 bg-violet-600 hover:bg-violet-700 text-[11px] font-black tracking-widest uppercase rounded-2xl shadow-xl shadow-violet-200 dark:shadow-none"
                                >
                                    Apply Global Refinement Pass
                                </Button>
                            </div>

                            {/* Final Audit Row */}
                            <div className="flex flex-col lg:flex-row gap-4 pt-4">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                                    isLoading={isRejecting}
                                    className="flex-1 h-14 bg-white dark:bg-slate-900 text-red-600 border-red-100 dark:border-red-900/40 hover:bg-red-50 font-bold text-[10px] tracking-widest uppercase rounded-2xl"
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject Draft
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)}
                                    className="flex-1 h-14 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 font-bold text-[10px] tracking-widest uppercase rounded-2xl"
                                >
                                    Mark as Reviewed
                                </Button>
                                <Button 
                                    variant="primary" 
                                    onClick={() => handleApproveDraft(selectedReviewDraft)}
                                    isLoading={isPublished}
                                    className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Publish to WordPress
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    /* ── QUEUE LISTING View (PRESERVED) ── */
    return (
        <div className="animate-fadeIn w-full max-w-5xl mx-auto space-y-12 pb-32">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-[12px] font-black tracking-[0.3em] text-slate-400 uppercase">Editorial Workflow Buffer ({filteredDrafts?.length || 0})</h2>
            </div>
            <div className="grid grid-cols-1 gap-8">
                {isFetchingDrafts || filteredDrafts === null ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-8 items-center p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl shrink-0" />
                            <div className="flex-1 space-y-4"><div className="h-6 w-1/3 bg-slate-100" /><div className="h-4 w-1/4 bg-slate-100" /></div>
                        </div>
                    ))
                ) : filteredDrafts.length > 0 ? (
                    filteredDrafts.map((draft) => (
                        <Card key={draft.id} hoverable className="p-10 cursor-pointer group border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden" onClick={() => handleSelectReviewDraft(draft.id)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <div className="w-20 h-20 rounded-[2rem] bg-violet-50 dark:bg-violet-900/10 border border-violet-100 flex items-center justify-center group-hover:bg-violet-600 transition-all duration-700">
                                        <FileText className="w-10 h-10 text-violet-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors tracking-tight">{draft.title}</h3>
                                        <div className="flex items-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(draft.createdAt || draft.created_at).toLocaleDateString()}</span>
                                            {draft.authorEmail && <span className="text-violet-400 lowercase font-medium italic">by {draft.authorEmail}</span>}
                                            <Badge variant="outline" className="px-4 py-1 rounded-full border-slate-200 dark:border-slate-800">Ready</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-8 group-hover:translate-x-0">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">Enter Terminal</span>
                                    <ArrowRight className="w-6 h-6 text-violet-600" />
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="bg-white/40 border-2 border-dashed border-violet-100 rounded-[3rem] p-24 text-center">
                        <Zap className="w-16 h-16 text-violet-200 mx-auto mb-8 animate-pulse" />
                        <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-widest">Workflow Synchronized</h3>
                        <p className="text-sm text-slate-500 italic max-w-sm mx-auto font-medium">No pending drafts detected in the editorial archive.</p>
                    </div>
                )}
            </div>

            {/* RESTORED MORNING PREVIEW MODAL proporations */}
            {isPreviewOpen && selectedReviewDraft && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fadeIn">
                        <div className="bg-white dark:bg-slate-950 w-[96%] max-w-[1440px] h-[94vh] flex flex-col rounded-[3rem] shadow-2xl relative animate-scaleIn overflow-hidden border border-white/10">
                            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-10 right-10 p-4 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all z-30 shadow-xl">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-16 lg:p-32 flex flex-col items-center bg-slate-50 dark:bg-[#060606]">
                                <div className="max-w-[850px] w-full space-y-24">
                                    <h1 className="text-5xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05] text-center drop-shadow-sm">{selectedReviewDraft.title}</h1>
                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative rounded-[3.5rem] overflow-hidden shadow-[0_64px_120px_-32px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 md:aspect-[4/3]">
                                             <img src={selectedReviewDraft.imageUrl} className="w-full h-full object-cover" alt="preview" />
                                             <div className="absolute inset-0 bg-violet-900/40 mix-blend-multiply" />
                                        </div>
                                    )}
                                    <article dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} className="prose prose-stone prose-2xl dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-[1.6] pb-32" />
                                </div>
                            </div>
                            <div className="p-12 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-6 bg-white dark:bg-[#0a0a0a]">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-12 h-16 rounded-[1.5rem] border-slate-200 dark:border-slate-800 font-bold uppercase tracking-widest text-[11px] shadow-sm">Continue Review</Button>
                                <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-16 h-16 bg-emerald-600 hover:bg-emerald-700 rounded-[1.5rem] shadow-emerald-200/50 font-black uppercase tracking-[0.3em] text-[11px]">
                                    <CheckCircle className="w-5 h-5 mr-4" />Confirm & Go Live
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};
