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
    AlertCircle, Loader2
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
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (selectedReviewDraft) {
            // Scroll the panel's own scrollable ancestor to the top
            const panel = scrollContainerRef.current?.closest('.overflow-y-auto');
            if (panel) {
                panel.scrollTop = 0;
            } else {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
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
        <div ref={scrollContainerRef} className={`animate-fadeIn w-full transition-all duration-500 pb-24`}>
                    {/* Part 3: Editorial Sub-Header (True Studio Strip) */}
                    <div className="sticky top-[-1px] bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl z-30 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="w-full grid grid-cols-3 items-center h-16 px-6 lg:px-10">
                            {/* Left: Navigation */}
                            <div className="flex items-center">
                                <button
                                    onClick={() => {
                                        setSelectedReviewDraft(null);
                                        handleClearForm();
                                    }}
                                    className="group flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-all"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Queue</span>
                                </button>
                            </div>

                            {/* Center: Branding (Absolute Center) */}
                            <div className="flex justify-center">
                               <Badge variant="pending" className="px-6 py-1 bg-emerald-50 text-emerald-600 border-emerald-100 font-black tracking-widest uppercase text-[10px]">Editorial Review</Badge>
                            </div>

                            {/* Right: Wordpress Controls */}
                            <div className="flex items-center justify-end gap-3 pr-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1 opacity-70">Wordpress Category</span>
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

                    {/* Content Section */}
                    <section className="w-full relative">
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
                        <div className="w-full space-y-12">
                            <Input
                                label="Editorial Title"
                                value={selectedReviewDraft.title}
                                onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                className="text-4xl lg:text-5xl font-extrabold py-12 px-6 lg:px-10 border-none bg-transparent focus:ring-0 focus:border-violet-500 rounded-none border-b border-slate-100 dark:border-slate-800 tracking-tight text-center"
                            />

                        {selectedReviewDraft.imageUrl && (
                            <div className="relative mb-12 group overflow-hidden rounded-none shadow-none">
                                <img
                                    src={selectedReviewDraft.imageUrl}
                                    alt={selectedReviewDraft.title}
                                    className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                                    style={{ aspectRatio: '4/3' }}
                                />
                                <div
                                    className="absolute inset-0 z-10 pointer-events-none"
                                    style={{ backgroundColor: 'rgba(139, 92, 246, 0.45)' }}
                                />
                                <div className="absolute inset-0 z-20 pointer-events-none">
                                    <img
                                        src="/Blog.png"
                                        alt="Blog Tag"
                                        className="absolute top-[40px] left-[40px] w-auto h-10 object-contain"
                                    />
                                    <div
                                        className="absolute inset-0 flex flex-col items-center justify-center text-center text-white gap-0 drop-shadow-2xl px-10"
                                        style={{ lineHeight: '1.2' }}
                                    >
                                        {selectedReviewDraft.title.includes(':') ? (
                                            <>
                                                <h1 className="text-[56px] font-bold tracking-tight m-0 p-0 leading-[1.3]">
                                                    {selectedReviewDraft.title.split(':')[0]}:
                                                </h1>
                                                <p className="text-[44px] font-normal opacity-95 m-0 p-0 leading-[1.3]">
                                                    {selectedReviewDraft.title.split(':').slice(1).join(':').trim()}
                                                </p>
                                            </>
                                        ) : (
                                            <h1 className="text-[56px] font-bold tracking-tight m-0 p-0 leading-[1.3]">
                                                {selectedReviewDraft.title}
                                            </h1>
                                        )}
                                    </div>
                                    <img
                                        src="/10xDS.png"
                                        alt="Brand Logo"
                                        className="absolute bottom-[40px] right-[40px] w-auto h-14 object-contain"
                                    />
                                </div>
                            </div>
                        )}

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
                            className={`text-black dark:text-white text-base leading-relaxed prose prose-stone dark:prose-invert w-full max-w-none px-6 lg:px-24 focus:outline-none min-h-[500px]
                                prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold ${isReadOnly ? 'cursor-default' : ''}`}
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
                        />

                        {selectedReviewDraft.infographicUrl && (
                            <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50">
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
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* AI REFINEMENT (Anchored at Bottom of content stack) */}
                        {!isReadOnly && (
                            <div className="flex flex-col gap-2 w-full mt-24 pt-12 border-t border-slate-100 dark:border-slate-800/50" ref={refinementRef}>
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                                        REFINE WITH AI
                                    </h4>
                                </div>
                                {!primaryKeyword && (
                                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight flex items-center gap-1.5 mt-2">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Action Locked: Select a primary keyword to enable refinement
                                    </div>
                                )}
                                <div className={!primaryKeyword ? 'opacity-50 pointer-events-none mt-2' : 'mt-2'}>
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Inject directives to refine this post..."
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none p-6 text-base focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none min-h-[160px]"
                                    />
                                    <Button
                                        variant="primary"
                                        onClick={handleApplyReviewFeedback}
                                        isLoading={isApplyingFeedback}
                                        disabled={!feedback || !primaryKeyword}
                                        className="w-full h-14 rounded-none bg-violet-600 hover:bg-violet-700 uppercase tracking-widest text-[11px] font-bold shadow-lg"
                                    >
                                        {isApplyingFeedback && feedback.match(/https?:\/\/[^\s]+/) ? 'Learning from URL...' : 'Apply AI Refinement'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Review Actions (Relocated to bottom of post) */}
                        {!isReadOnly && (
                            <div className="mt-32 pt-16 border-t border-slate-100 dark:border-slate-800/50 flex flex-col items-center gap-10">
                                <div className="flex flex-wrap items-center justify-center gap-6 w-full">
                                    <Button variant="secondary" onClick={handleSaveManualEdits} isLoading={isSavingManual} className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px] bg-violet-50/80 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 transition-colors shadow-none uppercase font-black tracking-widest text-[10px]">
                                        Save Edits
                                    </Button>
                                    <Button variant="secondary" onClick={() => handleMarkAsReviewed(selectedReviewDraft.id)} disabled={selectedReviewDraft.auditLog?.some((log: any) => log.email === user?.email)} className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[200px] bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:bg-emerald-50 disabled:text-emerald-700 disabled:border-emerald-100 transition-all shadow-none font-bold uppercase tracking-widest text-[10px]">
                                        {selectedReviewDraft.auditLog?.some((log: any) => log.email === user?.email) ? <><CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />Reviewed</> : <><Users className="w-4 h-4 mr-2" />Mark as Reviewed</>}
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleRejectDraft(selectedReviewDraft.id)} isLoading={isRejecting} className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px] uppercase font-black tracking-widest text-[10px]">Reject</Button>
                                    <Button variant="secondary" size="sm" onClick={() => setIsPreviewOpen(true)} className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px] bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-colors shadow-none font-bold uppercase tracking-widest text-[10px]">Preview</Button>
                                </div>
                                
                                <Button variant="primary" size="sm" onClick={() => handleApproveDraft(selectedReviewDraft)} isLoading={isPublished} className="whitespace-nowrap px-10 py-4 bg-violet-600 hover:bg-violet-700 shadow-2xl shadow-violet-500/20 dark:shadow-none rounded-none h-16 min-w-[320px] text-white font-black tracking-[0.2em] uppercase text-[11px]">
                                    <CheckCircle className="w-5 h-5 mr-3 shrink-0" />Approve & Publish Now
                                </Button>
                            </div>
                        )}
                    </div>
                </section>
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
