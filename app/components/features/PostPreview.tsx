import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import {
    Bold, Italic, Link as LinkIcon, Save, ArrowRight,
    Heading2, Heading3, List, ListOrdered, Wand2, Sparkles, Image as ImageIcon,
    RotateCcw, AlertCircle, X
} from 'lucide-react';
import { FloatingToolbar } from './FloatingToolbar';

export const PostPreview = () => {
    const {
        preview, setPreview, isSavingDraft, handleSaveDraft, setActiveTab,
        feedback, setFeedback, handleApplyFeedback, isApplyingFeedback,
        isGeneratingInfographic, handleGenerateInfographic, infographicUrl,
        user, upsertPost, isSavingManual, isSavingReview, setSelectedReviewDraft,
        description, primaryKeyword, prompt: mainTopic, keywords,
        handleRefineSelection, infographicFeedback, setInfographicFeedback, isInfographicRefining,
        isGenerating, deleteInProgressDraft, checkForResumeDraft, targetPlatform
    } = useDashboard();

    const [currentPostId, setCurrentPostId] = useState<string | null>(null);
    const [isRefining, setIsRefining] = useState(false); // Local toggle for the refinement box

    // Floating Toolbar State
    const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
    const [isToolbarVisible, setIsToolbarVisible] = useState(false);
    const [isLinkActive, setIsLinkActive] = useState(false);
    const [isEditorFocused, setIsEditorFocused] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    // Sync preview.content into the editor DOM only when not focused
    // This prevents React from clobbering an active selection or partial edit
    useEffect(() => {
        if (!isEditorFocused && editorRef.current && preview?.content !== undefined) {
            editorRef.current.innerHTML = preview.content;
        }
    }, [preview?.content, isEditorFocused]);

    // Handle text selection for floating menu
    // Entire body is deferred via setTimeout(0) so the browser fully paints
    // the selection highlight before we read its bounding rect.
    const updateSelectionRect = useCallback(() => {
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
    }, [editorRef]);



    const handleAutoSave = useCallback(async (updatedPreview: any) => {
        if (!user || !updatedPreview || isSavingManual || isSavingReview) return;
        const result = await upsertPost({
            id: currentPostId || undefined,
            title: updatedPreview.title,
            content: updatedPreview.content,
            image_url: updatedPreview.imageUrl,
            infographic_url: updatedPreview.infographicUrl || infographicUrl,
            metaDesc: description || updatedPreview.meta || "",
            primaryKeyword: primaryKeyword,
            status: 'in_progress',
            created_by: user.uid,
            authorEmail: user.email,
            platform: targetPlatform,
            prompt: mainTopic || updatedPreview.prompt || '',
            keywords: keywords.length > 0 ? keywords : (updatedPreview.keywords || [])
        });
        if (result?.id) setCurrentPostId(result.id);
    }, [user, currentPostId, infographicUrl, upsertPost, isSavingManual, isSavingReview, description, primaryKeyword, mainTopic, keywords]);

    if (!preview) return null;

    const execCommand = (command: string, value: any = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current && preview) {
            const newContent = editorRef.current.innerHTML;
            const updatedPreview = { ...preview, content: newContent };
            setPreview(updatedPreview);
            handleAutoSave(updatedPreview);
        }
    };

    const handleToolbarAction = async (action: string, value?: string) => {
        if (!editorRef.current) return;

        switch (action) {
            // --- Formatting: use execCommand (no async needed) ---
            case 'bold':
                execCommand('bold');
                return;
            case 'italic':
                execCommand('italic');
                return;

            case 'unlink':
                if (editorRef.current && preview) {
                    // Restore focus just in case, though preventDefault should handle it
                    editorRef.current.focus();
                    document.execCommand('unlink', false, undefined);

                    // Capture and Sync
                    const latestHtml = editorRef.current.innerHTML;
                    const updatedObj = { ...preview, content: latestHtml };
                    setPreview(updatedObj);
                    handleAutoSave(updatedObj);

                    // Reset UI state to close toolbar smoothly
                    setIsToolbarVisible(false);
                    setSelectionRect(null);
                }
                break;

            // --- 3a. Hyperlink: modern Range API with pastel class ---
            case 'link': {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !value) return;
                const range = sel.getRangeAt(0);
                const anchor = document.createElement('a');
                anchor.href = value;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.className = 'text-violet-500 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-600 transition-all font-medium';
                // Wrap the selected fragment in the <a> tag
                anchor.appendChild(range.extractContents());
                range.insertNode(anchor);
                // Collapse selection after the link
                sel.collapseToEnd();
                // --- 4. State Sync ---
                if (editorRef.current && preview) {
                    const linkedContent = editorRef.current.innerHTML;
                    const updatedPreview = { ...preview, content: linkedContent };
                    setPreview(updatedPreview);
                    handleAutoSave(updatedPreview);
                }
                return;
            }

            // --- 3b. AI Actions: placeholder streaming, then range replacement ---
            case 'humanize':
            case 'rephrase':
            case 'shorten':
            case 'expand': {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed) return;

                // Save the range BEFORE any async work
                const range = sel.getRangeAt(0).cloneRange();
                const selectedText = sel.toString();

                // Insert a pulsing placeholder while AI is working
                const placeholder = document.createElement('span');
                placeholder.className = 'bg-violet-100 dark:bg-violet-900/30 animate-pulse rounded px-1 text-violet-500';
                placeholder.innerText = '✦';
                const liveRange = sel.getRangeAt(0);
                liveRange.deleteContents();
                liveRange.insertNode(placeholder);

                // Stream the refined text directly into the placeholder
                let fullText = '';
                await handleRefineSelection(selectedText, action, (newText: string) => {
                    fullText = newText;
                    placeholder.innerText = fullText;
                });

                // Replace the placeholder with a plain text node
                const finalNode = document.createTextNode(fullText || selectedText);
                placeholder.parentNode?.replaceChild(finalNode, placeholder);

                // --- 4. Immediate State Sync ---
                if (editorRef.current && preview) {
                    const finalHtml = editorRef.current.innerHTML;
                    const updatedPreview = { ...preview, content: finalHtml };
                    setPreview(updatedPreview);
                    handleAutoSave(updatedPreview);
                }
                return;
            }
        }
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-slate-950 flex flex-col pt-12">
            {/* MAIN EDITOR AREA - CENTERED COLUMN */}
            <div className="w-full max-w-[1000px] mx-auto px-6 pb-12 relative">
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

                {/* EDITABLE TITLE */}
                <div className="flex justify-center mb-4">
                    {preview.isHumanized && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 dark:bg-violet-900/20 dark:border-violet-800 animate-in fade-in slide-in-from-top-1 duration-700">
                            <Sparkles className="w-3 h-3 text-violet-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
                                AI Refined & Humanized
                            </span>
                        </div>
                    )}
                </div>
                <h1
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                        const newTitle = e.currentTarget.innerText;
                        setPreview({ ...preview, title: newTitle });
                        handleAutoSave({ ...preview, title: newTitle });
                    }}
                    className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-12 font-serif text-center focus:outline-none focus:ring-2 focus:ring-violet-500/10 rounded-lg lg:pl-16 lg:pr-10 pl-6 pr-6 transition-all"
                >
                    {preview.title}
                </h1>

                {/* 10xDS Brand Overlay */}
                <div className="relative mb-20 group overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800">
                    <img
                        src={preview.imageUrl}
                        alt={preview.title}
                        className="w-full h-auto block object-cover"
                        style={{ aspectRatio: '4/3' }}
                    />
                    <div className="absolute inset-0 bg-violet-950/60 pointer-events-none" />

                    <div className="absolute inset-0 pointer-events-none">
                        {/* Only show branding for WordPress */}
                        {targetPlatform !== 'framer' && (
                            <>
                                <img src="/Blog.png" alt="Blog" className="absolute top-[30px] lg:top-[40px] left-[30px] lg:left-[40px] h-8 lg:h-10 w-auto" />
                                <img src="/10xDS.png" alt="10xDS" className="absolute bottom-[30px] lg:bottom-[40px] right-[30px] lg:right-[40px] h-10 lg:h-14 w-auto" />
                            </>
                        )}
                        
                        <div className="absolute top-[80px] lg:top-[100px] left-[30px] lg:left-[40px] text-white max-w-[85%] font-sans drop-shadow-2xl" style={{ lineHeight: '1.3' }}>
                            {preview.title.includes(':') ? (
                                <>
                                    <h1 className="text-[32px] md:text-[42px] lg:text-[56px] font-bold m-0 p-0 leading-[1.3]">{preview.title.split(':')[0]}:</h1>
                                    <p className="text-[24px] md:text-[32px] lg:text-[44px] font-normal opacity-95 m-0 p-0 leading-[1.3]">{preview.title.split(':').slice(1).join(':').trim()}</p>
                                </>
                            ) : (
                                <h1 className="text-[32px] md:text-[42px] lg:text-[56px] font-bold m-0 p-0 leading-[1.3]">{preview.title}</h1>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setIsEditorFocused(true)}
                    onBlur={(e) => {
                        setIsEditorFocused(false);
                        const newContent = e.currentTarget.innerHTML;
                        setPreview({ ...preview, content: newContent });
                        handleAutoSave({ ...preview, content: newContent });
                    }}
                    className="editor-content prose prose-lg prose-stone dark:prose-invert max-w-none focus:outline-none text-slate-800 dark:text-slate-200 leading-relaxed font-serif lg:pl-16 lg:pr-10 pl-6 pr-6"
                    style={{ minHeight: '50vh' }}
                    onMouseUp={updateSelectionRect}
                    onSelect={updateSelectionRect}
                    onKeyUp={(e) => {
                        // Ignore standalone modifier keys — the user is still mid-command
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

                {/* ACTION BAR: INFOGRAPHIC -> AI -> SAVE/REVIEW */}
                <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800 space-y-12">

                    {/* 1. Generate Infographic Button */}
                    <div className="flex flex-col gap-6">
                        <Button
                            variant="primary"
                            onClick={() => handleGenerateInfographic()}
                            isLoading={isGeneratingInfographic}
                            className="w-full h-14 rounded-none bg-violet-500 hover:bg-violet-600 uppercase tracking-widest text-[11px] font-bold"
                        >
                            Generate Visual Infographic
                        </Button>
                        {infographicUrl && (
                            <div className="mt-6 flex flex-col gap-4">
                                <div className="bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden shadow-2xl relative group">
                                    <img src={infographicUrl} alt="Infographic" className="w-full h-auto" />
                                    {targetPlatform !== 'framer' && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <img src="/10xDS.png" alt="10xDS" className="absolute bottom-[20px] lg:bottom-[30px] right-[20px] lg:right-[30px] h-8 lg:h-12 w-auto drop-shadow-xl" />
                                        </div>
                                    )}
                                </div>

                                {/* REFINEMENT TOGGLE */}
                                <div className="flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsRefining(!isRefining)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-violet-500 hover:text-violet-600 transition-all flex items-center gap-2"
                                    >
                                        {isRefining ? <X className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-violet-400" />}
                                        {isRefining ? 'Cancel Refinement' : 'Refine Visual'}
                                    </Button>
                                </div>

                                {/* REFINEMENT INPUT (Hidden until needed) */}
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isRefining ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-inner">
                                        <textarea
                                            value={infographicFeedback}
                                            onChange={(e) => setInfographicFeedback(e.target.value)}
                                            placeholder="Describe visual changes (e.g., 'Use more blue tones' or 'Add a cloud icon')..."
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none p-4 text-sm focus:ring-1 focus:ring-violet-500 outline-none min-h-[100px] resize-none"
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
                            </div>
                        )}
                    </div>

                    {/* 2. AI Refinement Section */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5" />
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
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Type instructions to refine this post..."
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-none p-6 text-base focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none min-h-[120px]"
                            />
                            <Button
                                variant="primary"
                                onClick={handleApplyFeedback}
                                isLoading={isGenerating}
                                disabled={isGenerating || !feedback}
                                className="w-full h-14 rounded-none bg-violet-600 hover:bg-violet-700 uppercase tracking-widest text-[11px] font-bold shadow-lg"
                            >
                                {isGenerating ? 'Processing...' : 'Apply AI Refinement'}
                            </Button>
                        </div>
                    </div>

                    {/* MAIN ACTION BAR - Fixed positioning or stable end-of-flow */}
                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-0 sticky bottom-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-20 -mx-6 px-6">
                        <Button
                            variant="secondary"
                            onClick={() => handleAutoSave(preview)}
                            isLoading={isSavingManual}
                            className="flex-1 h-14 rounded-none border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-widest gap-2 bg-white dark:bg-slate-900"
                        >
                            <Save className={`w-4 h-4 ${isSavingManual ? 'animate-spin' : ''}`} />
                            Save Edits
                        </Button>
                        <Button
                            variant="primary"
                            onClick={async () => {
                                if (!user) return;
                                const result = await upsertPost({
                                    id: currentPostId || undefined,
                                    title: preview.title,
                                    content: preview.content,
                                    image_url: preview.imageUrl,
                                    infographic_url: infographicUrl,
                                    metaDesc: description || preview.meta || "",
                                    status: 'review',
                                    platform: targetPlatform,
                                    created_by: user.uid,
                                    authorEmail: user.email,
                                    prompt: mainTopic || preview.prompt || '',
                                    keywords: keywords.length > 0 ? keywords : (preview.keywords || []),
                                    primaryKeyword: primaryKeyword
                                });

                                // Clean up the in-progress draft after successful save to review
                                if (user?.uid) {
                                    await deleteInProgressDraft(user.uid);
                                    await checkForResumeDraft();
                                }

                                if (result?.id) {
                                    setCurrentPostId(result.id);
                                    setSelectedReviewDraft(result);
                                }
                                setActiveTab('review');
                            }}
                            isLoading={isSavingReview}
                            className="flex-1 h-14 rounded-none bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/10 font-bold text-[11px] uppercase tracking-widest gap-2"
                        >
                            <ArrowRight className={`w-4 h-4 ${isSavingReview ? 'animate-spin' : ''}`} />
                            Send to Review Queue
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};
