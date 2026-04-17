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
            /* ── THE TRAPPED SCROLL ARCHITECTURE ── */
            <div className="flex-1 h-full flex flex-col bg-slate-50 relative overflow-hidden animate-fadeIn">
                
                {/* 1. FIXED TOP HEADERArea */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0 z-10">
                    <button 
                        onClick={() => setSelectedReviewDraft(null)}
                        className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors cursor-pointer group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Queue
                    </button>
                    <div className="px-4 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-black tracking-widest uppercase">
                        Editorial Review
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-start -mt-1">
                            <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-1">WordPress Category</span>
                            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 group hover:border-violet-200 transition-all">
                                <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                                <span className="text-[11px] font-bold text-slate-400">Blog /</span>
                                <select 
                                    value={selectedCategories[0] || ''}
                                    onChange={(e) => setSelectedCategories(e.target.value ? [Number(e.target.value)] : [])}
                                    className="bg-transparent text-[11px] font-extrabold text-slate-700 outline-none cursor-pointer focus:ring-0 select-none"
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

                {/* 2. SCROLLABLE MIDDLE CANVAS — Exactly as AI Studio Source */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                    <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100/60 overflow-hidden mb-12 animate-slideUp">
                        
                        {/* THE HERO CANVAS — Exactly min-h-[360px] justify-end p-12 lg:p-16 */}
                        <div className="relative text-white p-12 lg:p-16 overflow-hidden min-h-[360px] lg:min-h-[460px] flex flex-col justify-end group">
                            {selectedReviewDraft.imageUrl ? (
                                <>
                                    <img 
                                        src={selectedReviewDraft.imageUrl}
                                        alt={selectedReviewDraft.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                                    />
                                    {/* AI Studio Elite Overlay */}
                                    <div className="absolute inset-0 bg-violet-700/50 mix-blend-multiply" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                                    
                                    <div className="relative z-10 w-full">
                                        {/* Tags at Top Left */}
                                        <div className="flex items-center gap-3 mb-auto absolute top-[-2rem] lg:top-[-4rem]">
                                            <div className="bg-violet-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest shadow-2xl">
                                                Blog
                                            </div>
                                            <div className="bg-black/60 backdrop-blur-md px-5 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-2xl">
                                                {getCategoryName()}
                                            </div>
                                        </div>

                                        <div className="mt-8 space-y-6">
                                            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                                                <FileText className="w-4 h-4 text-white/80" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Production Draft</span>
                                            </div>
                                            <textarea
                                                value={selectedReviewDraft.title}
                                                onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                                className="w-full bg-transparent border-none p-0 text-3xl lg:text-5xl font-black leading-tight drop-shadow-2xl focus:ring-0 resize-none scroll-hidden"
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    {/* Logo Pill */}
                                    <div className="absolute bottom-12 right-12 z-20">
                                        <div className="bg-white p-4 rounded-xl shadow-2xl">
                                            <img src="/10xDS.png" alt="logo" className="h-10 lg:h-12 w-auto object-contain" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-violet-700 flex flex-col justify-end p-16">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500 rounded-full blur-[100px] opacity-40 animate-pulse" />
                                    <textarea
                                        value={selectedReviewDraft.title}
                                        onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                        className="relative z-10 w-full bg-transparent border-none p-0 text-5xl font-black text-white focus:ring-0 leading-tight resize-none scroll-hidden"
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* DOCUMENT BODY Wrapper — Prose text-lg text-slate-700 */}
                        <div className="p-12 lg:p-16 pb-24 relative bg-white">
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
                                className="outline-none prose prose-slate prose-lg lg:prose-xl max-w-none text-slate-700 leading-relaxed font-sans"
                            />

                            {/* Infographic Logic */}
                            {selectedReviewDraft.infographicUrl && (
                                <div className="mt-20 pt-16 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-10">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Vertical Analysis</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                            className="text-[10px] uppercase font-black tracking-widest text-violet-700 border-violet-100 border px-5"
                                        >
                                            {isRefiningVisual ? 'Close' : 'Refine Visual'}
                                        </Button>
                                    </div>
                                    <div className="space-y-10">
                                        {isRefiningVisual && (
                                            <div className="bg-slate-50 p-8 space-y-5 rounded-2xl animate-fadeIn border border-slate-200">
                                                <Textarea
                                                    value={infographicFeedback}
                                                    onChange={(e) => setInfographicFeedback(e.target.value)}
                                                    placeholder="Specify design changes..."
                                                    className="w-full min-h-[120px] bg-white border-slate-200"
                                                />
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleGenerateInfographic(infographicFeedback)}
                                                    isLoading={isInfographicRefining}
                                                    className="w-full h-14 bg-violet-600 text-xs font-black tracking-widest uppercase rounded-xl"
                                                >
                                                    Update Graphic Artifact
                                                </Button>
                                            </div>
                                        )}
                                        <div className="shadow-2xl rounded-3xl overflow-hidden border border-slate-100">
                                            <img src={selectedReviewDraft.infographicUrl} alt="infographic" className="w-full h-auto" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. DOCKED ACTIONS BAR (Sticky Bottom) — Exactly py-3.5 and py-4 */}
                <div className="flex-shrink-0 bg-white border-t border-slate-200 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex flex-col">
                    
                    {/* Row 1: AI Editor — px-8 py-3.5 */}
                    <div className="px-8 py-3.5 bg-violet-50/80 border-b border-violet-100 flex items-center gap-5">
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]"></span>
                            <span className="text-[11px] font-black text-violet-900 uppercase tracking-widest">AI Editor</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="E.g., Rewrite the second paragraph to sound more professional..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyReviewFeedback()}
                            className="flex-1 bg-white border border-violet-200 rounded-xl px-5 h-12 text-sm focus:ring-2 focus:ring-violet-500/10 transition-all outline-none"
                        />
                        <button 
                            onClick={handleApplyReviewFeedback}
                            disabled={isApplyingFeedback || !feedback}
                            className="px-8 h-12 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-[10px] tracking-widest uppercase rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            {isApplyingFeedback ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Apply Refinement'}
                        </button>
                    </div>

                    {/* Row 2: Audit Actions — px-8 py-4 */}
                    <div className="px-8 py-4 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsPreviewOpen(true)}
                                className="px-8 h-12 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-[10px] tracking-widest uppercase rounded-xl shadow-sm transition-all active:scale-95"
                            >
                                Preview
                            </button>
                            <button 
                                onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                                disabled={isRejecting}
                                className="px-8 h-12 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
                            >
                                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)}
                                className="px-8 h-12 bg-violet-50 hover:bg-violet-100 text-violet-700 font-black text-[10px] tracking-widest uppercase rounded-xl transition-all"
                            >
                                Mark Reviewed
                            </button>
                            <button 
                                onClick={() => handleApproveDraft(selectedReviewDraft)}
                                disabled={isPublished}
                                className="px-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-widest uppercase rounded-xl shadow-xl active:scale-95 flex items-center gap-2"
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

    /* ── QUEUE VIEW (Same as before) ── */
    return (
        <div className="animate-fadeIn w-full space-y-10 pb-24 px-4 lg:px-8">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Editorial Buffer ({filteredDrafts?.length || 0})</h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {isFetchingDrafts || filteredDrafts === null ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-6 items-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm animate-pulse">
                            <Skeleton className="w-16 h-16 rounded-2xl shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/4" /></div>
                        </div>
                    ))
                ) : filteredDrafts.length > 0 ? (
                    filteredDrafts.map((draft) => (
                        <Card key={draft.id} hoverable className="p-8 cursor-pointer group border-slate-200" onClick={() => handleSelectReviewDraft(draft.id)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-7">
                                    <div className="w-16 h-16 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center group-hover:bg-violet-600 transition-all duration-500 shadow-sm">
                                        <FileText className="w-8 h-8 text-violet-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-violet-600 transition-colors tracking-tight">{draft.title}</h3>
                                        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Calendar className="w-3.5 h-3.5" /> {new Date(draft.createdAt || draft.created_at).toLocaleDateString()}
                                            {draft.authorEmail && <span className="text-violet-400 lowercase italic font-medium">by {draft.authorEmail}</span>}
                                            <Badge variant="outline" className="px-3">DRAFT</Badge>
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-violet-500 transition-all group-hover:translate-x-2" />
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="bg-white/40 border-2 border-dashed border-violet-100 rounded-[2.5rem] p-16 text-center">
                        <Zap className="w-12 h-12 text-violet-300 mx-auto mb-6 animate-pulse" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-wide">Editorial Buffer Empty</h3>
                        <p className="text-sm text-slate-500 italic">Systems are optimized and waiting for high-intent generations.</p>
                    </div>
                )}
            </div>

            {/* PREVIEW MODAL */}
            {isPreviewOpen && selectedReviewDraft && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white w-[96%] max-w-[1440px] h-[94vh] flex flex-col rounded-3xl shadow-2xl relative animate-scaleIn overflow-hidden">
                            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all z-30 shadow-sm">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24 flex flex-col items-center">
                                <div className="max-w-[900px] w-full space-y-20">
                                    <h1 className="text-4xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight text-center">{selectedReviewDraft.title}</h1>
                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
                                             <img src={selectedReviewDraft.imageUrl} className="w-full h-auto" alt="preview" />
                                             <div className="absolute inset-0 bg-violet-700/50 mix-blend-multiply" />
                                        </div>
                                    )}
                                    <article dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} className="prose prose-stone prose-xl max-w-none text-slate-800 leading-relaxed" />
                                </div>
                            </div>
                            <div className="p-10 border-t border-slate-100 flex justify-end gap-5 bg-slate-50/50">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-10 h-16 rounded-2xl border-slate-200 font-bold uppercase tracking-widest text-[11px]">Keep Editing</Button>
                                <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-12 h-16 bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-xl font-black uppercase tracking-[0.2em] text-[11px]">
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
