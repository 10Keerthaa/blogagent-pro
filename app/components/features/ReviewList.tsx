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
            /* ── THE EDITOR-MIRROR TRAPPED ARCHITECTURE ── */
            <div className="flex-1 h-full flex flex-col bg-slate-100/30 dark:bg-[#0a0a0a] relative overflow-hidden animate-fadeIn">
                
                {/* 1. FIXED TOP TERMINAL HEADER — Pinned at the very top of the 60% panel */}
                <div className="h-16 bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-slate-800 flex items-center px-8 justify-between flex-shrink-0 z-20 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-8">
                        <button 
                            onClick={() => setSelectedReviewDraft(null)}
                            className="flex items-center gap-2.5 text-[11px] font-black tracking-[0.2em] uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                            Back to Queue
                        </button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                        <div className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-black tracking-widest uppercase shadow-lg shadow-violet-200 dark:shadow-none">
                            Editorial Review
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-1 pointer-events-none">WordPress Category</span>
                            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-900 group hover:border-violet-300 dark:hover:border-violet-700 transition-all shadow-sm">
                                <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                                <span className="text-[11px] font-bold text-slate-400">Blog /</span>
                                <select 
                                    value={selectedCategories[0] || ''}
                                    onChange={(e) => setSelectedCategories(e.target.value ? [Number(e.target.value)] : [])}
                                    className="bg-transparent text-[11px] font-extrabold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-0 select-none appearance-none min-w-[140px]"
                                >
                                    <option value="">Select Category</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. SCROLLABLE CINEMATIC CANVAS — Document Box sitter */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar scroll-smooth">
                    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-950 rounded-[3rem] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.1)] dark:shadow-none border border-slate-100/60 dark:border-slate-800/60 overflow-hidden mb-16 animate-slideUp">
                        
                        {/* THE HERO BLOCK — Optimized Baseline Layout */}
                        <div className="relative text-white p-16 lg:p-20 overflow-hidden min-h-[420px] lg:min-h-[500px] flex flex-col justify-end group">
                            {selectedReviewDraft.imageUrl ? (
                                <>
                                    <img 
                                        src={selectedReviewDraft.imageUrl}
                                        alt={selectedReviewDraft.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
                                    />
                                    {/* Brand Visual Stack */}
                                    <div className="absolute inset-0 bg-violet-900/60 mix-blend-multiply" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                                    
                                    {/* Header Overlays (Pinned to top within padding) */}
                                    <div className="absolute top-16 left-16 flex items-center gap-4">
                                        <div className="bg-violet-600 px-6 py-2.5 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl">
                                            Blog
                                        </div>
                                        <div className="bg-black/60 backdrop-blur-xl px-6 py-2.5 text-white font-black text-[10px] uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
                                            {getCategoryName()}
                                        </div>
                                    </div>

                                    {/* Baseline Content Title */}
                                    <div className="relative z-10 w-full animate-slideUp">
                                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 mb-10">
                                            <FileText className="w-4 h-4 text-white/80" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Production Draft</span>
                                        </div>
                                        <textarea
                                            value={selectedReviewDraft.title}
                                            onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-4xl lg:text-5xl font-black leading-tight text-white focus:ring-0 resize-none scroll-hidden drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
                                            rows={2}
                                        />
                                    </div>

                                    {/* Signature 10xDS Logo (Bottom Right) */}
                                    <div className="absolute bottom-16 right-16 z-20 transition-transform hover:scale-110 duration-500">
                                        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl">
                                            <img src="/10xDS.png" alt="logo" className="h-10 lg:h-12 w-auto object-contain" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-violet-700 flex flex-col justify-end p-20">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[160px] animate-pulse" />
                                    <textarea
                                        value={selectedReviewDraft.title}
                                        onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                        className="relative z-10 w-full bg-transparent border-none p-0 text-4xl lg:text-5xl font-black text-white focus:ring-0 leading-tight resize-none scroll-hidden"
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* DYNAMIC DOCUMENT CONTENT Wrapper */}
                        <div className="p-16 lg:p-20 lg:pt-24 relative bg-white dark:bg-slate-950">
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
                                className="outline-none prose prose-slate prose-violet max-w-none text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-sans min-h-[400px]"
                            />

                            {/* Infographic Logic */}
                            {selectedReviewDraft.infographicUrl && (
                                <div className="mt-24 pt-20 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-12">
                                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] select-none">Executive Infographic</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                            className="text-[10px] uppercase font-black tracking-widest text-violet-600 border-violet-100/50 border px-6 h-10 rounded-xl"
                                        >
                                            {isRefiningVisual ? 'Cancel Refine' : 'Refine Visual'}
                                        </Button>
                                    </div>
                                    <div className="space-y-12">
                                        {isRefiningVisual && (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-10 space-y-6 rounded-[2rem] animate-fadeIn border border-slate-200 dark:border-slate-800 shadow-inner">
                                                <Textarea
                                                    value={infographicFeedback}
                                                    onChange={(e) => setInfographicFeedback(e.target.value)}
                                                    placeholder="Specify design changes (e.g., 'Make colors more subtle')..."
                                                    className="w-full min-h-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-sm"
                                                />
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleGenerateInfographic(infographicFeedback)}
                                                    isLoading={isInfographicRefining}
                                                    className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-[11px] font-black tracking-widest uppercase rounded-xl shadow-xl shadow-violet-200 dark:shadow-none"
                                                >
                                                    Regenerate Visual Artifact
                                                </Button>
                                            </div>
                                        )}
                                        <div className="shadow-[0_48px_100px_-24px_rgba(0,0,0,0.15)] rounded-[3rem] overflow-hidden border border-slate-100 dark:border-slate-800 transition-transform hover:scale-[1.01] duration-700">
                                            <img src={selectedReviewDraft.infographicUrl} alt="infographic" className="w-full h-auto" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. DOCKED BOTTOM CONTROL TERMINAL — px-8 and py-3.5/py-4 */}
                <div className="flex-shrink-0 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-slate-800 z-30 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col">
                    
                    {/* Compact AI Context Row — py-3.5 */}
                    <div className="px-8 py-3.5 bg-violet-50/60 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/40 flex items-center gap-6">
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse shadow-[0_0_12px_rgba(124,58,237,0.6)]"></div>
                            <span className="text-[11px] font-black text-violet-900 dark:text-violet-400 uppercase tracking-widest">AI Context Refine</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Instruct AI to modify specific parts (e.g., 'Make the conclusion more inspiring')"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyReviewFeedback()}
                            className="flex-1 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-2xl px-6 h-12 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-violet-500/5 transition-all outline-none"
                        />
                        <button 
                            onClick={handleApplyReviewFeedback}
                            disabled={isApplyingFeedback || !feedback}
                            className="px-10 h-12 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-xl active:scale-95 shrink-0"
                        >
                            {isApplyingFeedback ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Apply Refinement'}
                        </button>
                    </div>

                    {/* Final Audit Row — py-4 */}
                    <div className="px-8 py-4 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsPreviewOpen(true)}
                                className="px-10 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-300 font-bold text-[10px] tracking-widest uppercase rounded-2xl shadow-sm transition-all active:scale-95"
                            >
                                Preview Mode
                            </button>
                            <button 
                                onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                                disabled={isRejecting}
                                className="px-10 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 border border-red-100 dark:border-red-900/40 font-bold text-[10px] tracking-widest uppercase rounded-2xl transition-all shadow-sm active:scale-95 flex items-center gap-3"
                            >
                                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject Draft
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)}
                                className="px-10 h-12 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-black text-[10px] tracking-widest uppercase rounded-2xl transition-all"
                            >
                                Mark Reviewed
                            </button>
                            <button 
                                onClick={() => handleApproveDraft(selectedReviewDraft)}
                                disabled={isPublished}
                                className="px-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-[0.2em] uppercase rounded-2xl shadow-2xl active:scale-95 flex items-center gap-3"
                            >
                                {isPublished ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                Approve & Publish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── QUEUE LISTING View ── */
    return (
        <div className="animate-fadeIn w-full space-y-12 pb-32 px-4 lg:px-12">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-[12px] font-black tracking-[0.3em] text-slate-400 uppercase pointer-events-none">Editorial Workflow Buffer ({filteredDrafts?.length || 0})</h2>
            </div>
            <div className="grid grid-cols-1 gap-8">
                {isFetchingDrafts || filteredDrafts === null ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-8 items-center p-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                            <Skeleton className="w-20 h-20 rounded-3xl shrink-0" /><div className="flex-1 space-y-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
                        </div>
                    ))
                ) : filteredDrafts.length > 0 ? (
                    filteredDrafts.map((draft) => (
                        <Card key={draft.id} hoverable className="p-10 cursor-pointer group border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden" onClick={() => handleSelectReviewDraft(draft.id)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <div className="w-20 h-20 rounded-[2rem] bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/50 flex items-center justify-center group-hover:bg-violet-600 transition-all duration-700 shadow-inner">
                                        <FileText className="w-10 h-10 text-violet-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors tracking-tight">{draft.title}</h3>
                                        <div className="flex items-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(draft.createdAt || draft.created_at).toLocaleDateString()}</span>
                                            {draft.authorEmail && <span className="text-violet-400 lowercase italic font-medium">by {draft.authorEmail}</span>}
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
                    <div className="bg-white/40 dark:bg-slate-900/20 border-2 border-dashed border-violet-100 dark:border-violet-900/40 rounded-[3rem] p-24 text-center">
                        <Zap className="w-16 h-16 text-violet-200 dark:text-violet-900 mx-auto mb-8 animate-pulse" />
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-widest">Workflow Synchronized</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic max-w-sm mx-auto font-medium">No pending drafts detected in the editorial archive.</p>
                    </div>
                )}
            </div>

            {/* PREVIEW INTERFACE PORTAL */}
            {isPreviewOpen && selectedReviewDraft && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fadeIn">
                        <div className="bg-white dark:bg-slate-950 w-[96%] max-w-[1500px] h-[94vh] flex flex-col rounded-[3rem] shadow-2xl relative animate-scaleIn overflow-hidden border border-white/10">
                            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-10 right-10 p-4 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all z-30 shadow-xl">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-16 lg:p-32 flex flex-col items-center bg-slate-50 dark:bg-[#060606]">
                                <div className="max-w-[1000px] w-full space-y-24">
                                    <h1 className="text-5xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05] text-center drop-shadow-sm">{selectedReviewDraft.title}</h1>
                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative rounded-[3.5rem] overflow-hidden shadow-[0_64px_120px_-32px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800">
                                             <img src={selectedReviewDraft.imageUrl} className="w-full h-auto" alt="preview" />
                                             <div className="absolute inset-0 bg-violet-900/40 mix-blend-multiply" />
                                        </div>
                                    )}
                                    <article dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} className="prose prose-stone prose-2xl dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-[1.6] pb-32" />
                                </div>
                            </div>
                            <div className="p-12 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-6 bg-white dark:bg-[#0a0a0a]">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-12 h-16 rounded-[1.5rem] border-slate-200 dark:border-slate-800 font-bold uppercase tracking-widest text-[11px] shadow-sm">Continue Review</Button>
                                <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-16 h-16 bg-emerald-600 hover:bg-emerald-700 rounded-[1.5rem] shadow-2xl shadow-emerald-600/20 font-black uppercase tracking-[0.3em] text-[11px]">
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
