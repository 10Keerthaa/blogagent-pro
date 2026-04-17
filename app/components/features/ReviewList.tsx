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

    return (
        <div className="relative w-full">
            {selectedReviewDraft ? (
                <div className="animate-fadeIn w-full space-y-10">
                    {/* Header Actions (Inside Flow) */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setSelectedReviewDraft(null)}
                                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Back to Queue</span>
                            </button>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                            <Badge variant="pending" className="px-4 py-1 bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 rounded-full font-bold">
                                Editorial Review
                            </Badge>
                        </div>

                        {/* WordPress Category Block (Restored) */}
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WordPress Category</span>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group hover:border-violet-200 transition-all">
                                <Shield className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                                <span className="text-[11px] font-bold text-slate-400">Blog /</span>
                                <select 
                                    value={selectedCategories[0] || ''}
                                    onChange={(e) => setSelectedCategories(e.target.value ? [Number(e.target.value)] : [])}
                                    className="bg-transparent border-none p-0 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer min-w-[100px]"
                                >
                                    <option value="">Select Category</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Scribe Box (The Document) */}
                    <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-200 dark:border-slate-800 group/scribe">
                        
                        {/* THE ELITE HERO OVERLAY */}
                        <div className="relative overflow-hidden w-full h-[400px] lg:h-[480px]">
                            {selectedReviewDraft.imageUrl ? (
                                <>
                                    <img 
                                        src={selectedReviewDraft.imageUrl} 
                                        alt={selectedReviewDraft.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/scribe:scale-105" 
                                    />
                                    {/* Brand Multi-Tint Overlay */}
                                    <div className="absolute inset-0 bg-violet-700/50 mix-blend-multiply" />
                                    
                                    {/* Placements from Housekeeping Innovations reference */}
                                    <div className="absolute inset-0 p-10 lg:p-12">
                                        {/* Top Left Group: Blog Tag + Title */}
                                        <div className="absolute top-10 left-10 right-24 text-white">
                                            <div className="bg-violet-600 px-5 py-2 text-white font-bold text-sm shadow-xl w-fit mb-8">
                                                Blog
                                            </div>
                                            
                                            <textarea
                                                value={selectedReviewDraft.title}
                                                onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                                className="w-full bg-transparent border-none p-0 text-3xl lg:text-4xl font-extrabold tracking-tight text-white focus:ring-0 leading-tight resize-none drop-shadow-2xl scroll-hidden"
                                                rows={3}
                                            />
                                        </div>

                                        {/* Bottom Right: Logo Pill */}
                                        <div className="absolute bottom-10 right-10">
                                            <div className="bg-white p-3 lg:p-4 rounded-xl shadow-2xl">
                                                <img src="/10xDS.png" alt="logo" className="h-10 lg:h-12 w-auto object-contain" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Fallback Solid Hero with Orb */
                                <div className="w-full h-full bg-violet-700 relative overflow-hidden flex items-end p-12">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500 rounded-full blur-[120px] mix-blend-screen pointer-events-none -mr-64 -mt-64 opacity-60 animate-pulse" />
                                    <div className="relative z-10 w-full space-y-6">
                                        <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white rounded-none tracking-widest px-4">GENERIC HERO</Badge>
                                        <textarea
                                            value={selectedReviewDraft.title}
                                            onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-3xl lg:text-5xl font-black text-white focus:ring-0 leading-tight resize-none scroll-hidden"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SCROLLABLE DOCUMENT CONTENT */}
                        <div className="p-10 lg:p-16 relative bg-white dark:bg-slate-950">
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
                                className="prose prose-slate prose-lg lg:prose-xl max-w-none focus:outline-none dark:prose-invert min-h-[400px]"
                            />

                            {/* Infographic Re-integration */}
                            {selectedReviewDraft.infographicUrl && (
                                <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                        <h4 className="mx-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Vertical Visualization</h4>
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                            className="ml-6 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 hover:bg-violet-50 transition-all flex items-center gap-2 px-4 border border-violet-100"
                                        >
                                            {isRefiningVisual ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                            {isRefiningVisual ? 'Close Refinement' : 'Refine Graphics'}
                                        </Button>
                                    </div>
                                    <div className="space-y-8">
                                        {isRefiningVisual && (
                                            <div className="bg-slate-50 dark:bg-slate-900 p-8 space-y-4 animate-fadeIn border border-slate-200 dark:border-slate-800">
                                                <Textarea
                                                    value={infographicFeedback}
                                                    onChange={(e) => setInfographicFeedback(e.target.value)}
                                                    placeholder="E.g., 'Change the secondary color to emerald...'"
                                                    className="w-full bg-white dark:bg-slate-950 min-h-[120px] p-6 text-sm focus:ring-violet-500 border-none shadow-sm"
                                                />
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleGenerateInfographic(infographicFeedback)}
                                                    isLoading={isInfographicRefining}
                                                    disabled={!infographicFeedback.trim()}
                                                    className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-xs font-bold uppercase tracking-widest"
                                                >
                                                    Regenerate Visual Artifact
                                                </Button>
                                            </div>
                                        )}
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden group/visual">
                                            <img src={selectedReviewDraft.infographicUrl} alt="Visual" className="w-full h-auto transition-all duration-700" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AUDIT & CONTROL FOOTER (Integrated into Flow) */}
                            <div className="mt-24 pt-16 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-10">
                                
                                {/* AI Refinement Bar */}
                                <div className="bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/40 p-10 flex flex-col gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 bg-violet-600 rounded-full animate-pulse" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-violet-800 dark:text-violet-400">Collaborative Refinement</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            placeholder="E.g., 'Make the tone more punchy' or 'Add a section on ROI'..."
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            className="flex-1 bg-white dark:bg-slate-950 border border-violet-200 dark:border-violet-900 rounded-xl px-6 h-16 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                                        />
                                        <button
                                            onClick={handleApplyReviewFeedback}
                                            disabled={!feedback || isApplyingFeedback}
                                            className="flex items-center gap-3 px-8 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-violet-200 dark:shadow-none active:scale-95"
                                        >
                                            {isApplyingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                            Apply AI Fix
                                        </button>
                                    </div>
                                </div>

                                {/* Auditing Action Bar */}
                                <div className="flex items-center justify-between pb-10">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setIsPreviewOpen(true)}
                                            className="px-8 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm flex items-center gap-2"
                                        >
                                            Full Preview
                                        </button>
                                        <button
                                            onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                                            disabled={isRejecting}
                                            className="px-8 h-14 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm flex items-center gap-3"
                                        >
                                            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                            Reject
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)}
                                            className="px-8 h-14 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm"
                                        >
                                            Ready for Live
                                        </button>
                                        <button
                                            onClick={() => handleApproveDraft(selectedReviewDraft)}
                                            disabled={isPublished}
                                            className="px-10 h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95 flex items-center gap-3"
                                        >
                                            {isPublished ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                            Approve & Publish
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Spacer for flow */}
                    <div className="h-24" />
                </div>
            ) : (
                <div className="animate-fadeIn w-full space-y-10 pb-24 transition-all duration-500 px-4 lg:px-8">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Editorial Buffer ({filteredDrafts?.length || 0})</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {isFetchingDrafts || filteredDrafts === null ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-6 items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                                    <Skeleton className="w-16 h-16 rounded-2xl shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/4" /></div>
                                </div>
                            ))
                        ) : filteredDrafts.length > 0 ? (
                            filteredDrafts.map((draft) => (
                                <Card key={draft.id} hoverable className="p-8 cursor-pointer group border-slate-200 dark:border-slate-800" onClick={() => handleSelectReviewDraft(draft.id)}>
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
                                                    <Badge variant="outline" className="px-3">Draft</Badge>
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
                            <div className="bg-white/40 dark:bg-violet-950/5 backdrop-blur-sm border-2 border-dashed border-violet-100 dark:border-violet-900/40 rounded-3xl p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-violet-50 dark:bg-violet-950/30 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-violet-100 dark:ring-violet-900/50 shadow-inner">
                                    <Zap className="w-10 h-10 text-violet-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editorial Buffer Empty</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is ready for new high-intent content generations.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL */}
            {isPreviewOpen && selectedReviewDraft && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white dark:bg-slate-950 w-[96%] max-w-[1440px] h-[94vh] flex flex-col rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-scaleIn overflow-hidden border border-slate-200 dark:border-slate-800">
                            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all z-30 shadow-sm">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24 flex flex-col items-center">
                                <div className="max-w-[850px] w-full space-y-16">
                                    <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight text-center">
                                        {selectedReviewDraft.title}
                                    </h1>

                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative group overflow-hidden rounded-none shadow-2xl border border-slate-100 dark:border-slate-800 w-full aspect-[4/3]">
                                            <img src={selectedReviewDraft.imageUrl} alt={selectedReviewDraft.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-violet-700/45" />
                                            <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 text-center text-white space-y-6">
                                                 <img src="/Blog.png" className="h-10 w-auto mx-auto mb-4" alt="blog" />
                                                 <h2 className="text-4xl lg:text-5xl font-bold drop-shadow-2xl">{selectedReviewDraft.title}</h2>
                                                 <img src="/10xDS.png" className="h-14 w-auto mx-auto mt-10" alt="logo" />
                                            </div>
                                        </div>
                                    )}
                                    <article dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} className="text-black dark:text-white text-lg leading-relaxed prose prose-stone dark:prose-invert max-w-none" />
                                </div>
                            </div>
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-8 h-14 rounded-none">Continue Editing</Button>
                                <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-8 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-none shadow-lg">
                                    Approve & Publish Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};
