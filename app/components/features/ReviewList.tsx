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
    AlertCircle, Loader2, Trash2, CheckSquare, RefreshCw, Upload, Download
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
        selectedCategories, setSelectedCategories,
        isGenerating, targetPlatform, generateFeaturedImage
    } = useDashboard();

    const [selectionRect, setSelectionRect] = React.useState<DOMRect | null>(null);
    const [isToolbarVisible, setIsToolbarVisible] = React.useState(false);
    const [isLinkActive, setIsLinkActive] = React.useState(false);
    const [isEditorFocused, setIsEditorFocused] = React.useState(false);
    const [savedRange, setSavedRange] = React.useState<Range | null>(null);
    const [isRegeneratingImage, setIsRegeneratingImage] = React.useState(false);
    const [isUploadingImage, setIsUploadingImage] = React.useState(false);
    const [isUploadingInfographic, setIsUploadingInfographic] = React.useState(false);
    const [isRefiningVisual, setIsRefiningVisual] = React.useState(false);
    const [selectedDraftIds, setSelectedDraftIds] = React.useState<string[]>([]);
    const [draftToDelete, setDraftToDelete] = React.useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
    const [isDownloadingImage, setIsDownloadingImage] = React.useState(false);
    const editorRef = React.useRef<HTMLDivElement>(null);

    const handleDownloadLinkedInBanner = async () => {
        if (!selectedReviewDraft || isDownloadingImage) return;
        setIsDownloadingImage(true);
        try {
            const res = await fetch('/api/banner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: selectedReviewDraft.title,
                    bgUrl: selectedReviewDraft.imageUrl,
                    platform: 'linkedin'
                })
            });

            if (!res.ok) throw new Error('Failed to generate banner image');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `linkedin-banner-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download banner in review:', err);
        } finally {
            setIsDownloadingImage(false);
        }
    };

    const handleRegenerateFeaturedImage = async () => {
        if (!selectedReviewDraft?.title || isRegeneratingImage || isUploadingImage) return;
        setIsRegeneratingImage(true);
        try {
            const newUrl = await generateFeaturedImage({
                prompt: selectedReviewDraft.prompt || selectedReviewDraft.title,
                title: selectedReviewDraft.title,
                keywords: selectedReviewDraft.keywords || [],
                platform: selectedReviewDraft.platform || targetPlatform
            });
            if (newUrl && selectedReviewDraft) {
                const updated = { ...selectedReviewDraft, imageUrl: newUrl };
                setSelectedReviewDraft(updated);
                handleSaveManualEdits(updated);
            }
        } catch (err) {
            console.error("Failed to regenerate featured image in review:", err);
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleUploadFeaturedImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isRegeneratingImage || isUploadingImage) return;
        setIsUploadingImage(true);
        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Url = reader.result as string;
                if (base64Url && selectedReviewDraft) {
                    const updated = { ...selectedReviewDraft, imageUrl: base64Url };
                    setSelectedReviewDraft(updated);
                    handleSaveManualEdits(updated);
                }
                setIsUploadingImage(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Failed to upload featured image in review:", err);
            setIsUploadingImage(false);
        }
    };

    const handleUploadInfographicImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || isInfographicRefining || isUploadingInfographic) return;
        setIsUploadingInfographic(true);
        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Url = reader.result as string;
                if (base64Url && selectedReviewDraft) {
                    const updated = { ...selectedReviewDraft, infographicUrl: base64Url };
                    setSelectedReviewDraft(updated);
                    handleSaveManualEdits(updated);
                }
                setIsUploadingInfographic(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Failed to upload infographic image in review:", err);
            setIsUploadingInfographic(false);
        }
    };

    const refinementRef = React.useRef<HTMLDivElement>(null);

    const scrollToRefinement = () => {
        refinementRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const isReadOnly = role === 'editor' || role === 'viewer';

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

    // Sync HTML content into the editor DOM only when NOT focused & toolbar closed
    React.useEffect(() => {
        if (!isEditorFocused && !isToolbarVisible && editorRef.current && selectedReviewDraft?.content) {
            editorRef.current.innerHTML = selectedReviewDraft.content;
        }
    }, [selectedReviewDraft?.content, isEditorFocused, isToolbarVisible]);

    const updateSelectionRect = React.useCallback(() => {
        if (isReadOnly) return;
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
                             selection.focusNode?.parentElement?.closest('a') ||
                             element?.closest('span.stat-highlight') ||
                             selection.anchorNode?.parentElement?.closest('span.stat-highlight') ||
                             selection.focusNode?.parentElement?.closest('span.stat-highlight');
            
            const isInsideLink = !!activeLink;
            setIsLinkActive(isInsideLink);
            const rect = range.getBoundingClientRect();

            if (rect.width > 0 && !selection.isCollapsed) {
                setSavedRange(range.cloneRange());
                setSelectionRect(rect);
                setIsToolbarVisible(true);
            } else {
                setIsToolbarVisible(false);
            }
        }, 0);
    }, [isReadOnly]);

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
                    
                    let unlinkedStat = false;
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                        let container = sel.getRangeAt(0).commonAncestorContainer;
                        if (container.nodeType === 3) container = container.parentNode as Node;
                        const statSpan = container instanceof HTMLElement ? container.closest('span.stat-highlight') : null;
                        if (statSpan) {
                            const text = document.createTextNode(statSpan.textContent || '');
                            statSpan.parentNode?.replaceChild(text, statSpan);
                            unlinkedStat = true;
                        }
                    }

                    let unlinkedFramer = false;
                    const activePlatform = selectedReviewDraft?.platform || targetPlatform;
                    if (!unlinkedStat && activePlatform === 'framer' && sel && sel.rangeCount > 0) {
                        let container = sel.getRangeAt(0).commonAncestorContainer;
                        if (container.nodeType === 3) container = container.parentNode as Node;
                        const anchor = container instanceof HTMLElement ? container.closest('a') : null;
                        if (anchor) {
                            const text = document.createTextNode(anchor.textContent || '');
                            anchor.parentNode?.replaceChild(text, anchor);
                            unlinkedFramer = true;
                        }
                    }

                    if (!unlinkedStat && !unlinkedFramer) {
                        document.execCommand('unlink', false, undefined);
                    }

                    const latestHtml = editorRef.current.innerHTML;
                    const updatedDraft = { ...selectedReviewDraft, content: latestHtml };
                    setSelectedReviewDraft(updatedDraft);
                    handleSaveManualEdits(updatedDraft);
                    setIsToolbarVisible(false);
                    setSelectionRect(null);
                }
                break;
            case 'link': {
                let sel = window.getSelection();
                let range: Range | null = null;

                if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
                    range = sel.getRangeAt(0);
                } else if (savedRange && editorRef.current?.contains(savedRange.commonAncestorContainer)) {
                    range = savedRange;
                    sel = window.getSelection();
                    if (sel) {
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }

                if (!range || !value) return;

                let formattedUrl = value.trim();
                if (formattedUrl && !/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('mailto:') && !formattedUrl.startsWith('#')) {
                    formattedUrl = `https://${formattedUrl}`;
                }

                // Find existing URL using robust 3-way check
                let anchor: HTMLElement | null = null;

                // Check 1: Selection start container
                let startNode = range.startContainer;
                if (startNode.nodeType === 3) startNode = startNode.parentNode as Node;
                if (startNode instanceof HTMLElement) anchor = startNode.closest('a') || startNode.closest('span.stat-highlight');

                // Check 2: Selection end container
                if (!anchor) {
                    let endNode = range.endContainer;
                    if (endNode.nodeType === 3) endNode = endNode.parentNode as Node;
                    if (endNode instanceof HTMLElement) anchor = endNode.closest('a') || endNode.closest('span.stat-highlight');
                }

                // Check 3: Common ancestor contains or is an anchor
                if (!anchor) {
                    let container = range.commonAncestorContainer;
                    if (container.nodeType === 3) container = container.parentNode as Node;
                    if (container instanceof HTMLElement) {
                        const activePlatform = selectedReviewDraft?.platform || targetPlatform;
                        if (activePlatform === 'framer') {
                            anchor = container.closest('a') || container.closest('span.stat-highlight');
                        } else {
                            anchor = container.closest('a') || container.querySelector('a') || container.closest('span.stat-highlight') || container.querySelector('span.stat-highlight');
                        }
                    }
                }

                if (anchor) {
                    if (anchor.tagName.toLowerCase() === 'a') {
                        const has10xds = /10xds/i.test(formattedUrl);
                        (anchor as HTMLAnchorElement).href = formattedUrl;
                        const activePlatform = selectedReviewDraft?.platform || targetPlatform;
                        if (activePlatform === 'framer') {
                            if (has10xds) {
                                anchor.setAttribute('style', 'color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;');
                            } else {
                                anchor.setAttribute('style', 'color: #ef4444; text-decoration: underline; text-decoration-color: #ef4444; font-weight: 500;');
                            }
                        } else {
                            if (has10xds) {
                                anchor.className = 'text-violet-500 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-600 transition-all font-medium';
                            } else {
                                anchor.className = 'text-red-500 underline decoration-red-300 underline-offset-4 hover:decoration-red-600 transition-all font-medium';
                            }
                        }
                    } else {
                        anchor.setAttribute('data-source', formattedUrl);
                    }
                } else {
                    const newAnchor = document.createElement('a');
                    newAnchor.href = formattedUrl;
                    newAnchor.target = '_blank';
                    newAnchor.rel = 'noopener noreferrer';
                    const activePlatform = selectedReviewDraft?.platform || targetPlatform;
                    const has10xds = /10xds/i.test(formattedUrl);
                    if (activePlatform === 'framer') {
                        if (has10xds) {
                            newAnchor.setAttribute('style', 'color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;');
                        } else {
                            newAnchor.setAttribute('style', 'color: #ef4444; text-decoration: underline; text-decoration-color: #ef4444; font-weight: 500;');
                        }
                    } else {
                        if (has10xds) {
                            newAnchor.className = 'text-violet-500 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-600 transition-all font-medium';
                        } else {
                            newAnchor.className = 'text-red-500 underline decoration-red-300 underline-offset-4 hover:decoration-red-600 transition-all font-medium';
                        }
                    }
                    newAnchor.appendChild(range.extractContents());
                    range.insertNode(newAnchor);
                }

                if (sel) sel.collapseToEnd();
                setSavedRange(null);

                if (editorRef.current && selectedReviewDraft) {
                    const html = editorRef.current.innerHTML;
                    const updatedDraft = { ...selectedReviewDraft, content: html };
                    setSelectedReviewDraft(updatedDraft);
                    handleSaveManualEdits(updatedDraft);
                }
                break;
            }
            case 'humanize':
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
        
        const platformBase = reviewDrafts.filter(d => {
            if (targetPlatform === 'framer') return d.platform === 'framer';
            if (targetPlatform === 'linkedin') return d.platform === 'linkedin';
            // WordPress mode shows both wordpress-tagged and legacy (null) posts
            return d.platform === 'wordpress' || !d.platform;
        });

        if (role === 'admin' || role === 'viewer') return platformBase;
        return platformBase.filter(d => d.createdBy === user?.uid);
    }, [reviewDrafts, role, user, targetPlatform]);

    return (
        <div className="relative">
            {selectedReviewDraft ? (
        <div ref={scrollContainerRef} className={`animate-fadeIn w-full transition-all duration-500 space-y-12 pb-24`}>
                    {/* Part 3: Editorial Sub-Header (True Studio Strip) */}
                    <div className="sticky top-[-1px] bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl z-30 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="w-full grid grid-cols-3 items-center h-20 px-6">
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
                            {targetPlatform !== 'linkedin' && selectedReviewDraft.platform !== 'linkedin' ? (
                                <div className="flex items-center justify-end gap-3 pr-2 col-start-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1 opacity-70">
                                        {targetPlatform === 'framer' ? 'Framer Category' : 'WordPress Category'}
                                    </span>
                                    <div className="min-w-[180px]">
                                        <CategorySelector 
                                            selectedIds={selectedCategories}
                                            onChange={setSelectedCategories}
                                            readOnly={isReadOnly}
                                            hideLabel={true}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="col-start-3" />
                            )}
                        </div>
                    </div>

                    {/* Content Section */}
                    <section className="w-full space-y-12 relative lg:px-12 px-6">
                        {!isReadOnly && selectionRect && (
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
                            {(targetPlatform === 'linkedin' || selectedReviewDraft.platform === 'linkedin') ? (
                                <>
                                    {/* 1. Featured Image Overlay (First for LinkedIn) */}
                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative mb-12 group overflow-hidden rounded-none shadow-2xl w-full">
                                            <img
                                                src={selectedReviewDraft.imageUrl}
                                                alt={selectedReviewDraft.title}
                                                className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                                                style={{ aspectRatio: '1706/960' }}
                                            />
                                            <div
                                                className="absolute inset-0 z-10 pointer-events-none"
                                                style={{ backgroundColor: 'rgba(58, 26, 102, 0.75)' }}
                                            />
                                            <div className="absolute inset-0 z-20 pointer-events-none">
                                                {/* Layer 1: Blog Tag */}
                                                <div className="absolute top-0 pointer-events-none" style={{ left: '80px' }}>
                                                    <img src="/linkedlin tag.png" alt="LinkedIn Tag" className="h-16 lg:h-24 w-auto object-contain" />
                                                </div>

                                                {/* Layer 2: Title Group */}
                                                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-start" style={{ paddingLeft: '80px', paddingRight: '80px' }}>
                                                    <div className="flex flex-row items-stretch gap-6 border-l-8 border-[#2DD4BF]" style={{ paddingLeft: '32px' }}>
                                                        <div className="text-white w-full font-sans drop-shadow-2xl flex flex-col items-start text-left w-[75%]" style={{ lineHeight: '1.2' }}>
                                                            {selectedReviewDraft.title.includes(':') ? (
                                                                <>
                                                                    <h1 className="text-[32px] md:text-[42px] lg:text-[64px] font-bold tracking-tight m-0 p-0 leading-[1.2]">
                                                                        {selectedReviewDraft.title.split(':')[0]}:
                                                                    </h1>
                                                                    <p className="text-[24px] md:text-[32px] lg:text-[48px] font-normal opacity-95 mt-4 m-0 p-0 leading-[1.3]">
                                                                        {selectedReviewDraft.title.split(':').slice(1).join(':').trim()}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <h1 className="text-[32px] md:text-[42px] lg:text-[64px] font-bold tracking-tight m-0 p-0 leading-[1.2]">
                                                                    {selectedReviewDraft.title}
                                                                </h1>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Layer 3: Logo */}
                                                <div className="absolute pointer-events-none flex z-30" style={{ bottom: '80px', right: '80px' }}>
                                                    <img src="/10xDS.png" alt="10xDS" className="h-8 lg:h-12 w-auto object-contain" />
                                                </div>
                                            </div>

                                            {/* Layer 4: Docked Top-Right Square Glass Buttons for Download, Regenerate & Upload */}
                                            <div className="absolute top-6 right-6 z-[60] flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto">
                                                <button
                                                    type="button"
                                                    disabled={isRegeneratingImage || isUploadingImage || isDownloadingImage}
                                                    onClick={handleDownloadLinkedInBanner}
                                                    className="w-10 h-10 flex items-center justify-center bg-slate-900/90 hover:bg-sky-600 text-white rounded-xl backdrop-blur-xl border border-white/20 hover:border-sky-400 shadow-xl transition-all duration-200 active:scale-95 disabled:opacity-50 group/btn"
                                                    title="Download LinkedIn Banner"
                                                >
                                                    {isDownloadingImage ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-sky-300" />
                                                    ) : (
                                                        <Download className="w-5 h-5 text-sky-300 group-hover/btn:text-white transition-colors" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isRegeneratingImage || isUploadingImage || isDownloadingImage}
                                                    onClick={handleRegenerateFeaturedImage}
                                                    className="w-10 h-10 flex items-center justify-center bg-slate-900/90 hover:bg-violet-600 text-white rounded-xl backdrop-blur-xl border border-white/20 hover:border-violet-400 shadow-xl transition-all duration-200 active:scale-95 disabled:opacity-50 group/btn"
                                                    title="Regenerate Image"
                                                >
                                                    {isRegeneratingImage ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-violet-300" />
                                                    ) : (
                                                        <RefreshCw className="w-5 h-5 text-violet-300 group-hover/btn:text-white transition-colors" />
                                                    )}
                                                </button>
                                                <label className={`w-10 h-10 flex items-center justify-center bg-slate-900/90 hover:bg-emerald-600 text-white rounded-xl backdrop-blur-xl border border-white/20 hover:border-emerald-400 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer group/btn ${isRegeneratingImage || isUploadingImage || isDownloadingImage ? 'opacity-50 pointer-events-none' : ''}`} title="Upload Custom Image">
                                                    {isUploadingImage ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                                                    ) : (
                                                        <Upload className="w-5 h-5 text-emerald-300 group-hover/btn:text-white transition-colors" />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleUploadFeaturedImage}
                                                        disabled={isRegeneratingImage || isUploadingImage || isDownloadingImage}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Title Input (Second for LinkedIn) */}
                                    <Input
                                        label="Editorial Title"
                                        value={selectedReviewDraft.title}
                                        onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                        className="text-4xl font-extrabold py-8 lg:px-12 px-6 border-none bg-transparent focus:ring-0 focus:border-violet-500 rounded-none border-b border-slate-100 dark:border-slate-800 tracking-tight text-center"
                                    />
                                </>
                            ) : (
                                <>
                                    {/* 1. Title Input (First for WP/Framer) */}
                                    <Input
                                        label="Editorial Title"
                                        value={selectedReviewDraft.title}
                                        onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                                        className="text-4xl font-extrabold py-8 lg:px-12 px-6 border-none bg-transparent focus:ring-0 focus:border-violet-500 rounded-none border-b border-slate-100 dark:border-slate-800 tracking-tight text-center"
                                    />

                                    {/* 2. Featured Image Overlay (Second for WP/Framer) */}
                                    {selectedReviewDraft.imageUrl && (
                                        <div className="relative mb-12 group overflow-hidden rounded-none shadow-2xl w-full">
                                            <img
                                                src={selectedReviewDraft.imageUrl}
                                                alt={selectedReviewDraft.title}
                                                className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                                                style={{ aspectRatio: '4/3' }}
                                            />
                                            <div
                                                className="absolute inset-0 z-10 pointer-events-none"
                                                style={{ backgroundColor: 'rgba(58, 26, 102, 0.75)' }}
                                            />
                                            <div className="absolute inset-0 z-20 pointer-events-none">
                                                {targetPlatform !== 'framer' && (
                                                    <img
                                                        src="/Blog.png"
                                                        alt="Blog Tag"
                                                        className="absolute top-[30px] lg:top-[40px] left-[30px] lg:left-[40px] w-auto h-8 lg:h-10 object-contain"
                                                    />
                                                )}
                                                <div
                                                    className="absolute inset-x-10 top-[100px] lg:top-[120px] flex flex-col items-center justify-center text-center text-white gap-0 drop-shadow-2xl px-10"
                                                    style={{ lineHeight: '1.2' }}
                                                >
                                                    {selectedReviewDraft.title.includes(':') ? (
                                                        <>
                                                            <h1 className="text-[32px] md:text-[42px] lg:text-[56px] font-bold tracking-tight m-0 p-0 leading-[1.3]">
                                                                {selectedReviewDraft.title.split(':')[0]}:
                                                            </h1>
                                                            <p className="text-[24px] md:text-[32px] lg:text-[44px] font-normal opacity-95 m-0 p-0 leading-[1.3]">
                                                                {selectedReviewDraft.title.split(':').slice(1).join(':').trim()}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <h1 className="text-[32px] md:text-[42px] lg:text-[56px] font-bold tracking-tight m-0 p-0 leading-[1.3]">
                                                            {selectedReviewDraft.title}
                                                        </h1>
                                                    )}
                                                </div>
                                                {targetPlatform !== 'framer' && (
                                                    <div className="absolute bottom-[60px] lg:bottom-[80px] right-[30px] lg:right-[60px] pointer-events-none flex z-50">
                                                        <img src="/10xDS.png" alt="10xDS" className="h-8 lg:h-12 w-auto object-contain" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Layer 4: Docked Top-Right Square Glass Buttons for Regenerate & Upload */}
                                            <div className="absolute top-6 right-6 z-[60] flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto">
                                                <button
                                                    type="button"
                                                    disabled={isRegeneratingImage || isUploadingImage}
                                                    onClick={handleRegenerateFeaturedImage}
                                                    className="w-10 h-10 flex items-center justify-center bg-slate-900/90 hover:bg-violet-600 text-white rounded-xl backdrop-blur-xl border border-white/20 hover:border-violet-400 shadow-xl transition-all duration-200 active:scale-95 disabled:opacity-50 group/btn"
                                                    title="Regenerate Image"
                                                >
                                                    {isRegeneratingImage ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-violet-300" />
                                                    ) : (
                                                        <RefreshCw className="w-5 h-5 text-violet-300 group-hover/btn:text-white transition-colors" />
                                                    )}
                                                </button>
                                                <label className={`w-10 h-10 flex items-center justify-center bg-slate-900/90 hover:bg-emerald-600 text-white rounded-xl backdrop-blur-xl border border-white/20 hover:border-emerald-400 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer group/btn ${isRegeneratingImage || isUploadingImage ? 'opacity-50 pointer-events-none' : ''}`} title="Upload Custom Image">
                                                    {isUploadingImage ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                                                    ) : (
                                                        <Upload className="w-5 h-5 text-emerald-300 group-hover/btn:text-white transition-colors" />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleUploadFeaturedImage}
                                                        disabled={isRegeneratingImage || isUploadingImage}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                            className={`text-black dark:text-white text-base leading-relaxed prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px] w-full lg:px-12 px-6 platform-${targetPlatform}
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
                                    
                                    // Find if already linked using robust 3-way selection check
                                    let existingUrl = '';
                                    const sel = window.getSelection();
                                    if (sel && sel.rangeCount > 0) {
                                        const range = sel.getRangeAt(0);
                                        let anchor: HTMLElement | null = null;
                                        
                                        // Check 1: Selection start container
                                        let startNode = range.startContainer;
                                        if (startNode.nodeType === 3) startNode = startNode.parentNode as Node;
                                        if (startNode instanceof HTMLElement) anchor = startNode.closest('a') || startNode.closest('span.stat-highlight');
                                        
                                        // Check 2: Selection end container
                                        if (!anchor) {
                                            let endNode = range.endContainer;
                                            if (endNode.nodeType === 3) endNode = endNode.parentNode as Node;
                                            if (endNode instanceof HTMLElement) anchor = endNode.closest('a') || endNode.closest('span.stat-highlight');
                                        }
                                        
                                        // Check 3: Common ancestor contains or is an anchor
                                        if (!anchor) {
                                            let container = range.commonAncestorContainer;
                                            if (container.nodeType === 3) container = container.parentNode as Node;
                                            if (container instanceof HTMLElement) {
                                                const activePlatform = selectedReviewDraft?.platform || targetPlatform;
                                                if (activePlatform === 'framer') {
                                                    anchor = container.closest('a') || container.closest('span.stat-highlight');
                                                } else {
                                                    anchor = container.closest('a') || container.querySelector('a') || container.closest('span.stat-highlight') || container.querySelector('span.stat-highlight');
                                                }
                                            }
                                        }
                                        
                                        if (anchor) {
                                            if (anchor.tagName.toLowerCase() === 'a') {
                                                existingUrl = anchor.getAttribute('href') || '';
                                            } else {
                                                existingUrl = anchor.getAttribute('data-source') || '';
                                            }
                                        }
                                    }

                                    const url = window.prompt('Enter the URL:', existingUrl);
                                    if (url) handleToolbarAction('link', url);
                                }
                            }}
                            onDoubleClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.classList.contains('stat-highlight')) {
                                    const sourceUrl = target.getAttribute('data-source');
                                    if (sourceUrl) {
                                        window.open(sourceUrl, '_blank');
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
                            }}
                        />

                        {selectedReviewDraft.infographicUrl && (
                            <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800/50">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex-1" />
                                    <h4 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center">Visual Insight</h4>
                                    <div className="flex-1 flex justify-end">
                                        {role !== 'viewer' && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setIsRefiningVisual(!isRefiningVisual)}
                                                className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-white flex items-center gap-2"
                                            >
                                                {isRefiningVisual ? <X className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                {isRefiningVisual ? 'Close' : 'Refine'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full space-y-6">
                                    {role !== 'viewer' && (
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
                                                    Update Graphic
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden shadow-2xl relative group">
                                        <img src={selectedReviewDraft.infographicUrl} alt="Infographic" className="w-full h-auto" />
                                        
                                        {/* Docked Top-Right Square Glass Button for Uploading Custom Infographic */}
                                        {role !== 'viewer' && (
                                            <div className="absolute top-6 right-6 z-[60] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto">
                                                <label className={`w-10 h-10 flex items-center justify-center bg-slate-900/90 hover:bg-emerald-600 text-white rounded-xl backdrop-blur-xl border border-white/20 hover:border-emerald-400 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer group/btn ${isInfographicRefining || isUploadingInfographic ? 'opacity-50 pointer-events-none' : ''}`} title="Upload Custom Graphic">
                                                    {isUploadingInfographic ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                                                    ) : (
                                                        <Upload className="w-5 h-5 text-emerald-300 group-hover/btn:text-white transition-colors" />
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleUploadInfographicImage}
                                                        disabled={isInfographicRefining || isUploadingInfographic}
                                                    />
                                                </label>
                                            </div>
                                        )}
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
                                <div className="mt-2">
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Inject directives to refine this post..."
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none p-6 text-base focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none min-h-[160px]"
                                    />
                                    <Button
                                        variant="primary"
                                        onClick={handleApplyReviewFeedback}
                                        isLoading={isGenerating}
                                        disabled={!feedback || isGenerating}
                                        className="w-full h-14 rounded-none bg-violet-600 hover:bg-violet-700 uppercase tracking-widest text-[11px] font-bold shadow-lg"
                                    >
                                        {isGenerating ? 'Processing...' : 'Apply AI Refinement'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Review Actions (Relocated to bottom of post) */}
                        {role !== 'viewer' && (
                            <div className="mt-32 pt-16 border-t border-slate-100 dark:border-slate-800/50 flex flex-col items-center gap-10">
                                <div className="flex flex-wrap items-center justify-center gap-6 w-full">
                                    <Button variant="secondary" onClick={() => handleSaveManualEdits()} isLoading={isSavingManual} className="whitespace-nowrap px-10 py-4 rounded-none h-14 min-w-[180px] bg-violet-50/80 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 transition-colors shadow-none uppercase font-black tracking-widest text-[10px]">
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
                <div className="animate-fadeIn w-full space-y-10 pb-24 transition-all duration-500 px-4 lg:px-8 relative">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Editorial Buffer ({filteredDrafts?.length || 0})</h2>
                            {filteredDrafts && filteredDrafts.length > 0 && role !== 'viewer' && (
                                <button
                                    onClick={() => setSelectedDraftIds(selectedDraftIds.length === filteredDrafts.length ? [] : filteredDrafts.map(d => d.id))}
                                    className="text-[10px] font-bold tracking-widest uppercase text-violet-500 hover:text-violet-600 transition-colors"
                                >
                                    {selectedDraftIds.length === filteredDrafts.length ? 'Deselect All' : 'Select All'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {isFetchingDrafts || filteredDrafts === null ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-6 items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                                    <Skeleton className="w-16 h-16 rounded-2xl shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/4" /></div>
                                </div>
                            ))
                        ) : filteredDrafts.length > 0 ? (
                            filteredDrafts.map((draft) => {
                                const reviewers = draft.auditLog
                                    ?.filter((log: any) => log.action === 'reviewed')
                                    .map((log: any) => log.email) || [];
                                const isReviewed = reviewers.length > 0;

                                return (
                                    <Card 
                                        key={draft.id} 
                                        hoverable 
                                        className={`p-4 lg:p-6 cursor-pointer group border-slate-200 dark:border-slate-800 !overflow-visible transition-all ${
                                            isReviewed ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/40' : ''
                                        }`} 
                                        onClick={() => handleSelectReviewDraft(draft.id)}
                                    >
                                        <div className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-colors ${selectedReviewDraft?.id === draft.id ? 'bg-violet-100/10 dark:bg-violet-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                            <div className="flex items-center gap-6">
                                                {role !== 'viewer' && (
                                                    <div 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDraftIds(prev => prev.includes(draft.id) ? prev.filter(i => i !== draft.id) : [...prev, draft.id]);
                                                        }}
                                                        className={`w-6 h-6 rounded border ${selectedDraftIds.includes(draft.id) ? 'bg-violet-500 border-violet-500 text-white' : 'border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-900 hover:border-violet-400'} flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm`}
                                                        style={{ marginLeft: '32px' }}
                                                    >
                                                        {selectedDraftIds.includes(draft.id) && <CheckSquare className="w-4 h-4" />}
                                                    </div>
                                                )}
                                                <div className="w-16 h-16 rounded-[1.25rem] bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/50 flex items-center justify-center group-hover:bg-violet-600 group-hover:border-violet-600 transition-all duration-500 shadow-sm shrink-0"><FileText className="w-8 h-8 text-violet-400 group-hover:text-white transition-colors" /></div>
                                                <div className="space-y-2">
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors tracking-tight">{draft.title}</h3>
                                                    <div className="flex items-center gap-6">
                                                        <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest"><Calendar className="w-3.5 h-3.5" />{new Date(draft.createdAt || draft.created_at).toLocaleDateString()}</span>
                                                        {draft.authorEmail && <span className="text-[10px] font-medium text-violet-400 lowercase italic">by {draft.authorEmail}</span>}
                                                        <Badge variant="outline" className="px-3">Draft</Badge>
                                                        {draft.platform === 'framer' ? <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">Framer</span> : draft.platform === 'linkedin' ? <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800">LinkedIn</span> : <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800">WordPress</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3" style={{ marginRight: '32px' }}>
                                                {isReviewed ? (
                                                    <div className="relative group/tooltip" onClick={(e) => e.stopPropagation()}>
                                                        <Badge variant="success" className="inline-flex items-center gap-1 shadow-none border-emerald-100 dark:border-emerald-900/40 cursor-help">
                                                            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> Reviewed ({reviewers.length})
                                                        </Badge>
                                                        
                                                        {/* Styled Tooltip Box */}
                                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 hidden group-hover/tooltip:block w-[380px] bg-slate-950/98 dark:bg-slate-950/98 text-slate-100 rounded-3xl p-8 shadow-2xl border-2 border-slate-800/80 backdrop-blur-lg z-50 text-center select-none" onClick={(e) => e.stopPropagation()}>
                                                            {/* Tooltip Header */}
                                                            <p className="font-black uppercase tracking-[0.2em] text-[10px] text-violet-400 mb-4 border-b border-slate-800/80 pb-3">
                                                                Review History
                                                            </p>
                                                            
                                                            {/* Reviewers List */}
                                                            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                                                {draft.auditLog?.filter((log: any) => log.action === 'reviewed').map((log: any, idx: number) => (
                                                                    <div key={idx} className="flex flex-col gap-1.5 py-1 border-b border-slate-900/60 last:border-0 last:pb-0">
                                                                        <span className="font-extrabold text-slate-100 text-sm break-all px-4 block">
                                                                            {log.email}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider">
                                                                            {new Date(log.timestamp).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Badge variant="warning" className="inline-flex items-center gap-1 shadow-none border-amber-100 dark:border-amber-900/40">
                                                        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Pending Review
                                                    </Badge>
                                                )}
                                                {role !== 'viewer' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDraftToDelete(draft.id);
                                                        }}
                                                        className="ml-4 p-2.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-full transition-all group-hover:opacity-100 shrink-0 border border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="bg-white/40 dark:bg-violet-950/5 backdrop-blur-sm border-2 border-dashed border-violet-100 dark:border-violet-900/40 rounded-3xl p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-violet-50 dark:bg-violet-950/30 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-violet-100 dark:ring-violet-900/50 shadow-inner"><Zap className="w-10 h-10 text-violet-500 animate-pulse" /></div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editorial Buffer Empty</h3><p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is ready for new high-intent content generations.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FLOATING ACTION BAR FOR BULK DELETE */}
            {selectedDraftIds.length > 0 && !selectedReviewDraft && role !== 'viewer' && (
                <div 
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-violet-900 dark:bg-violet-950 text-white rounded-2xl shadow-2xl shadow-violet-500/20 flex items-center justify-center z-50 animate-fadeIn border-2 border-violet-500/50 w-auto min-w-max"
                    style={{ padding: '24px 48px', gap: '48px' }}
                >
                    <span className="text-2xl font-bold whitespace-nowrap tracking-tight">{selectedDraftIds.length} Draft{selectedDraftIds.length > 1 ? 's' : ''} Selected</span>
                    <button 
                        onClick={() => setIsBulkDeleting(true)}
                        className="bg-violet-500 hover:bg-violet-400 text-white rounded-xl uppercase tracking-widest text-sm font-black whitespace-nowrap transition-colors border-none outline-none flex items-center justify-center shadow-lg"
                        style={{ padding: '16px 32px' }}
                    >
                        Delete Selected
                    </button>
                </div>
            )}

            {/* CONFIRMATION MODAL FOR DELETION */}
            {(draftToDelete || isBulkDeleting) && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleIn" style={{ padding: '40px' }}>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Delete Draft{isBulkDeleting ? 's' : ''}?</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
                                Are you sure you want to delete {isBulkDeleting ? `these ${selectedDraftIds.length} drafts` : 'this draft'}? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-4">
                                <Button variant="secondary" onClick={() => { setDraftToDelete(null); setIsBulkDeleting(false); }} className="rounded-none font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
                                <Button variant="danger" onClick={async () => {
                                    if (draftToDelete) {
                                        await handleRejectDraft(draftToDelete);
                                    } else if (isBulkDeleting) {
                                        for (const id of selectedDraftIds) {
                                            await handleRejectDraft(id);
                                        }
                                        setSelectedDraftIds([]);
                                    }
                                    setDraftToDelete(null);
                                    setIsBulkDeleting(false);
                                }} className="rounded-none font-bold uppercase tracking-widest text-[10px]" isLoading={isRejecting}>Yes, Delete</Button>
                            </div>
                        </div>
                    </div>
                </Portal>
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
                                    {/* Categories Verification Header (only for non-LinkedIn) */}
                                    {targetPlatform !== 'linkedin' && selectedReviewDraft.platform !== 'linkedin' && selectedCategories.length > 0 && (
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

                                    {/* LinkedIn Layout: Image Overlay First, Title second */}
                                    {targetPlatform === 'linkedin' || selectedReviewDraft.platform === 'linkedin' ? (
                                        <>
                                            {/* 1. Featured Image Overlay (First for LinkedIn) */}
                                            {selectedReviewDraft.imageUrl && (
                                                <div className="relative group overflow-hidden rounded-none shadow-2xl border border-slate-100 dark:border-slate-800 w-full">
                                                    <img src={selectedReviewDraft.imageUrl} alt={selectedReviewDraft.title} className="w-full h-auto object-cover" style={{ aspectRatio: '1706/960' }} />
                                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(58, 26, 102, 0.75)' }} />
                                                    
                                                    {/* Layer 1: Blog Tag */}
                                                    <div className="absolute top-0 pointer-events-none" style={{ left: '80px' }}>
                                                        <img src="/linkedlin tag.png" className="h-16 lg:h-24 w-auto object-contain" alt="LinkedIn Tag" />
                                                    </div>

                                                    {/* Layer 2: Title Overlay (Left aligned + Teal Line) */}
                                                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-start" style={{ paddingLeft: '80px', paddingRight: '80px' }}>
                                                        <div className="flex flex-row items-stretch gap-6 border-l-8 border-[#2DD4BF]" style={{ paddingLeft: '32px' }}>
                                                            <div className="text-white w-full font-sans drop-shadow-2xl flex flex-col items-start text-left w-[75%]" style={{ lineHeight: '1.2' }}>
                                                                {selectedReviewDraft.title.includes(':') ? (
                                                                    <>
                                                                        <h1 className="text-[32px] md:text-[42px] lg:text-[64px] font-bold m-0 p-0 leading-[1.2]">
                                                                            {selectedReviewDraft.title.split(':')[0]}:
                                                                        </h1>
                                                                        <p className="text-[24px] md:text-[32px] lg:text-[48px] font-normal opacity-95 mt-4 m-0 p-0 leading-[1.3]">
                                                                            {selectedReviewDraft.title.split(':').slice(1).join(':').trim()}
                                                                        </p>
                                                                    </>
                                                                ) : (
                                                                    <h1 className="text-[32px] md:text-[42px] lg:text-[64px] font-bold m-0 p-0 leading-[1.2]">
                                                                        {selectedReviewDraft.title}
                                                                    </h1>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Layer 3: Logo */}
                                                    <div className="absolute pointer-events-none flex z-50" style={{ bottom: '80px', right: '80px' }}>
                                                        <img src="/10xDS.png" className="h-8 lg:h-12 w-auto object-contain" alt="10xDS" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2. Blog Title (Second for LinkedIn) */}
                                            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight font-serif text-center whitespace-normal">
                                                {selectedReviewDraft.title}
                                            </h1>
                                        </>
                                    ) : (
                                        <>
                                            {/* WordPress / Framer Layout: Title First, Image Overlay second */}
                                            <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight font-serif text-center whitespace-normal">
                                                {selectedReviewDraft.title}
                                            </h1>

                                            {selectedReviewDraft.imageUrl && (
                                                <div className="relative group overflow-hidden rounded-none shadow-2xl border border-slate-100 dark:border-slate-800 w-full">
                                                    <img src={selectedReviewDraft.imageUrl} alt={selectedReviewDraft.title} className="w-full h-auto object-cover" style={{ aspectRatio: '4/3' }} />
                                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(58, 26, 102, 0.75)' }} />
                                                    
                                                    {/* Layer 1: Blog Tag */}
                                                    {targetPlatform !== 'framer' && (
                                                        <div className="absolute top-[60px] lg:top-[80px] left-[40px] lg:left-[60px] pointer-events-none">
                                                            <img src="/Blog.png" className="h-10 w-auto" alt="blog" />
                                                        </div>
                                                    )}

                                                    {/* Layer 2: Perfect Center Title Group Overlay */}
                                                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center px-[40px] lg:px-[100px]">
                                                        <div className="text-white flex flex-col items-center text-center gap-0 drop-shadow-2xl w-full" style={{ lineHeight: '1.2' }}>
                                                            {selectedReviewDraft.title.includes(':') ? (
                                                                <>
                                                                    <h1 className="text-[48px] lg:text-[64px] font-bold tracking-tight m-0 p-0 leading-[1.1]">
                                                                        {selectedReviewDraft.title.split(':')[0]}:
                                                                    </h1>
                                                                    <p className="text-[34px] lg:text-[48px] font-normal opacity-95 m-0 p-0 leading-[1.2] mt-4">
                                                                        {selectedReviewDraft.title.split(':').slice(1).join(':').trim()}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <h1 className="text-[48px] lg:text-[64px] font-bold tracking-tight m-0 p-0 text-center leading-[1.1]">
                                                                    {selectedReviewDraft.title}
                                                                </h1>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Layer 3: Logo */}
                                                    <div className="absolute bottom-[60px] lg:bottom-[80px] right-[40px] lg:right-[60px] pointer-events-none flex z-50">
                                                        <img src="/10xDS.png" className="h-10 lg:h-12 w-auto object-contain" alt="10xDS" />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <article 
                                        onDoubleClick={(e) => {
                                            const target = e.target as HTMLElement;
                                            if (target.classList.contains('stat-highlight')) {
                                                const sourceUrl = target.getAttribute('data-source');
                                                if (sourceUrl) {
                                                    window.open(sourceUrl, '_blank');
                                                }
                                            }
                                        }}
                                        dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }} 
                                        className="text-black dark:text-white text-lg leading-relaxed prose prose-stone dark:prose-invert max-w-none prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold" 
                                    />
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
                                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)} className="px-8 h-14 rounded-none border border-slate-200 dark:border-slate-800">
                                    {role === 'viewer' ? 'Close Preview' : 'Continue Editing'}
                                </Button>
                                {role !== 'viewer' && (
                                    <Button variant="primary" onClick={() => { handleApproveDraft(selectedReviewDraft); setIsPreviewOpen(false); }} isLoading={isPublished} className="px-8 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-none shadow-lg shadow-emerald-600/10">
                                        <CheckCircle className="w-4 h-4 mr-2" />Approve & Publish Now
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};
