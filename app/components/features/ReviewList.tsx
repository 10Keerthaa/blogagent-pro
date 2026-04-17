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
    AlertCircle, Shield, Loader2
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
            
            const isInsideLink = !!activeLink;
            setIsLinkActive(isInsideLink);
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
                    const latestHtml = editorRef.current.innerHTML;
                    const updatedDraft = { ...selectedReviewDraft, content: latestHtml };
                    setSelectedReviewDraft(updatedDraft);
                    handleSaveManualEdits(updatedDraft);
                    setIsToolbarVisible(false);
                    setSelectionRect(null);
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
                    const html = editorRef.current.innerHTML;
                    const updatedDraft = { ...selectedReviewDraft, content: html };
                    setSelectedReviewDraft(updatedDraft);
                    handleSaveManualEdits(updatedDraft);
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
                placeholder.className = 'bg-violet-100 dark:bg-violet-900/30 animate-pulse rounded px-1 text-violet-500';
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
                    const html = editorRef.current.innerHTML;
                    const updatedDraft = { ...selectedReviewDraft, content: html };
                    setSelectedReviewDraft(updatedDraft);
                    handleSaveManualEdits(updatedDraft);
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

    // Helper for category name
    const getCategoryName = () => {
        const cat = CATEGORIES.find(c => c.id === selectedCategories[0]);
        return cat ? cat.name : 'Uncategorized';
    };

    return (
        <div className="relative w-full">
            {selectedReviewDraft ? (
                <div className="animate-fadeIn w-full space-y-10">
                    {/* Integrated Header (Back + Category) */}
                    <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setSelectedReviewDraft(null)}
                                className="flex items-center gap-2.5 px-3 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Back to Queue</span>
                            </button>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                            <Badge variant="pending" className="px-5 py-1.5 bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-none">
                                Editorial Review
                            </Badge>
                        </div>

                        {/* WordPress Category Block */}
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WordPress Category</span>
                            <div className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group hover:border-violet-200 transition-all shadow-sm">
                                <Shield className="w-4 h-4 text-slate-400 group-hover:text-violet-500 transition-colors" />
                                <span className="text-[11px] font-bold text-slate-400">Blog /</span>
                                <select 
                                    value={selectedCategories[0] || ''}
                                    onChange={(e) => setSelectedCategories(e.target.value ? [Number(e.target.value)] : [])}
                                    className="bg-transparent border-none p-0 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer min-w-[120px]"
                                >
                                    <option value="">Select Category</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* THE PAPER (Document Card) — Exactly max-w-4xl mx-auto */}
                    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-200/60 dark:border-slate-800 mb-12 group/scribe transition-all">
                        
                        {/* THE HERO BLOCK — Exactly min-h-[360px] flex flex-col justify-end p-12 lg:p-16 */}
                        <div className="relative min-h-[360px] lg:min-h-[420px] flex flex-col justify-end overflow-hidden group">
                            {selectedReviewDraft.imageUrl ? (
                                <>
                                    <img 
                                        src={selectedReviewDraft.imageUrl} 
                                        alt={selectedReviewDraft.title} 
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover/scribe:scale-110" 
                                    />
                                    {/* AI Studio Overlay Tint */}
                                    <div className="absolute inset-0 bg-violet-700/50 mix-blend-multiply" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-violet-950/90 via-violet-950/20 to-transparent" />
                                    
                                    {/* Placements (Tags at Top, Title at Bottom via p-12 lg:p-16) */}
                                    <div className="relative z-10 w-full p-12 lg:p-16">
                                        {/* Top Left Tags (Pinned absolutely within the padding box) */}
                                        <div className="absolute top-12 left-12 flex items-center gap-3">
                                            <div className="bg-violet-600 px-5 py-2 text-white font-bold text-[10px] uppercase tracking-widest shadow-2xl">
                                                Blog
                                            </div>
                                            <div className="bg-black/60 backdrop-blur-md px-5 py-2 text-white font-bold text-[10px] uppercase tracking-widest border border-white/10 shadow-2xl">
                                                {getCategoryName()}
                                            </div>
                                        </div>

                                        {/* H1 Title — Text-4xl lg:text-5xl font-bold leading-tight */}
                                        <textarea
                                            value={selectedReviewDraft.title}
                                            onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-4xl lg:text-6xl font-bold tracking-tight text-white focus:ring-0 leading-tight resize-none drop-shadow-2xl scroll-hidden"
                                            rows={2}
                                        />
                                    </div>

                                    {/* Brand Logo (Bottom Right) */}
                                    <div className="absolute bottom-12 right-12 z-20">
                                        <div className="bg-white p-4 rounded-xl shadow-2xl transition-transform hover:scale-105 duration-300">
                                            <img src="/10xDS.png" alt="logo" className="h-10 lg:h-12 w-auto object-contain" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Fallback Solid Hero */
                                <div className="absolute inset-0 bg-violet-700 flex flex-col justify-end p-12 lg:p-16">
                                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500 rounded-full blur-[140px] opacity-40 animate-pulse" />
                                    <div className="relative z-10 space-y-6">
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 text-white text-[10px] font-black uppercase tracking-widest w-fit border border-white/10">Draft Archive</div>
                                        <textarea
                                            value={selectedReviewDraft.title}
                                            onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-4xl lg:text-6xl font-black text-white focus:ring-0 leading-tight resize-none scroll-hidden"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DOCUMENT BODY — Prose text-lg leading-relaxed text-slate-700 */}
                        <div className="p-12 lg:p-16 lg:pt-20 relative bg-white dark:bg-slate-950">
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
                                onKeyUp={updateSelectionRect}
                                onFocus={() => setIsEditorFocused(true)}
                                onBlur={() => {
                                    setIsEditorFocused(false);
                                    const html = editorRef.current?.innerHTML || '';
                                    const updatedDraft = { ...selectedReviewDraft, content: html };
                                    setSelectedReviewDraft(updatedDraft);
                                    handleSaveManualEdits(updatedDraft);
                                }}
                                className="prose prose-slate text-lg lg:text-xl leading-relaxed text-slate-700 dark:text-slate-300 max-w-none focus:outline-none min-h-[500px]"
                            />

                            {/* Infographic Section */}
                            {selectedReviewDraft.infographicUrl && (
                                <div className="mt-24 pt-16 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center justify-between mb-12">
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                        <h4 className="mx-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Integrated Visuals</h4>
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                            className="ml-8 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 hover:bg-violet-50 transition-all px-5 border border-violet-100/50"
                                        >
                                            {isRefiningVisual ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                            {isRefiningVisual ? 'Close Refinement' : 'Refine Component'}
                                        </Button>
                                    </div>
                                    <div className="space-y-10">
                                        {isRefiningVisual && (
                                            <div className="bg-slate-50 dark:bg-slate-900 p-8 space-y-5 animate-fadeIn border border-slate-200 dark:border-slate-800 rounded-2xl">
                                                <Textarea
                                                    value={infographicFeedback}
                                                    onChange={(e) => setInfographicFeedback(e.target.value)}
                                                    placeholder="E.g., 'Make the connecting lines more subtle'..."
                                                    className="w-full bg-white dark:bg-slate-950 min-h-[140px] p-6 text-sm focus:ring-violet-500 border-slate-200 dark:border-slate-800"
                                                />
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleGenerateInfographic(infographicFeedback)}
                                                    isLoading={isInfographicRefining}
                                                    disabled={!infographicFeedback.trim()}
                                                    className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-[11px] font-black uppercase tracking-widest rounded-xl"
                                                >
                                                    Regenerate High-Resolution Visual
                                                </Button>
                                            </div>
                                        )}
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)] overflow-hidden rounded-[2rem]">
                                            <img src={selectedReviewDraft.infographicUrl} alt="Visual" className="w-full h-auto" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AUDIT & CONTROL TOOLBAR (Pixel Perfect Docked) */}
                            <div className="mt-24 pt-16 border-t border-slate-100 dark:border-slate-800 flex flex-col -mx-12 lg:-mx-16 -mb-12 lg:-mb-16">
                                
                                {/* Row 1: AI Editor — px-6 py-3.5 */}
                                <div className="px-8 lg:px-12 py-3.5 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/40 flex items-center gap-6">
                                    <div className="flex items-center gap-3.5 shrink-0">
                                        <div className="h-2.5 w-2.5 bg-violet-600 rounded-full animate-pulse shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-800 dark:text-violet-300">AI Editor</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Describe semantic edits (e.g., 'Make the tone more assertive')"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        className="flex-1 bg-white/60 dark:bg-slate-900/60 border border-violet-100 dark:border-violet-800 rounded-xl px-6 h-12 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none transition-all placeholder:italic"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && feedback && !isApplyingFeedback) {
                                                handleApplyReviewFeedback();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleApplyReviewFeedback}
                                        disabled={!feedback || isApplyingFeedback}
                                        className="flex items-center gap-3.5 px-8 h-12 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-violet-200 dark:shadow-none active:scale-95 shrink-0"
                                    >
                                        {isApplyingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        Apply Refinement
                                    </button>
                                </div>

                                {/* Row 2: Actions — px-6 py-4 */}
                                <div className="px-8 lg:px-12 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setIsPreviewOpen(true)}
                                            className="px-8 py-2.5 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2"
                                        >
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                                            disabled={isRejecting}
                                            className="px-8 py-2.5 h-12 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-3"
                                        >
                                            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                            Reject
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)}
                                            className="px-8 py-2.5 h-12 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm"
                                        >
                                            Mark Reviewed
                                        </button>
                                        <button
                                            onClick={() => handleApproveDraft(selectedReviewDraft)}
                                            disabled={isPublished}
                                            className="px-10 py-2.5 h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95 flex items-center gap-3"
                                        >
                                            {isPublished ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                            Approve & Publish
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* The Draft List (Queues) */
                <div className="animate-fadeIn w-full space-y-10 pb-24 transition-all duration-500 px-4 lg:px-8">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Editorial Buffer ({filteredDrafts?.length || 0})</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {isFetchingDrafts || filteredDrafts === null ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-6 items-center p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                                    <Skeleton className="w-16 h-16 rounded-[1.25rem] shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/4" /></div>
                                </div>
                            ))
                        ) : filteredDrafts.length > 0 ? (
                            filteredDrafts.map((draft) => (
                                <Card key={draft.id} hoverable className="p-8 cursor-pointer group border-slate-200 dark:border-slate-800 overflow-hidden" onClick={() => handleSelectReviewDraft(draft.id)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-7">
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/50 flex items-center justify-center group-hover:bg-violet-600 group-hover:border-violet-600 transition-all duration-500 shadow-sm">
                                                <FileText className="w-8 h-8 text-violet-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors tracking-tight">{draft.title}</h3>
                                                <div className="flex items-center gap-6">
                                                    <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(draft.createdAt || draft.created_at).toLocaleDateString()}
                                                    </span>
                                                    {draft.authorEmail && <span className="text-[10px] font-medium text-violet-400 lowercase italic">by {draft.authorEmail}</span>}
                                                    <Badge variant="outline" className="px-3 border-slate-200 dark:border-slate-800 text-[9px] uppercase tracking-widest font-black">Ready</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-violet-500">Launch Review</span>
                                            <ArrowRight className="w-5 h-5 text-violet-500" />
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="bg-white/40 dark:bg-violet-950/5 backdrop-blur-sm border-2 border-dashed border-violet-100 dark:border-violet-900/40 rounded-[2rem] p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-violet-50 dark:bg-violet-950/30 rounded-[1.25rem] flex items-center justify-center mx-auto mb-8 ring-1 ring-violet-100 dark:ring-violet-900/50 shadow-inner">
                                    <Zap className="w-10 h-10 text-violet-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Queue Clear</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed mx-auto italic">All high-intent drafts have been processed.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL */}
            {isPreviewOpen && selectedReviewDraft && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white dark:bg-slate-950 w-[96%] max-w-[1440px] h-[94vh] flex flex-col rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-scaleIn overflow-hidden border border-slate-200 dark:border-slate-800">
                            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all z-30 shadow-sm">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24 flex flex-col items-center">
                                <div className="max-w-[850px] w-full space-y-16">
                                    <h1 className="text-4xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight text-center">
                                        {selectedReviewDraft.title}
                                    </h1>

                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full mb-12">
                                            <img src={selectedReviewDraft.imageUrl} alt={selectedReviewDraft.title} className="w-full h-auto object-cover" />
                                            <div className="absolute inset-0 bg-violet-700/45" />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-12 text-center space-y-8">
                                                 <img src="/Blog.png" className="h-10 lg:h-12 w-auto mb-4" alt="blog" />
                                                 <h2 className="text-3xl lg:text-5xl font-bold drop-shadow-2xl">{selectedReviewDraft.title}</h2>
                                                 <img src="/10xDS.png" className="h-12 lg:h-16 w-auto mt-10" alt="logo" />
                                            </div>
                                        </div>
                                    )}
                                    <article dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} className="text-black dark:text-white text-lg lg:text-xl leading-relaxed prose prose-stone lg:prose-xl dark:prose-invert max-w-none" />
                                </div>
                            </div>
                            <div className="p-10 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-5 bg-slate-50/50 dark:bg-slate-900/50">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-10 h-16 rounded-2xl border border-slate-200 shadow-sm font-bold tracking-widest text-[11px] uppercase">Continue Design</Button>
                                <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-12 h-16 bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-xl shadow-emerald-600/10 font-black tracking-[0.2em] text-[11px] uppercase">
                                    <CheckCircle className="w-5 h-5 mr-3" />Approve & Go Live
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};
