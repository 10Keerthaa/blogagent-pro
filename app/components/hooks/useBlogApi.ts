'use client';

import { useState, useCallback } from 'react';

export const useBlogApi = () => {
    const [isFetchingDrafts, setIsFetchingDrafts] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApplyingFeedback, setIsApplyingFeedback] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [isFetchingKeywords, setIsFetchingKeywords] = useState(false);

    const fetchSitemap = useCallback(async () => {
        try {
            const r = await fetch('/api/sitemap-urls');
            const d = await r.json();
            return d.keywordMap || {};
        } catch { return {}; }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const r = await fetch('/api/history');
            const d = await r.json();
            return d.history || [];
        } catch { return []; }
    }, []);

    const fetchDrafts = useCallback(async () => {
        setIsFetchingDrafts(true);
        try {
            const r = await fetch('/api/drafts/get');
            const d = await r.json();
            return d.success ? d.drafts : [];
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            setIsFetchingDrafts(false);
        }
    }, []);

    const generateContent = useCallback(async (body: any, onChunk?: (chunk: string) => void) => {
        setIsGenerating(true);
        try {
            const r = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!r.ok) throw new Error('Generation failed');

            const reader = r.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    fullText += chunk;
                    if (onChunk) onChunk(chunk);
                }
            }
            return fullText;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const generateFeaturedImage = useCallback(async (body: any) => {
        try {
            const r = await fetch('/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const d = await r.json();
            return d.imageUrl || null;
        } catch { return null; }
    }, []);

    const generateDescription = useCallback(async (body: any) => {
        setIsGeneratingDescription(true);
        try {
            const r = await fetch('/api/description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const d = await r.json();
            return d.description || '';
        } finally {
            setIsGeneratingDescription(false);
        }
    }, []);

    const fetchKeywords = useCallback(async (prompt: string) => {
        setIsFetchingKeywords(true);
        try {
            const r = await fetch('/api/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const d = await r.json();
            return d.keywords ? d.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
        } finally {
            setIsFetchingKeywords(false);
        }
    }, []);

    const saveDraft = useCallback(async (data: { title: string, content: string, metaDesc?: string, imageUrl?: string, prompt?: string, keywords?: string[] }) => {
        setIsSavingDraft(true);
        try {
            const r = await fetch('/api/drafts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to save draft');
            return d;
        } finally {
            setIsSavingDraft(false);
        }
    }, []);

    const updateDraft = useCallback(async (body: any) => {
        if (body.action === 'reject') setIsRejecting(true);
        if (body.action === 'edit') setIsSavingManual(true);

        try {
            const r = await fetch('/api/drafts/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!r.ok) throw new Error('Update failed');
            return await r.json();
        } finally {
            setIsRejecting(false);
            setIsSavingManual(false);
        }
    }, []);

    const fetchDraftById = useCallback(async (id: string) => {
        try {
            const r = await fetch(`/api/drafts/details?id=${id}`);
            const d = await r.json();
            return d.success ? d.draft : null;
        } catch { return null; }
    }, []);

    const publishToWordPress = useCallback(async (body: any) => {
        setIsPublished(true);
        try {
            const r = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Publishing failed');
            return d;
        } finally {
            setIsPublished(false);
        }
    }, []);

    const generateInfographic = useCallback(async (body: any) => {
        setIsGeneratingInfographic(true);
        try {
            const r = await fetch('/api/infographic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const d = await r.json();
            return d.imageUrl || null;
        } finally {
            setIsGeneratingInfographic(false);
        }
    }, []);

    return {
        isFetchingDrafts,
        isGenerating,
        isApplyingFeedback,
        setIsApplyingFeedback,
        isGeneratingDescription,
        isGeneratingInfographic,
        isSavingDraft,
        isRejecting,
        isSavingManual,
        isPublished,
        isFetchingKeywords,
        fetchSitemap,
        fetchHistory,
        fetchDrafts,
        generateContent,
        generateFeaturedImage,
        generateDescription,
        fetchKeywords,
        saveDraft,
        updateDraft,
        publishToWordPress,
        generateInfographic,
        fetchDraftById
    };
};
