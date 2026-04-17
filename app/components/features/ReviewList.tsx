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
    AlertCircle
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

    const refinementRef = React.useRef<HTMLDivElement>(null);

    const scrollToRefinement = () => {
        refinementRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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
        <div className="relative">
            {selectedReviewDraft ? (
                // 3-SECTION STICKY-WRAP: (1) fixed top bar, (2) scrollable canvas, (3) docked bottom
                <div className="animate-fadeIn flex flex-col h-full min-h-0 w-full">

                    {/* ── 1. TOP BAR ── */}
                    <div className="flex-shrink-0 z-30 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between h-16 px-8">
                            <div className="flex-1 flex justify-start">
                                <button
                                    onClick={() => { setSelectedReviewDraft(null); handleClearForm(); }}
                                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-[11px] uppercase tracking-widest transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Queue
                                </button>
                            </div>
                            <div className="flex-1 flex justify-center">
                                <span className="px-4 py-1.5 bg-[#f8f5ff] text-violet-600 font-bold uppercase tracking-widest text-[10px] rounded-md border border-violet-100 dark:bg-violet-900/30 dark:border-violet-800">
                                    Editorial Review
                                </span>
                            </div>
                            <div className="flex-1 flex justify-end items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8]">WordPress Category</span>
                                <div className="min-w-[180px]">
                                    <CategorySelector
                                        selectedIds={selectedCategories}
                                        onChange={setSelectedCategories}
                                        readOnly={isReadOnly}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 2. SCROLLABLE CANVAS ── */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                        {/* Floating Toolbar */}
                        {selectionRect && (
                            <FloatingToolbar
                                isVisible={isToolbarVisible}
                                rect={selectionRect}
                                onAction={handleToolbarAction}
                                isLink={isLinkActive}
                                onClose={() => { setIsToolbarVisible(false); setSelectionRect(null); }}
                            />
                        )}

                        {/* ── The Centered Document Paper ── */}
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden mb-12 border border-slate-100 dark:border-slate-800">

                                {/* ── Purple Hero Banner ── */}
                                <div className="bg-violet-700 text-white p-12 lg:p-16 relative overflow-hidden">
                                    {/* Glow orb */}
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500 rounded-full blur-[100px] opacity-50 mix-blend-screen pointer-events-none -mr-48 -mt-48" />
                                    <div className="relative z-10">
                                        {/* Category Badges */}
                                        <div className="flex flex-wrap items-center gap-3 mb-6">
                                            {(() => {
                                                const sortedCats = CATEGORIES.filter(c => selectedCategories.includes(c.id)).sort((a, b) => a.id === LOCKED_CATEGORY_ID ? -1 : 1);
                                                if (sortedCats.length === 0) return <span className="bg-white/20 backdrop-blur-md text-white text-sm font-bold px-4 py-1.5 rounded-lg">Blog</span>;
                                                return sortedCats.map((cat, idx) => (
                                                    <React.Fragment key={cat.id}>
                                                        {idx > 0 && <span className="text-white/60 font-medium text-sm">→</span>}
                                                        <span className={`${cat.id === LOCKED_CATEGORY_ID ? 'bg-white/20' : 'bg-black/20'} backdrop-blur-md text-white text-sm font-bold px-4 py-1.5 rounded-lg`}>
                                                            {cat.name}
                                                        </span>
                                                    </React.Fragment>
                                                ));
                                            })()}
                                        </div>
                                        {/* Editable Title */}
                                        <textarea
                                            value={selectedReviewDraft.title}
                                            onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                            readOnly={isReadOnly}
                                            rows={2}
                                            className="w-full bg-transparent border-none resize-none text-[40px] lg:text-[52px] font-bold text-white tracking-tight leading-[1.1] shadow-none focus:outline-none focus:ring-0 placeholder:text-white/50"
                                        />
                                        {/* Cover image blended into hero */}
                                        {selectedReviewDraft.imageUrl && (
                                            <img src={selectedReviewDraft.imageUrl} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-20 pointer-events-none" alt="" />
                                        )}
                                    </div>
                                </div>

                                {/* ── Content Body ── */}
                                <div className="p-10 lg:p-12">
                                    <div
                                        ref={editorRef}
                                        contentEditable={!isReadOnly}
                                        suppressContentEditableWarning
                                        onFocus={() => setIsEditorFocused(true)}
                                        onBlur={(e) => {
                                            setIsEditorFocused(false);
                                            if (isReadOnly || !selectedReviewDraft) return;
                                            const html = e.currentTarget.innerHTML;
                                            const updated = { ...selectedReviewDraft, content: html };
                                            setSelectedReviewDraft(updated);
                                            handleSaveManualEdits(updated);
                                        }}
                                        className={`text-slate-700 dark:text-slate-300 text-[17px] leading-[1.85] font-normal prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[400px] prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold ${isReadOnly ? 'cursor-default' : ''}`}
                                        onMouseUp={updateSelectionRect}
                                        onSelect={updateSelectionRect}
                                        onKeyUp={(e) => { if (!['Control','Meta','Shift','Alt'].includes(e.key)) updateSelectionRect(); }}
                                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); const url = window.prompt('Enter the URL:'); if (url) handleToolbarAction('link', url); } }}
                                        onMouseDown={(e) => { const target = (e.target as HTMLElement).closest('a'); if (target && (e.ctrlKey || e.metaKey || e.detail === 2)) { e.preventDefault(); window.open(target.href, '_blank'); } }}
                                    />

                                    {/* Infographic section */}
                                    {selectedReviewDraft.infographicUrl && (
                                        <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex-1" />
                                                <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center">Visual Insight</h4>
                                                <div className="flex-1 flex justify-end">
                                                    <Button variant="ghost" size="sm" onClick={() => setIsRefiningVisual(!isRefiningVisual)} className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-white flex items-center gap-2">
                                                        {isRefiningVisual ? <X className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                        {isRefiningVisual ? 'Close' : 'Refine'}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="w-full space-y-6">
                                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isRefiningVisual ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-inner mb-6">
                                                        <Textarea
                                                            value={infographicFeedback}
                                                            onChange={(e) => setInfographicFeedback(e.target.value)}
                                                            placeholder="Describe visual corrections..."
                                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[100px] text-sm focus:ring-1 focus:ring-violet-500 p-4"
                                                        />
                                                        <Button variant="primary" size="sm" onClick={() => handleGenerateInfographic(infographicFeedback)} isLoading={isInfographicRefining} disabled={!infographicFeedback.trim()} className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 uppercase tracking-widest text-[10px] font-bold">
                                                            Regenerate Visual
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm rounded-xl">
                                                    <img src={selectedReviewDraft.infographicUrl} alt={selectedReviewDraft.title} className="w-full h-auto" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. DOCKED BOTTOM PANEL ── */}
                    {!isReadOnly && (
                        <div className="flex-shrink-0 z-20 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                            {/* Row 1: AI Refinement */}
                            <div ref={refinementRef} className={`bg-violet-50/80 dark:bg-violet-900/20 px-8 py-3.5 flex items-center gap-4 border-b border-violet-100/50 dark:border-violet-800/30 ${!primaryKeyword ? 'opacity-60 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                                    <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-widest whitespace-nowrap">AI Editor</span>
                                </div>
                                {!primaryKeyword && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                        <AlertCircle className="w-3 h-3" /> Select primary keyword first
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && feedback && primaryKeyword) handleApplyReviewFeedback(); }}
                                    placeholder="Rewrite, fix tone, enhance vocabulary..."
                                    className="flex-1 h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-sm"
                                />
                                <Button
                                    variant="primary"
                                    onClick={handleApplyReviewFeedback}
                                    isLoading={isApplyingFeedback}
                                    disabled={!feedback || !primaryKeyword}
                                    className="h-9 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-md whitespace-nowrap shrink-0"
                                >
                                    {isApplyingFeedback && feedback.match(/https?:\/\/[^\s]+/) ? 'Learning...' : 'Apply Refinement'}
                                </Button>
                            </div>
                            {/* Row 2: Audit Buttons */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Button variant="secondary" size="sm" onClick={() => setIsPreviewOpen(true)} className="h-10 px-5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 shadow-sm">
                                        Preview
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleRejectDraft(selectedReviewDraft.id)} isLoading={isRejecting} className="h-10 px-5 rounded-full border border-red-300 bg-white dark:bg-slate-900 text-red-500 font-bold text-[11px] uppercase tracking-widest hover:bg-red-50 shadow-sm">
                                        Reject
                                    </Button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="secondary" onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)} disabled={selectedReviewDraft.auditLog?.some((log: any) => log.email === user?.email)} className="h-10 px-5 rounded-full bg-[#ede9fe] dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 border-none font-bold text-[11px] uppercase tracking-widest hover:bg-[#ddd6fe] disabled:opacity-60 shadow-sm transition-all">
                                        {selectedReviewDraft.auditLog?.some((log: any) => log.email === user?.email)
                                            ? <><CheckCircle className="w-4 h-4 mr-1.5 text-emerald-500" />Reviewed</>
                                            : <><Users className="w-4 h-4 mr-1.5" />Mark as Reviewed</>}
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={() => handleApproveDraft(selectedReviewDraft)} isLoading={isPublished} className="h-10 px-5 rounded-full bg-green-500 hover:bg-green-600 border-none text-white font-bold text-[11px] uppercase tracking-widest shadow-md shadow-green-400/20">
                                        <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" />Approve & Publish
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
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
                                    <div className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${selectedReviewDraft?.id === draft.id ? 'bg-violet-100/10 dark:bg-violet-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                        <div className="flex items-center gap-7">
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/50 flex items-center justify-center group-hover:bg-violet-600 group-hover:border-violet-600 transition-all duration-500 shadow-sm"><FileText className="w-8 h-8 text-violet-400 group-hover:text-white transition-colors" /></div>
                                            <div className="space-y-2"><h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors tracking-tight">{draft.title}</h3><div className="flex items-center gap-6"><span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest"><Calendar className="w-3.5 h-3.5" />{new Date(draft.createdAt || draft.created_at).toLocaleDateString()}</span>{draft.authorEmail && <span className="text-[10px] font-medium text-violet-400 lowercase italic">by {draft.authorEmail}</span>}<Badge variant="outline" className="px-3">Draft</Badge></div></div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0"><span className="text-[11px] font-extrabold uppercase tracking-widest text-violet-500">Launch Review</span><ArrowRight className="w-5 h-5 text-violet-500" /></div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="bg-white/40 dark:bg-violet-950/5 backdrop-blur-sm border-2 border-dashed border-violet-100 dark:border-violet-900/40 rounded-3xl p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-violet-50 dark:bg-violet-950/30 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-violet-100 dark:ring-violet-900/50 shadow-inner"><Zap className="w-10 h-10 text-violet-500 animate-pulse" /></div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editorial Buffer Empty</h3><p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is ready for new high-intent content generations.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL - Wrapped in Portal for absolute viewport centering */}
            {isPreviewOpen && selectedReviewDraft && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                        {/* The White Modal Box: Centered relative to the viewport */}
                        <div className="bg-white dark:bg-slate-950 w-[96%] max-w-[1440px] h-[94vh] flex flex-col rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-scaleIn overflow-hidden border border-slate-200 dark:border-slate-800">
                            {/* Close Button */}
                            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all z-30 shadow-sm">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24 flex flex-col items-center">
                                <div className="max-w-[850px] w-full space-y-16">
                                    {/* Categories Verification Header */}
                                    {selectedCategories.length > 0 && (
                                        <div className="flex justify-center mb-[-2rem]">
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-6 py-1.5 border border-violet-100 dark:border-violet-800">
                                                {(() => {
                                                    const sortedCats = CATEGORIES.filter(c => selectedCategories.includes(c.id))
                                                        .sort((a, b) => a.id === LOCKED_CATEGORY_ID ? -1 : 1);
                                                    const blogPart = sortedCats.find(c => c.id === LOCKED_CATEGORY_ID)?.name.toUpperCase() || 'BLOG';
                                                    const otherParts = sortedCats
                                                        .filter(c => c.id !== LOCKED_CATEGORY_ID)
                                                        .map(c => c.name.toUpperCase())
                                                        .join(', ');
                                                    return otherParts ? `${blogPart}: ${otherParts}` : blogPart;
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight font-serif text-center whitespace-normal">
                                        {selectedReviewDraft.title}
                                    </h1>

                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative group overflow-hidden rounded-none shadow-2xl border border-slate-100 dark:border-slate-800 w-full">
                                            <img src={selectedReviewDraft.imageUrl} alt={selectedReviewDraft.title} className="w-full h-auto object-cover" style={{ aspectRatio: '4/3' }} />
                                            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(139, 92, 246, 0.45)' }} />
                                            <div className="absolute inset-0 pointer-events-none">
                                                <img src="/Blog.png" className="absolute top-[40px] left-[40px] h-10 w-auto" alt="blog" />
                                                
                                                {/* Centered Title Group Overlay */}
                                                <div className="absolute inset-x-10 text-white flex flex-col items-center text-center gap-0 drop-shadow-2xl" style={{ top: '120px', lineHeight: '1.2' }}>
                                                    {selectedReviewDraft.title.includes(':') ? (
                                                        <>
                                                            <h1 className="text-[48px] lg:text-[56px] font-bold tracking-tight m-0 p-0">
                                                                {selectedReviewDraft.title.split(':')[0]}:
                                                            </h1>
                                                            <p className="text-[34px] lg:text-[40px] font-normal opacity-95 m-0 p-0">
                                                                {selectedReviewDraft.title.split(':').slice(1).join(':').trim()}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <h1 className="text-[48px] lg:text-[56px] font-bold tracking-tight m-0 p-0 text-center">
                                                            {selectedReviewDraft.title}
                                                        </h1>
                                                    )}
                                                </div>
                                                <img src="/10xDS.png" className="absolute bottom-[40px] right-[40px] h-14 w-auto" alt="logo" />
                                            </div>
                                        </div>
                                    )}
                                    <article dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} className="text-black dark:text-white text-lg leading-relaxed prose prose-stone dark:prose-invert max-w-none prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold" />
                                    {selectedReviewDraft.infographicUrl && (
                                        <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">Visual Summary</h4>
                                            <div className="border border-slate-200 dark:border-slate-800 shadow-xl"><img src={selectedReviewDraft.infographicUrl} alt="Infographic" className="w-full h-auto" /></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Modal Footer Actions */}
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-8 h-14 rounded-none border border-slate-200 dark:border-slate-800">Continue Editing</Button>
                                <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-8 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-none shadow-lg shadow-emerald-600/10">
                                    <CheckCircle className="w-4 h-4 mr-2" />Approve & Publish Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};
