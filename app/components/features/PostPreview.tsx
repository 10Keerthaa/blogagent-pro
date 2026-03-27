'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import {
    Bold, Italic, Link as LinkIcon,
    Heading2, Heading3, List, ListOrdered, Wand2
} from 'lucide-react';

export const PostPreview = () => {
    const {
        preview, setPreview, isSavingDraft, handleSaveDraft,
        feedback, setFeedback, handleApplyFeedback, isApplyingFeedback
    } = useDashboard();

    const [bubbleMenu, setBubbleMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Floating Toolbar: container-relative positioning ──────────────────────
    useEffect(() => {
        const handleMouseUp = () => {
            const selection = window.getSelection();
            if (
                !selection ||
                selection.rangeCount === 0 ||
                selection.isCollapsed ||
                !editorRef.current ||
                !containerRef.current
            ) {
                setBubbleMenu(prev => ({ ...prev, show: false }));
                return;
            }

            const range = selection.getRangeAt(0);
            if (!editorRef.current.contains(range.commonAncestorContainer)) {
                setBubbleMenu(prev => ({ ...prev, show: false }));
                return;
            }

            const selectionRect = range.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();

            setBubbleMenu({
                x: selectionRect.left - containerRect.left + selectionRect.width / 2,
                y: selectionRect.top - containerRect.top - 10,
                show: true,
            });
        };

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setBubbleMenu(prev => ({ ...prev, show: false }));
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    if (!preview) return null;

    // ── Rich Text Commands ────────────────────────────────────────────────────
    const execCmd = (command: string, value = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setPreview({ ...preview, content: editorRef.current.innerHTML });
        }
    };

    const addLink = () => {
        const url = prompt('Enter URL:');
        if (url) execCmd('createLink', url);
    };

    // ── Link click handler: open in new tab ──────────────────────────────────
    const handleEditorMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a') as HTMLAnchorElement | null;
        if (anchor?.href) {
            e.preventDefault();
            window.open(anchor.href, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-slate-950 flex flex-col pt-12">

            {/* ── Content Container with relative positioning for toolbar ── */}
            <div ref={containerRef} className="max-w-4xl mx-auto w-full px-8 pb-16 relative">

                {/* ── Floating Bubble Toolbar ─────────────────────────────── */}
                {bubbleMenu.show && (
                    <div
                        className="absolute z-[200] flex items-center bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-2xl border border-white/10 p-1.5"
                        style={{
                            left: bubbleMenu.x,
                            top: bubbleMenu.y,
                            transform: 'translate(-50%, -100%)',
                            pointerEvents: 'all',
                        }}
                        // Keep toolbar visible when user clicks a button
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <div className="flex items-center gap-0.5 px-1">
                            <button onClick={() => execCmd('bold')} title="Bold" className="p-2 hover:bg-white/10 rounded-full transition-colors"><Bold className="w-4 h-4" /></button>
                            <button onClick={() => execCmd('italic')} title="Italic" className="p-2 hover:bg-white/10 rounded-full transition-colors"><Italic className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <button onClick={() => execCmd('formatBlock', 'h2')} title="Heading 2" className="p-2 hover:bg-white/10 rounded-full transition-colors"><Heading2 className="w-4 h-4" /></button>
                            <button onClick={() => execCmd('formatBlock', 'h3')} title="Heading 3" className="p-2 hover:bg-white/10 rounded-full transition-colors"><Heading3 className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <button onClick={() => execCmd('insertUnorderedList')} title="Bullet List" className="p-2 hover:bg-white/10 rounded-full transition-colors"><List className="w-4 h-4" /></button>
                            <button onClick={() => execCmd('insertOrderedList')} title="Numbered List" className="p-2 hover:bg-white/10 rounded-full transition-colors"><ListOrdered className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <button onClick={addLink} title="Insert Link" className="p-2 hover:bg-white/10 rounded-full transition-colors"><LinkIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}

                {/* ── Post Title ───────────────────────────────────────────── */}
                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-12 font-serif text-center">
                    {preview.title}
                </h1>

                {/* ── Featured Image with Brand Overlays ──────────────────── */}
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

                {/* ── Editable Content Body ────────────────────────────────── */}
                {/* Same pattern as ReviewList: contentEditable div + onBlur save */}
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setPreview({ ...preview, content: e.currentTarget.innerHTML })}
                    onMouseDown={handleEditorMouseDown}
                    dangerouslySetInnerHTML={{ __html: preview.content }}
                    className="text-black dark:text-white text-base leading-relaxed prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px]
                        prose-headings:text-black dark:prose-headings:text-white prose-headings:font-bold prose-lg
                        prose-a:text-indigo-600 prose-a:underline prose-a:cursor-pointer"
                />

                {/* ── Infographic ──────────────────────────────────────────── */}
                {preview.infographicUrl && (
                    <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 text-center mb-10">Visual Synthesis</p>
                        <div className="bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden shadow-2xl">
                            <img src={preview.infographicUrl} alt="Infographic" className="w-full h-auto" />
                        </div>
                    </div>
                )}

                {/* ── AI Refinement Section ────────────────────────────────── */}
                <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                            <Wand2 className="w-3.5 h-3.5" />
                            AI Content Refinement
                        </h4>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Type instructions to refine this post (e.g., 'Add a new heading about market trends')..."
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
                        <div className="flex gap-4">
                            <Button
                                variant="secondary"
                                onClick={handleSaveDraft}
                                isLoading={isSavingDraft}
                                className="flex-1 h-14 rounded-none border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-widest"
                            >
                                Save Edits
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveDraft}
                                isLoading={isSavingDraft}
                                className="flex-1 h-14 rounded-none bg-emerald-600 hover:bg-emerald-700 font-bold text-[11px] uppercase tracking-widest"
                            >
                                Send to Review Queue
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-16" />
        </div>
    );
};
