'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Bold,
    Italic,
    Link as LinkIcon,
    Wand2,
    AlignLeft,
    AlignJustify,
    X,
    Check
} from 'lucide-react';

interface FloatingToolbarProps {
    isVisible: boolean;
    rect: DOMRect | null;
    onAction: (action: string, value?: string) => void;
    onClose: () => void;
}

export const FloatingToolbar = ({ isVisible, rect, onAction, onClose }: FloatingToolbarProps) => {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isVisible || !rect || !mounted) return null;

    const position = {
        top: window.scrollY + rect.top - 60, // 60px above selection
        left: window.scrollX + rect.left + rect.width / 2,
    };

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (linkUrl) {
            onAction('link', linkUrl);
            setShowLinkInput(false);
            setLinkUrl('');
        }
    };

    const toolbarContent = (
        <div
            ref={toolbarRef}
            className="fixed z-[9999] -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-100/50 dark:border-indigo-900/50 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{
                top: position.top,
                left: position.left
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
        >
            {!showLinkInput ? (
                <>
                    <button
                        onClick={() => onAction('bold')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                        title="Bold"
                    >
                        <Bold className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600" />
                    </button>
                    <button
                        onClick={() => onAction('italic')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                        title="Italic"
                    >
                        <Italic className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600" />
                    </button>
                    <button
                        onClick={() => setShowLinkInput(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                        title="Hyperlink"
                    >
                        <LinkIcon className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <button
                        onClick={() => onAction('rephrase')}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors group flex items-center gap-2"
                        title="AI Re-phrase"
                    >
                        <Wand2 className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hidden sm:inline">Rephrase</span>
                    </button>
                    <button
                        onClick={() => onAction('shorten')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                        title="Shorten"
                    >
                        <AlignLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-amber-500" />
                    </button>
                    <button
                        onClick={() => onAction('expand')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                        title="Expand"
                    >
                        <AlignJustify className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-emerald-500" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors group"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                    </button>
                </>
            ) : (
                <form onSubmit={handleLinkSubmit} className="flex items-center gap-2 px-2 py-1">
                    <input
                        autoFocus
                        type="url"
                        placeholder="Paste link..."
                        className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-200 w-40 placeholder:text-slate-400"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                    />
                    <button type="submit" className="p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
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
