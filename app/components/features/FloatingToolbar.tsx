'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Bold,
    Italic,
    Link as LinkIcon,
    Link2Off,
    Sparkles,
    AlignLeft,
    AlignJustify,
    X,
    Check,
    Loader2
} from 'lucide-react';

import { useDashboard } from '../context/DashboardContext';

interface FloatingToolbarProps {
    isVisible: boolean;
    rect: DOMRect | null;
    onAction: (action: string, value?: string) => Promise<void> | void;
    onClose: () => void;
    isLink?: boolean;
}

export const FloatingToolbar = ({ isVisible, rect, onAction, onClose, isLink: isLinkProp }: FloatingToolbarProps) => {
    const { targetPlatform, selectedReviewDraft } = useDashboard();
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Auto-focus URL input cleanly when link panel opens
    useEffect(() => {
        if (showLinkInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showLinkInput]);

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
    
    // --- 1. Viewport Boundary Clamped Strategy ---
    const topPosition = rect.top - TOOLBAR_HEIGHT - 10;
    const finalTop = topPosition < 0 ? rect.bottom + 10 : topPosition;

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const cardWidth = showLinkInput ? 440 : 540;
    const halfWidth = cardWidth / 2;
    const rawLeft = rect.left + rect.width / 2;
    // Safely clamp X coordinate inside viewport boundaries (min 20px from screen edges)
    const finalLeft = Math.min(Math.max(halfWidth + 20, rawLeft), screenWidth - halfWidth - 20);

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

    // Helper to check if the current selection is inside a link
    const getIsLink = () => {
        if (typeof window === 'undefined') return false;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;

        const range = selection.getRangeAt(0);
        // Check the common ancestor
        let container = range.commonAncestorContainer;

        // If it's a text node, get the parent element
        if (container.nodeType === 3) {
            container = container.parentNode as Node;
        }

        // Check if the container or any parent is an <a> tag or stat-highlight
        return !!(container instanceof HTMLElement && (container.closest('a') || container.closest('span.stat-highlight')));
    };

    const isLink = isLinkProp !== undefined ? isLinkProp : getIsLink();

    const toolbarContent = (
        <div
            ref={toolbarRef}
            className={
                showLinkInput
                    ? "fixed z-[9999] pointer-events-auto -translate-x-1/2 flex flex-col animate-in fade-in zoom-in-95 duration-200 select-none drop-shadow-2xl"
                    : "fixed z-[9999] pointer-events-auto -translate-x-1/2 flex items-center gap-2 px-6 py-4 bg-white dark:bg-slate-900 border-2 border-violet-500/30 ring-4 ring-violet-500/10 shadow-2xl rounded-none animate-in fade-in zoom-in duration-200 select-none min-w-[500px] justify-between"
            }
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
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => onAction('bold')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => onAction('italic')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => {
                            // Find existing URL if selection is inside a link using robust 3-way check
                            let existingUrl = '';
                            const selection = window.getSelection();
                            if (selection && selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
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
                            setLinkUrl(existingUrl);
                            setShowLinkInput(true);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors rounded-lg group"
                        title="Add Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    {/* Conditional Unlink Button */}
                    {isLink && (
                        <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={() => onAction('unlink')}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors rounded-lg group"
                            title="Remove Link"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* --- AI Formatting Buttons --- */}
                    {/* --- AI Action: Humanize --- */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => handleAiAction('humanize')}
                        className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors group flex items-center gap-1.5 disabled:opacity-50"
                        title="Humanize Writing"
                        disabled={!!loadingAction}
                    >
                        {loadingAction === 'humanize' ? (
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-amber-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 hidden sm:inline">
                            {loadingAction === 'humanize' ? '...' : 'Humanize'}
                        </span>
                    </button>


                    {/* --- AI Action: Shorten --- */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => handleAiAction('shorten')}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors group flex items-center gap-1.5 disabled:opacity-50"
                        title="Shorten"
                        disabled={!!loadingAction}
                    >
                        {loadingAction === 'shorten' ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                            <AlignLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-blue-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hidden sm:inline">
                            {loadingAction === 'shorten' ? '...' : 'Shorten'}
                        </span>
                    </button>

                    {/* --- AI Action: Expand --- */}
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={() => handleAiAction('expand')}
                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors group flex items-center gap-1.5 disabled:opacity-50"
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
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={onClose}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors group"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                    </button>
                </>
            ) : (
                // --- Clean Rectangular Delete-Modal Style URL Pop-Up Card ---
                <form
                    onSubmit={handleLinkSubmit}
                    className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
                    style={{
                        padding: '32px',
                        width: '480px',
                        maxWidth: '92vw',
                        borderRadius: '0px',
                        boxSizing: 'border-box'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight" style={{ margin: '0 0 4px 0' }}>
                        Edit Hyperlink
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed" style={{ margin: '0 0 20px 0' }}>
                        Enter or paste the target URL for your selected text.
                    </p>

                    <div className="flex flex-col gap-2" style={{ margin: '0 0 24px 0' }}>
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            placeholder="https://example.com"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-violet-600 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 outline-none shadow-sm transition-all"
                            style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                boxSizing: 'border-box'
                            }}
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Escape') {
                                    setShowLinkInput(false);
                                }
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setShowLinkInput(false)}
                            className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px'
                            }}
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="text-xs font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 active:scale-95 shadow-sm transition-all"
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px'
                            }}
                        >
                            SAVE LINK
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

    return createPortal(toolbarContent, document.body);
};
