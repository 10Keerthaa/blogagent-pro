'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Bold,
    Italic,
    Link as LinkIcon,
    Link2Off,
    Wand2,
    AlignLeft,
    AlignJustify,
    X,
    Check,
    Loader2
} from 'lucide-react';

interface FloatingToolbarProps {
    isVisible: boolean;
    rect: DOMRect | null;
    onAction: (action: string, value?: string) => Promise<void> | void;
    onClose: () => void;
}

export const FloatingToolbar = ({ isVisible, rect, onAction, onClose }: FloatingToolbarProps) => {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset link input when toolbar hides
    useEffect(() => {
        if (!isVisible) {
            setShowLinkInput(false);
            setLinkUrl('');
            setLoadingAction(null);
        }
    }, [isVisible]);

    // Debug: Trace coordinate flow
    useEffect(() => {
        if (isVisible && rect) {
            console.log("Toolbar rendering at viewport coordinates:", { 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height 
            });
        }
    }, [isVisible, rect]);

    if (!isVisible || !rect || !mounted) return null;

    const TOOLBAR_HEIGHT = 60;
    
    // --- 1. Bulletproof Math Strategy ---
    // Calculate the top position relative to viewport.
    // Fixed positioning handles the scroll naturally if we use rect coordinates directly.
    const topPosition = rect.top - TOOLBAR_HEIGHT - 10;
    const finalTop = topPosition < 0 ? rect.bottom + 10 : topPosition;

    const finalLeft = rect.left + rect.width / 2;

    // --- 2. Per-button loading handler ---
    const handleAiAction = async (action: string) => {
        setLoadingAction(action);
        try {
            await onAction(action);
        } finally {
            setLoadingAction(null);
        }
    };

    // --- Link submit ---
    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (linkUrl.trim()) {
            onAction('link', linkUrl.trim());
            setShowLinkInput(false);
            setLinkUrl('');
        }
    };

    const toolbarContent = (
        <div
            ref={toolbarRef}
            className="fixed z-[9999] pointer-events-auto -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-100/50 dark:border-indigo-900/50 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 select-none"
            style={{
                top: finalTop,
                left: finalLeft
            }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} // Prevent losing selection
        >
            {!showLinkInput ? (
                <>
                    {/* --- Formatting Buttons --- */}
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onAction('bold')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onAction('italic')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowLinkInput(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                        title="Add Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    {/* Conditional Unlink Button */}
                    {(() => {
                        const selection = typeof window !== 'undefined' ? window.getSelection() : null;
                        const isLink = !!(selection && selection.rangeCount > 0 && (() => {
                            const container = selection.getRangeAt(0).commonAncestorContainer;
                            return !!(container.nodeType === 1 ? (container as HTMLElement).closest('a') : container.parentElement?.closest('a'));
                        })());

                        return isLink && (
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onAction('unlink')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                                title="Remove Link"
                            >
                                <Link2Off className="w-4 h-4" />
                            </button>
                        );
                    })()}

                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* --- AI Action: Rephrase --- */}
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAiAction('rephrase')}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors group flex items-center gap-2 disabled:opacity-50"
                        title="AI Re-phrase"
                        disabled={!!loadingAction}
                    >
                        {loadingAction === 'rephrase' ? (
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        ) : (
                            <Wand2 className="w-4 h-4 text-indigo-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hidden sm:inline">
                            {loadingAction === 'rephrase' ? 'Working...' : 'Rephrase'}
                        </span>
                    </button>

                    {/* --- AI Action: Shorten --- */}
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAiAction('shorten')}
                        className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors group flex items-center gap-1 disabled:opacity-50"
                        title="Shorten"
                        disabled={!!loadingAction}
                    >
                        {loadingAction === 'shorten' ? (
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        ) : (
                            <AlignLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-amber-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 hidden sm:inline">
                            {loadingAction === 'shorten' ? '...' : 'Shorten'}
                        </span>
                    </button>

                    {/* --- AI Action: Expand --- */}
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAiAction('expand')}
                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors group flex items-center gap-1 disabled:opacity-50"
                        title="Expand"
                        disabled={!!loadingAction}
                    >
                        {loadingAction === 'expand' ? (
                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                        ) : (
                            <AlignJustify className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-emerald-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 hidden sm:inline">
                            {loadingAction === 'expand' ? '...' : 'Expand'}
                        </span>
                    </button>

                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onClose}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors group"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                    </button>
                </>
            ) : (
                // --- Link Input Panel ---
                <form
                    onSubmit={handleLinkSubmit}
                    className="flex items-center gap-2 px-2 py-1"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <input
                        autoFocus
                        type="url"
                        placeholder="Paste URL..."
                        className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-200 w-44 placeholder:text-slate-400 border-b border-indigo-200 pb-0.5"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                    />
                    <button
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 flex items-center justify-center"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowLinkInput(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </form>
            )}
        </div>
    );

    return createPortal(toolbarContent, document.body);
};
