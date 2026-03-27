import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import {
    Bold, Italic, Link as LinkIcon, Save, ArrowRight,
    Heading2, Heading3, List, ListOrdered, Wand2, Sparkles
} from 'lucide-react';

export const PostPreview = () => {
    const {
        preview, setPreview, isSavingDraft, handleSaveDraft, setActiveTab,
        feedback, setFeedback, handleApplyFeedback, isApplyingFeedback
    } = useDashboard();

    // Bubble Menu State
    const [bubbleMenu, setBubbleMenu] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });
    const editorRef = useRef<HTMLDivElement>(null);

    // Handle text selection for floating menu
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !editorRef.current) {
                setBubbleMenu(prev => ({ ...prev, show: false }));
                return;
            }

            const range = selection.getRangeAt(0);

            // Check if selection is within the editor content
            if (!editorRef.current.contains(range.commonAncestorContainer)) {
                setBubbleMenu(prev => ({ ...prev, show: false }));
                return;
            }

            const rects = range.getClientRects();
            if (rects.length === 0) return;

            const rect = rects[0];
            const containerRect = editorRef.current.getBoundingClientRect();

            setBubbleMenu({
                x: rect.left - containerRect.left + (rect.width / 2),
                y: rect.top - containerRect.top - 10,
                show: true
            });
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mouseup', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mouseup', handleSelectionChange);
        };
    }, []);

    if (!preview) return null;

    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setPreview({ ...preview, content: editorRef.current.innerHTML });
        }
    };

    const addLink = () => {
        const url = prompt('Enter URL:');
        if (url) execCommand('createLink', url);
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-slate-950 flex flex-col pt-12">
            {/* MAIN EDITOR AREA - "BLANK PAGE" STYLE */}
            <div className="max-w-4xl mx-auto w-full px-8 pb-40 relative">
                {/* FLOATING BUBBLE MENU - Now ABSOLUTE inside the relative container */}
                {bubbleMenu.show && (
                    <div
                        className="absolute z-[100] flex items-center bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-2xl border border-white/10 p-1.5 animate-in fade-in zoom-in duration-200"
                        style={{
                            left: `${bubbleMenu.x}px`,
                            top: `${bubbleMenu.y}px`,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        <div className="flex items-center gap-1 px-1">
                            <button onClick={() => execCommand('bold')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Bold className="w-4 h-4" /></button>
                            <button onClick={() => execCommand('italic')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Italic className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <button onClick={() => execCommand('formatBlock', 'h2')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Heading2 className="w-4 h-4" /></button>
                            <button onClick={() => execCommand('formatBlock', 'h3')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Heading3 className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><List className="w-4 h-4" /></button>
                            <button onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ListOrdered className="w-4 h-4" /></button>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <button onClick={addLink} className="p-2 hover:bg-white/10 rounded-full transition-colors"><LinkIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}

                {/* RESTORED: Blog Title (h1) above the image */}
                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-12 font-serif text-center">
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

                    {/* Brand Overlays (Brand Standard 3.5) */}
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
                    onBlur={(e) => setPreview({ ...preview, content: e.currentTarget.innerHTML })}
                    dangerouslySetInnerHTML={{ __html: preview.content }}
                    className="editor-content prose prose-lg prose-stone dark:prose-invert max-w-none focus:outline-none text-slate-800 dark:text-slate-200 leading-relaxed font-serif"
                    style={{ minHeight: '50vh' }}
                    onMouseDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'A') {
                            const href = (target as HTMLAnchorElement).href;
                            if (href) {
                                e.preventDefault();
                                window.open(href, '_blank');
                            }
                        }
                    }}
                />

                {/* AI Refinement Section */}
                <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800 space-y-8">
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
                            placeholder="Type instructions to refine this post (e.g., 'Add a new heading about market trends')..."
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-none p-6 text-base focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[120px]"
                        />

                        {/* Apply Refinement Button */}
                        <Button
                            variant="primary"
                            onClick={handleApplyFeedback}
                            isLoading={isApplyingFeedback}
                            disabled={!feedback}
                            className="w-full h-14 rounded-none bg-indigo-600 hover:bg-indigo-700 uppercase tracking-widest text-[11px] font-bold shadow-lg"
                        >
                            Apply AI Refinement
                        </Button>

                        {/* Save Buttons */}
                        <div className="flex gap-4">
                            <Button
                                variant="secondary"
                                onClick={handleSaveDraft}
                                isLoading={isSavingDraft}
                                className="flex-1 h-14 rounded-none border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-widest gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Edits
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveDraft}
                                isLoading={isSavingDraft}
                                className="flex-1 h-14 rounded-none bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/10 font-bold text-[11px] uppercase tracking-widest gap-2"
                            >
                                Send to Review Queue
                            </Button>
                        </div>
                    </div>
                </div>

                {preview.infographicUrl && (
                    <div className="mt-20 pt-16 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 text-center mb-10">Visual Synthesis</p>
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden shadow-2xl">
                                <img src={preview.infographicUrl} alt="Infographic" className="w-full h-auto" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-20" />
        </div>
    );
};
