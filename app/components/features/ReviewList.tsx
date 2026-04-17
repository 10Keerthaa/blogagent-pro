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
                <div className={`animate-fadeIn w-full transition-all duration-500 space-y-0`}>
                    {/* Header Actions */}
                    <div className="sticky top-0 bg-white dark:bg-slate-950 z-30 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-full flex items-start justify-between py-6 px-10">
                            <div className="flex-1 flex justify-start">
                                <button
                                    onClick={() => {
                                        setSelectedReviewDraft(null);
                                        handleClearForm();
                                    }}
                                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold text-[11px] uppercase tracking-widest mt-1.5 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    BACK TO QUEUE
                                </button>
                            </div>
                            <div className="flex-1 flex justify-center mt-1">
                                <span className="px-4 py-1.5 bg-[#f8f5ff] text-violet-600 font-bold uppercase tracking-widest text-[10px] rounded-md shadow-sm border border-violet-100 dark:bg-violet-900/30 dark:border-violet-800">
                                    Editorial Review
                                </span>
                            </div>
                            <div className="flex-1 flex justify-end">
                                <div className="flex flex-col items-start gap-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8] pl-1">
                                        WordPress Category
                                    </span>
                                    <div className="min-w-[200px]">
                                        <CategorySelector 
                                            selectedIds={selectedCategories}
                                            onChange={setSelectedCategories}
                                            readOnly={isReadOnly}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <section className="w-full space-y-10 relative">
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

                        {/* Top Purple Title Section */}
                        <div className="relative rounded-[1.5rem] overflow-hidden mt-8 mx-10 bg-[#7c3aed] shadow-lg">
                            {selectedReviewDraft.imageUrl && (
                                <img src={selectedReviewDraft.imageUrl} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-20" alt="Cover" />
                            )}
                            <div className="relative z-10 px-12 lg:px-16 py-16 lg:py-20 min-h-[380px] flex flex-col justify-end">
                                <div className="flex flex-wrap items-center gap-3 mb-6">
                                {(() => {
                                    const sortedCats = CATEGORIES.filter(c => selectedCategories.includes(c.id)).sort((a, b) => a.id === LOCKED_CATEGORY_ID ? -1 : 1);
                                    if (sortedCats.length === 0) {
                                        return <span className="bg-white/20 text-white text-sm font-bold px-4 py-1.5 rounded-lg">Blog</span>;
                                    }
                                    return sortedCats.map((cat, idx) => (
                                        <React.Fragment key={cat.id}>
                                            {idx > 0 && <span className="text-white/60 font-medium text-sm">→</span>}
                                            <span className={`${cat.id === LOCKED_CATEGORY_ID ? 'bg-white/20' : 'bg-black/20'} text-white text-sm font-bold px-4 py-1.5 rounded-lg`}>
                                                {cat.name}
                                            </span>
                                        </React.Fragment>
                                    ));
                                })()}
                                </div>
                                <Textarea
                                    value={selectedReviewDraft.title}
                                    onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                    className="p-0 border-none bg-transparent resize-none text-[42px] lg:text-[56px] font-bold text-white tracking-tight leading-[1.1] font-sans shadow-none focus:ring-0 focus:outline-none focus:border-transparent min-h-[80px]"
                                    readOnly={isReadOnly}
                                />
                            </div>
                        </div>

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
                            className={`text-slate-800 dark:text-slate-200 text-[17px] leading-[1.8] font-medium mx-10 prose prose-stone dark:prose-invert max-w-[800px] focus:outline-none min-h-[400px]
                                prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold ${isReadOnly ? 'cursor-default' : ''}`}
                            onMouseUp={updateSelectionRect}
                            onSelect={updateSelectionRect}
                            onKeyUp={(e) => {
                                if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return;
                                updateSelectionRect();
                            }}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                                    e.preventDefault();
                                    const url = window.prompt('Enter the URL:');
                                    if (url) handleToolbarAction('link', url);
                                }
                            }}
                            onMouseDown={(e) => {
                                const target = (e.target as HTMLElement).closest('a');
                                if (target && (e.ctrlKey || e.metaKey || e.detail === 2)) {
                                    e.preventDefault();
                                    window.open(target.href, '_blank');
                                }
                            }}
                        />

                        {selectedReviewDraft.infographicUrl && (
                            <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50 mx-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex-1" />
                                    <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center">Visual Insight</h4>
                                    <div className="flex-1 flex justify-end">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                            className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-white flex items-center gap-2"
                                        >
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
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleGenerateInfographic(infographicFeedback)}
                                                isLoading={isInfographicRefining}
                                                disabled={!infographicFeedback.trim()}
                                                className="w-full h-12 rounded-none bg-violet-600 hover:bg-violet-700 uppercase tracking-widest text-[10px] font-bold"
                                            >
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
                    </section>

                    {!isReadOnly && (
                        <section className="w-auto border-y border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/30 mt-12 mx-10" ref={refinementRef}>
                            <div className="flex flex-col">
                                <div className="w-full py-4 px-10">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-violet-400">AI Refinement</h4>
                                </div>
                                {!primaryKeyword && (
                                    <div className="w-full px-10 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight flex items-center gap-1.5 mb-2">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Action Locked: Select a primary keyword to enable refinement
                                    </div>
                                )}
                                <div className={!primaryKeyword ? 'opacity-50 pointer-events-none' : ''}>
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Inject directives..."
                                        className="w-full bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800/50 min-h-[160px] rounded-none px-10 py-8 text-base shadow-none focus:ring-0"
                                    />
                                    <div className="w-full flex justify-center px-10">
                                        <Button variant="secondary" onClick={handleApplyReviewFeedback} isLoading={isApplyingFeedback} disabled={!feedback || !primaryKeyword} className="w-[90%] lg:w-[85%] h-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase tracking-[0.2em] text-[10px] font-bold mb-8 shadow-sm">
                                            {isApplyingFeedback && feedback.match(/https?:\/\/[^\s]+/) ? 'Learning from URL...' : 'Apply Refinement'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {!isReadOnly && (
                        <div className="w-auto mt-12 mx-10 mb-8 pt-8 pb-8 flex items-center justify-between px-8 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                            <div className="flex gap-4">
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(true)} className="px-6 py-2.5 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase tracking-widest shadow-sm rounded-xl hover:bg-slate-50">
                                    PREVIEW
                                </Button>
                                <Button variant="danger" onClick={() => handleRejectDraft(selectedReviewDraft.id)} isLoading={isRejecting} className="px-6 py-2.5 h-12 bg-white dark:bg-slate-900 border border-red-200 text-red-500 font-bold text-[11px] uppercase tracking-widest hover:bg-red-50 shadow-sm rounded-xl">
                                    REJECT
                                </Button>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="secondary" onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)} disabled={selectedReviewDraft.auditLog?.some((log: any) => log.email === user?.email)} className="px-6 py-2.5 h-12 bg-[#f8f5ff] dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-none font-bold text-[11px] uppercase tracking-widest hover:bg-[#f3ebff] transition-all rounded-xl shadow-none">
                                    {selectedReviewDraft.auditLog?.some((log: any) => log.email === user?.email) ? 'REVIEWED' : 'MARK AS REVIEWED'}
                                </Button>
                                <Button variant="primary" onClick={() => handleApproveDraft(selectedReviewDraft)} isLoading={isPublished} className="px-6 py-2.5 h-12 bg-[#10b981] hover:bg-emerald-600 border-none text-white font-bold text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20">
                                    APPROVE & PUBLISH
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-fadeIn w-full space-y-8 pb-24 transition-all duration-500 px-10 pt-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[12px] font-bold tracking-widest text-[#94a3b8] uppercase">Editorial Buffer ({filteredDrafts?.length || 0})</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                        {isFetchingDrafts || filteredDrafts === null ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-6 items-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm animate-pulse border border-slate-100">
                                    <Skeleton className="w-14 h-14 rounded-2xl shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                                </div>
                            ))
                        ) : filteredDrafts.length > 0 ? (
                            filteredDrafts.map((draft) => (
                                <div 
                                    key={draft.id} 
                                    className="bg-white dark:bg-slate-900 border border-slate-100 hover:border-violet-200 dark:border-slate-800 dark:hover:border-violet-800 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] cursor-pointer transition-all hover:shadow-md flex items-center justify-between group"
                                    onClick={() => handleSelectReviewDraft(draft.id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-[1rem] bg-[#f8f5ff] dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                                            <FileText className="w-7 h-7 text-[#8b5cf6]" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h3 className="text-[18px] font-bold text-slate-800 dark:text-gray-100 tracking-tight group-hover:text-violet-600 transition-colors">{draft.title}</h3>
                                            <div className="flex items-center gap-4 text-[13px]">
                                                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(draft.createdAt || draft.created_at).toLocaleDateString()}
                                                </span>
                                                {draft.authorEmail && (
                                                    <span className="text-violet-400 font-medium italic">by {draft.authorEmail}</span>
                                                )}
                                                <span className="px-2.5 py-0.5 bg-[#f1f5f9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-bold text-[10px] uppercase tracking-wider">
                                                    DRAFT
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-4 group-hover:translate-x-0 pr-4">
                                        <ArrowRight className="w-5 h-5 text-violet-500" />
                                    </div>
                                </div>
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
