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
    FileText, Calendar, ArrowRight, X, CheckCircle, XCircle, BarChart2, Zap, Sparkles, Users,
    Bold, Italic, Link as LinkIcon, RotateCcw, AlertCircle
} from 'lucide-react';
import { AdminTracking } from './AdminTracking';
import { FloatingToolbar } from './FloatingToolbar';

export const ReviewList = () => {
    const {
        reviewDrafts, isFetchingDrafts,
        selectedReviewDraft, setSelectedReviewDraft,
        isRejecting, handleRejectDraft,
        isSavingManual, handleSaveManualEdits,
        isPublished, handleApproveDraft,
        feedback, setFeedback,
        isApplyingFeedback, handleApplyReviewFeedback,
        isGeneratingInfographic, handleGenerateInfographic,
        infographicUrl, handleSelectReviewDraft, isFetchingDraftDetails,
        handleClearForm,
        user, role,
        handleRefineSelection, primaryKeyword
    } = useDashboard();

    const [selectionRect, setSelectionRect] = React.useState<DOMRect | null>(null);
    const [isToolbarVisible, setIsToolbarVisible] = React.useState(false);
    const [isLinkActive, setIsLinkActive] = React.useState(false);
    const [isEditorFocused, setIsEditorFocused] = React.useState(false);
    const editorRef = React.useRef<HTMLDivElement>(null);

    const refinementRef = React.useRef<HTMLDivElement>(null);

    const scrollToRefinement = () => {
        refinementRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const isReadOnly = role === 'editor';
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    // Ensure we start at the top when a draft is selected
    React.useEffect(() => {
        if (selectedReviewDraft) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [selectedReviewDraft?.id]);

    // Sync HTML content into the editor DOM only when NOT focused
    // This prevents background updates from 'clobbering' active user edits.
    React.useEffect(() => {
        if (!isEditorFocused && editorRef.current && selectedReviewDraft?.content) {
            editorRef.current.innerHTML = selectedReviewDraft.content;
        }
    }, [selectedReviewDraft?.content, isEditorFocused]);

    // --- Bulletproof Toolbar Logic ---
    const updateSelectionRect = React.useCallback(() => {
        // The timeout is critical: it lets the browser finish the 'click' 
        // before we ask it 'where is the cursor?'
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || !editorRef.current) {
                setIsToolbarVisible(false);
                return;
            }

            const range = selection.getRangeAt(0);
            if (!editorRef.current.contains(range.commonAncestorContainer)) return;

            // Detection: Look up the tree for an <a> tag
            const container = range.commonAncestorContainer;
            const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;
            
            // Robust Detection: Check both the container and selection nodes for an <a> tag
            const activeLink = element?.closest('a') || 
                             selection.anchorNode?.parentElement?.closest('a') || 
                             selection.focusNode?.parentElement?.closest('a');
            
            const isInsideLink = !!activeLink;

            setIsLinkActive(isInsideLink);

            const rect = range.getBoundingClientRect();

            // Fix: Toolbar ONLY appearing when text is selected (highlighted)
            // Remove logic that shows it for single clicks on links
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
                    // Restore focus just in case, though preventDefault should handle it
                    editorRef.current.focus();
                    document.execCommand('unlink', false, undefined);

                    // Capture and Sync
                    const latestHtml = editorRef.current.innerHTML;
                    const updatedDraft = { ...selectedReviewDraft, content: latestHtml };
                    setSelectedReviewDraft(updatedDraft);
                    handleSaveManualEdits(updatedDraft);

                    // Reset UI state to close toolbar smoothly
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
                anchor.className = 'text-indigo-500 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-600 transition-all font-medium';
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
                placeholder.className = 'bg-indigo-100 dark:bg-indigo-900/30 animate-pulse rounded px-1 text-indigo-500';
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

    // Role-based filtering of the visual list
    const filteredDrafts = React.useMemo(() => {
        if (!role || !user) return null; // Role or User still loading
        if (role === 'admin') return reviewDrafts;
        return reviewDrafts.filter(d => d.createdBy === user?.id);
    }, [reviewDrafts, role, user]);

    return (
        <div className="relative">
            {selectedReviewDraft ? (
                <div className={`animate-fadeIn w-full transition-all duration-300 ${isPreviewOpen ? 'opacity-0 pointer-events-none' : 'space-y-12 pb-24'}`}>
                    {/* Header Actions */}
                    <div className="sticky top-[-1px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-20 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="w-full flex items-center justify-between py-8 px-10">
                            <div className="flex items-center gap-6">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedReviewDraft(null);
                                        handleClearForm();
                                    }}
                                    className="h-10 rounded-none text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <X className="w-4 h-4 mr-3" />
                                    Return
                                </Button>
                                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                                <Badge variant="pending" className="px-4 py-1">Editorial Review</Badge>
                            </div>
                            <div className="flex items-center gap-3">
                                {role === 'admin' && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={scrollToRefinement}
                                        className="whitespace-nowrap px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none font-bold uppercase tracking-widest text-[10px]"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Refine With AI
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <section className="w-full space-y-10 px-10 relative">
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
                        <Input
                            label="Editorial Title"
                            value={selectedReviewDraft.title}
                            onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                            className="text-3xl font-extrabold py-8 px-0 border-none bg-transparent focus:ring-0 focus:border-indigo-500 rounded-none border-b border-slate-100 dark:border-slate-800 tracking-tight text-center"
                        />

                        {selectedReviewDraft.imageUrl && (
                            <div className="relative mb-12 group overflow-hidden rounded-none shadow-2xl">
                                {/* Base Image */}
                                <img
                                    src={selectedReviewDraft.imageUrl}
                                    alt={selectedReviewDraft.title}
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
                                        className="absolute left-[40px] text-white flex flex-col gap-0 max-w-2xl drop-shadow-2xl"
                                        style={{ top: '100px', lineHeight: '1.3' }}
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

                                    {/* Logo Overlay (Bottom-Right: 40px) */}
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
                            className={`text-black dark:text-white text-base leading-relaxed prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px]
                                prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold ${isReadOnly ? 'cursor-default' : ''}`}
                            onMouseUp={updateSelectionRect}
                            onSelect={updateSelectionRect}
                            onKeyUp={(e) => {
                                if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return;
                                updateSelectionRect();
                            }}
                            onKeyDown={(e) => {
                                // Check for Ctrl+K or Cmd+K
                                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                                    e.preventDefault(); // Stop browser search/address bar
                                    const url = window.prompt('Enter the URL:');
                                    if (url) {
                                        handleToolbarAction('link', url);
                                    }
                                }
                            }}
                            onMouseDown={(e) => {
                                // If we click a link, handle special interactions (Ctrl+Click or Double-Click)
                                const target = (e.target as HTMLElement).closest('a');
                                if (target) {
                                    if (e.ctrlKey || e.metaKey || e.detail === 2) {
                                        e.preventDefault();
                                        window.open(target.href, '_blank');
                                    }
                                }

                                // Do NOT setSelectionRect(null) here anymore. 
                                // Let updateSelectionRect handle the visibility.
                            }}
                        />

                        {/* Infographic Section */}
                        {selectedReviewDraft.infographicUrl && (
                            <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">Visual Insight</h4>
                                <div className="w-full">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <img src={selectedReviewDraft.infographicUrl} alt="Infographic" className="w-full h-auto" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* AI Refinement Section - Only for Admins */}
                    {!isReadOnly && (
                        <section
                            className="w-auto mx-[-1.5rem] lg:mx-[-2.5rem] border-y border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/30"
                            ref={refinementRef}
                        >
                            <div className="flex flex-col">
                                <div className="w-full py-4 px-10">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">AI Refinement</h4>
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
                                        className="w-full bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800/50 min-h-[160px] rounded-none px-0 py-8 text-base shadow-none focus:ring-0"
                                    />
                                    <div className="w-full flex justify-center px-10">
                                        <Button
                                            variant="secondary"
                                            onClick={handleApplyReviewFeedback}
                                            isLoading={isApplyingFeedback}
                                            disabled={!feedback || !primaryKeyword}
                                            className="w-[90%] lg:w-[85%] h-14 rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all uppercase tracking-[0.2em] text-[10px] font-bold mb-8 shadow-sm"
                                        >
                                            Apply Refinement
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Standalone Bottom Actions */}
                    <div className="w-full pt-10 pb-20 flex flex-wrap items-center justify-center gap-6 border-t border-slate-100 dark:border-slate-800/50 px-10">
                        {!isReadOnly && (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={handleSaveManualEdits}
                                    isLoading={isSavingManual}
                                    className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px] bg-indigo-50/80 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-none"
                                >
                                    Save Edits
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                                    isLoading={isRejecting}
                                    className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px]"
                                >
                                    Reject
                                </Button>
                            </>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsPreviewOpen(true)}
                            className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px] bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-colors shadow-none font-bold"
                        >
                            Preview
                        </Button>
                        {!isReadOnly && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApproveDraft(selectedReviewDraft)}
                                isLoading={isPublished}
                                className="whitespace-nowrap px-10 py-4 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/10 dark:shadow-none rounded-none h-14 min-w-[220px]"
                            >
                                <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                                Approve & Publish
                            </Button>
                        )}
                        {isReadOnly && (
                            <div className="px-10 py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Review Only Mode
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="animate-fadeIn max-w-4xl mx-auto w-full space-y-8 pb-20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Editorial Buffer ({filteredDrafts?.length || 0})</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {isFetchingDrafts || filteredDrafts === null ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-6 items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                                    <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <Skeleton className="h-5 w-2/3" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            ))
                        ) : filteredDrafts.length > 0 ? (
                            filteredDrafts.map((draft) => (
                                <Card
                                    key={draft.id}
                                    hoverable
                                    className="p-8 cursor-pointer group border-slate-200 dark:border-slate-800"
                                >
                                    <div
                                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${selectedReviewDraft?.id === draft.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        onClick={() => handleSelectReviewDraft(draft.id)}
                                    >                                <div className="flex items-center gap-7">
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-300 shadow-sm">
                                                <FileText className="w-8 h-8 text-indigo-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                                                    {draft.title}
                                                </h3>
                                                <div className="flex items-center gap-6">
                                                    <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(draft.createdAt || draft.created_at).toLocaleDateString()}
                                                    </span>
                                                    {(draft.authorEmail || draft.createdBy) && (
                                                        <span className="text-[10px] font-medium text-indigo-400 lowercase italic">
                                                            by {draft.authorEmail || draft.createdBy}
                                                        </span>
                                                    )}
                                                    <Badge variant="outline" className="px-3">Draft</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-500">Launch Review</span>
                                            <ArrowRight className="w-5 h-5 text-indigo-500" />
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="bg-white/40 dark:bg-indigo-950/5 backdrop-blur-sm border-2 border-dashed border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-indigo-100 dark:ring-indigo-900/50 shadow-inner">
                                    <Zap className="w-10 h-10 text-indigo-500 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editorial Buffer Empty</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is ready for new high-intent content generations.</p>
                            </div>
                        )}
                    </div>

                    {/* Admin Activity Dashboard Section */}
                    {role === 'admin' && <AdminTracking />}
                </div>
            )}

            {/* Preview Modal - Sibling to all content, truly fixed */}
            {isPreviewOpen && selectedReviewDraft && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-950 w-[96%] h-[94vh] flex flex-col rounded-lg shadow-2xl relative animate-scaleIn overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsPreviewOpen(false)}
                            className="absolute top-8 right-8 p-3 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all z-30 shadow-sm"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-20">
                            <div className="max-w-4xl mx-auto space-y-12">
                                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight font-serif">
                                    {selectedReviewDraft.title}
                                </h1>

                                {selectedReviewDraft.imageUrl && (
                                    <div className="relative group overflow-hidden rounded-none shadow-xl border border-slate-100 dark:border-slate-800">
                                        <img
                                            src={selectedReviewDraft.imageUrl}
                                            alt={selectedReviewDraft.title}
                                            className="w-full h-auto object-cover"
                                            style={{ aspectRatio: '4/3' }}
                                        />
                                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(126, 87, 194, 0.45)' }} />
                                        <div className="absolute inset-0 pointer-events-none">
                                            {/* Blog Tag Overlay (Top-Left: 40px) */}
                                            <img src="/Blog.png" className="absolute top-[40px] left-[40px] h-10 w-auto" alt="blog" />

                                            {/* Title Group Overlay */}
                                            <div
                                                className="absolute left-[40px] text-white flex flex-col gap-0 max-w-2xl drop-shadow-2xl"
                                                style={{ top: '100px', lineHeight: '1.3' }}
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

                                            {/* Logo Overlay (Bottom-Right: 40px) */}
                                            <img src="/10xDS.png" className="absolute bottom-[40px] right-[40px] h-14 w-auto" alt="logo" />
                                        </div>
                                    </div>
                                )}

                                <article
                                    dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }}
                                    className="text-black dark:text-white text-lg leading-relaxed prose prose-stone dark:prose-invert max-w-none
                                        prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold"
                                />

                                {/* Modal Infographic */}
                                {selectedReviewDraft.infographicUrl && (
                                    <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">Visual Summary</h4>
                                        <div className="border border-slate-200 dark:border-slate-800 shadow-xl">
                                            <img src={selectedReviewDraft.infographicUrl} alt="Infographic" className="w-full h-auto" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <Button
                                variant="secondary"
                                onClick={() => setIsPreviewOpen(false)}
                                className="px-8 h-14 rounded-none border border-slate-200 dark:border-slate-800"
                            >
                                Continue Editing
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    handleApproveDraft(selectedReviewDraft);
                                    setIsPreviewOpen(false);
                                }}
                                isLoading={isPublished}
                                className="px-8 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-none shadow-lg shadow-emerald-600/10"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve & Publish Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
