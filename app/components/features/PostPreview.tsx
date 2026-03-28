import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import {
    Bold, Italic, Link as LinkIcon, Save, ArrowRight,
    Heading2, Heading3, List, ListOrdered, Wand2, Sparkles, Image as ImageIcon,
    RotateCcw
} from 'lucide-react';
import { FloatingToolbar } from './FloatingToolbar';

export const PostPreview = () => {
    const {
        preview, setPreview, isSavingDraft, handleSaveDraft, setActiveTab,
        feedback, setFeedback, handleApplyFeedback, isApplyingFeedback,
        isGeneratingInfographic, handleGenerateInfographic, infographicUrl,
        user, upsertPost, isSavingManual, isSavingReview, setSelectedReviewDraft,
        description, primaryKeyword, prompt: mainTopic, keywords,
        handleRefineSelection
    } = useDashboard();

    const [currentPostId, setCurrentPostId] = useState<string | null>(null);

    // Floating Toolbar State
    const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
    const [isToolbarVisible, setIsToolbarVisible] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    // Handle text selection for floating menu
    const updateSelectionRect = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editorRef.current) {
            setIsToolbarVisible(false);
            setSelectionRect(null);
            return;
        }

        const range = selection.getRangeAt(0);

        // Ensure selection is strictly within the editor
        if (!editorRef.current.contains(range.commonAncestorContainer)) {
            setIsToolbarVisible(false);
            setSelectionRect(null);
            return;
        }

        const rects = range.getClientRects();
        if (rects.length === 0) {
            setIsToolbarVisible(false);
            setSelectionRect(null);
            return;
        }

        setSelectionRect(rects[0]);
        setIsToolbarVisible(true);
    }, [editorRef]);

    useEffect(() => {
        const handleEvents = () => {
            requestAnimationFrame(updateSelectionRect);
        };

        document.addEventListener('selectionchange', handleEvents);
        window.addEventListener('resize', handleEvents);
        window.addEventListener('scroll', handleEvents, true);

        return () => {
            document.removeEventListener('selectionchange', handleEvents);
            window.removeEventListener('resize', handleEvents);
            window.removeEventListener('scroll', handleEvents, true);
        };
    }, [updateSelectionRect]);

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
            created_by: user.id,
            prompt: mainTopic || updatedPreview.prompt || '',
            keywords: keywords.length > 0 ? keywords : (updatedPreview.keywords || [])
        });
        if (result?.id) setCurrentPostId(result.id);
    }, [user, currentPostId, infographicUrl, upsertPost, isSavingManual, isSavingReview, description, primaryKeyword, mainTopic, keywords]);

    if (!preview) return null;

    const execCommand = (command: string, value: any = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            setPreview({ ...preview, content: newContent });
            handleAutoSave({ ...preview, content: newContent });
        }
    };

    const handleToolbarAction = async (action: string, value?: string) => {
        if (!editorRef.current) return;

        switch (action) {
            case 'bold':
                execCommand('bold');
                break;
            case 'italic':
                execCommand('italic');
                break;
            case 'link':
                execCommand('createLink', value);
                break;
            case 'rephrase':
            case 'shorten':
            case 'expand':
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed) return;
                const range = selection.getRangeAt(0);
                const selectedText = selection.toString();

                // Show loading placeholder or similar? 
                // For now, let's just stream into the selection
                const placeholder = document.createElement('span');
                placeholder.className = "bg-indigo-100 animate-pulse rounded px-1";
                placeholder.innerText = "...";
                range.deleteContents();
                range.insertNode(placeholder);

                let fullText = "";
                await handleRefineSelection(selectedText, action, (newText: string) => {
                    fullText = newText;
                    placeholder.innerText = fullText;
                });

                // Replace placeholder with final text
                const finalNode = document.createTextNode(fullText || selectedText);
                placeholder.parentNode?.replaceChild(finalNode, placeholder);

                // Sync state
                if (editorRef.current) {
                    const finalHtml = editorRef.current.innerHTML;
                    setPreview({ ...preview, content: finalHtml });
                    handleAutoSave({ ...preview, content: finalHtml });
                }
                break;
        }
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-slate-950 flex flex-col pt-12">
            {/* MAIN EDITOR AREA - "BLANK PAGE" STYLE */}
            <div className="max-w-4xl mx-auto w-full px-8 pb-40 relative">
                <FloatingToolbar
                    isVisible={isToolbarVisible}
                    rect={selectionRect}
                    onAction={handleToolbarAction}
                    onClose={() => setIsToolbarVisible(false)}
                />

                {/* EDITABLE TITLE */}
                <h1
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                        const newTitle = e.currentTarget.innerText;
                        setPreview({ ...preview, title: newTitle });
                        handleAutoSave({ ...preview, title: newTitle });
                    }}
                    className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-12 font-serif text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/10 rounded-lg p-2 transition-all"
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
                    <div className="absolute inset-0 bg-indigo-900/40 pointer-events-none" />

                    <div className="absolute inset-0 pointer-events-none">
                        <img src="/Blog.png" alt="Blog" className="absolute top-[40px] left-[40px] h-10 w-auto" />
                        <div className="absolute top-[100px] left-[40px] text-white max-w-[85%] font-sans drop-shadow-2xl" style={{ lineHeight: '1.3' }}>
                            {preview.title.includes(':') ? (
                                <>
                                    <h1 className="text-[56px] font-bold m-0 p-0 leading-[1.3]">{preview.title.split(':')[0]}:</h1>
                                    <p className="text-[44px] font-normal opacity-95 m-0 p-0 leading-[1.3]">{preview.title.split(':').slice(1).join(':').trim()}</p>
                                </>
                            ) : (
                                <h1 className="text-[56px] font-bold m-0 p-0 leading-[1.3]">{preview.title}</h1>
                            )}
                        </div>
                        <img src="/10xDS.png" alt="10xDS" className="absolute bottom-[40px] right-[40px] h-14 w-auto" />
                    </div>
                </div>

                {/* Content Area */}
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                        const newContent = e.currentTarget.innerHTML;
                        setPreview({ ...preview, content: newContent });
                        handleAutoSave({ ...preview, content: newContent });
                    }}
                    dangerouslySetInnerHTML={{ __html: preview.content }}
                    className="editor-content prose prose-lg prose-stone dark:prose-invert max-w-none focus:outline-none text-slate-800 dark:text-slate-200 leading-relaxed font-serif"
                    style={{ minHeight: '50vh' }}
                    onMouseDown={(e) => {
                        const target = (e.target as HTMLElement).closest('a');
                        if (target && target.tagName === 'A') {
                            const href = (target as HTMLAnchorElement).href;
                            if (e.ctrlKey || e.metaKey || e.detail > 1) {
                                e.preventDefault();
                                window.open(href, '_blank');
                            }
                        }
                    }}
                />

                {/* BUTTON SEQUENCE: INFOGRAPHIC -> AI -> SAVE/REVIEW */}
                <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800 space-y-12">

                    {/* 1. Generate Infographic Button */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Visual Content Generation
                            </h4>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleGenerateInfographic}
                            isLoading={isGeneratingInfographic}
                            className="w-full h-14 rounded-none bg-indigo-500 hover:bg-indigo-600 uppercase tracking-widest text-[11px] font-bold"
                        >
                            Generate Visual Infographic
                        </Button>
                        {infographicUrl && (
                            <div className="mt-6 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden shadow-2xl">
                                <img src={infographicUrl} alt="Infographic" className="w-full h-auto" />
                            </div>
                        )}
                    </div>

                    {/* 2. AI Refinement Section */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <Wand2 className="w-3.5 h-3.5" />
                                AI Content Stream Active
                            </h4>
                        </div>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Type instructions to refine this post..."
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-none p-6 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[120px]"
                        />
                        <Button
                            variant="primary"
                            onClick={handleApplyFeedback}
                            isLoading={isApplyingFeedback}
                            disabled={!feedback}
                            className="w-full h-14 rounded-none bg-indigo-600 hover:bg-indigo-700 uppercase tracking-widest text-[11px] font-bold shadow-lg"
                        >
                            Apply AI Refinement
                        </Button>
                    </div>

                    {/* 3. Sticky Action Bar */}
                    <div className="sticky bottom-0 left-0 right-0 py-6 px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-50 mt-20 -mx-8">
                        <div className="max-w-4xl mx-auto flex gap-4">
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
                                        created_by: user.id,
                                        prompt: mainTopic || preview.prompt || '',
                                        keywords: keywords.length > 0 ? keywords : (preview.keywords || []),
                                        primaryKeyword: primaryKeyword
                                    });
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

            <div className="h-20" />
        </div>
    );
};
