import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Button } from '../ui/Button';
import {
    Bold, Italic, Link as LinkIcon, Save, ArrowRight,
    Heading2, Heading3, List, ListOrdered, Wand2
} from 'lucide-react';

export const PostPreview = () => {
    const {
        preview, setPreview, isSavingDraft, handleSaveDraft, setActiveTab
    } = useDashboard();

    // Bubble Menu State
    const [bubbleMenu, setBubbleMenu] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });
    const editorRef = useRef<HTMLDivElement>(null);

    // Handle text selection for floating menu
    const updateBubblePosition = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !editorRef.current) {
            setBubbleMenu(prev => ({ ...prev, show: false }));
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Ensure the selection is inside our editor
        if (!editorRef.current.contains(range.commonAncestorContainer)) {
            setBubbleMenu(prev => ({ ...prev, show: false }));
            return;
        }

        setBubbleMenu({
            x: rect.left + (rect.width / 2),
            y: rect.top + window.scrollY - 10,
            show: true
        });
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updateBubblePosition);
        return () => document.removeEventListener('selectionchange', updateBubblePosition);
    }, [updateBubblePosition]);

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
            {/* FLOATING BUBBLE MENU */}
            {bubbleMenu.show && (
                <div
                    className="fixed z-[100] flex items-center bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-2xl border border-white/10 p-1.5 animate-in fade-in zoom-in duration-200"
                    style={{
                        left: `${bubbleMenu.x}px`,
                        top: `${bubbleMenu.y}px`,
                        transform: 'translate(-50%, -100%) translateY(-10px)'
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

            {/* MAIN EDITOR AREA - "BLANK PAGE" STYLE */}
            <div className="max-w-4xl mx-auto w-full px-8 pb-40">
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
                    style={{ minHeight: '60vh' }}
                />

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

            {/* STICKY BOTTOM ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 py-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-8">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Wand2 className="w-4 h-4 animate-pulse text-indigo-500" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">AI Content Stream Active</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={handleSaveDraft}
                            isLoading={isSavingDraft}
                            className="h-12 px-8 rounded-full border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-widest gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Edits
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => setActiveTab('review')}
                            className="h-12 px-10 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 font-bold text-[11px] uppercase tracking-widest gap-2"
                        >
                            Next: Review & Publish
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
