'use client';

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { User } from '@supabase/supabase-js';

export const useBlogApi = () => {
    const [isFetchingDrafts, setIsFetchingDrafts] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApplyingFeedback, setIsApplyingFeedback] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [isSavingReview, setIsSavingReview] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [isFetchingKeywords, setIsFetchingKeywords] = useState(false);
    const [isFetchingDraftDetails, setIsFetchingDraftDetails] = useState(false);

    const mapSupabaseToDraft = (item: any) => {
        if (!item) return null;
        return {
            id: item.id,
            title: item.title,
            content: item.content,
            imageUrl: item.image_url || item.imageUrl,
            infographicUrl: item.infographic_url || item.infographicUrl,
            metaDesc: item.meta_desc || item.metaDesc,
            status: item.status,
            createdBy: item.created_by || item.createdBy,
            prompt: item.prompt,
            keywords: item.keywords,
            createdAt: item.created_at || item.createdAt,
            wpUrl: item.wp_url || item.wpUrl
        };
    };

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
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('status', 'review')
                .order('last_edited_at', { ascending: false });
            if (error) throw error;
            return (data || []).map(mapSupabaseToDraft);
        } catch (e) {
            console.error('Fetch Drafts Error:', e);
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

    const saveDraft = useCallback(async (data: { title: string, content: string, metaDesc?: string, imageUrl?: string, infographicUrl?: string | null, prompt?: string, keywords?: string[] }) => {
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
        const { id, action, updateData, wpUrl } = body;
        if (action === 'reject') setIsRejecting(true);
        if (action === 'edit') setIsSavingManual(true);

        try {
            let status = undefined;
            if (action === 'reject') status = 'rejected';
            if (action === 'publish') status = 'published';

            const payload: any = {
                ...(updateData || {}),
                last_edited_at: new Date().toISOString()
            };

            if (status) payload.status = status;
            if (wpUrl) payload.wp_url = wpUrl;

            // Map UI fields back to snake_case if they exist in updateData
            if (updateData?.imageUrl) payload.image_url = updateData.imageUrl;
            if (updateData?.infographicUrl) payload.infographic_url = updateData.infographicUrl;
            if (updateData?.metaDesc) payload.meta_desc = updateData.metaDesc;

            const { data, error } = await supabase
                .from('posts')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return mapSupabaseToDraft(data);
        } catch (e) {
            console.error('Update Draft Error:', e);
            throw e;
        } finally {
            setIsRejecting(false);
            setIsSavingManual(false);
        }
    }, []);

    const fetchDraftById = useCallback(async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return mapSupabaseToDraft(data);
        } catch (e) {
            console.error('Fetch Draft By ID Error:', e);
            return null;
        }
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

    const upsertPost = useCallback(async (data: any) => {
        const isReview = data.status === 'review';
        if (isReview) setIsSavingReview(true);
        else setIsSavingManual(true);

        try {
            const { data: upsertedData, error } = await supabase
                .from('posts')
                .upsert({
                    ...data,
                    last_edited_at: new Date().toISOString()
                })
                .select()
                .single();
            if (error) throw error;
            return mapSupabaseToDraft(upsertedData);
        } finally {
            if (isReview) setIsSavingReview(false);
            else setIsSavingManual(false);
        }
    }, []);

    const fetchLastInProgressDraft = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('created_by', userId)
                .eq('status', 'in_progress')
                .order('last_edited_at', { ascending: false })
                .limit(1)
                .single();
            if (error) return null;
            return mapSupabaseToDraft(data);
        } catch { return null; }
    }, []);

    const fetchAdminReport = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('user_activity_report')
                .select('*');
            if (error) throw error;
            return data;
        } catch { return []; }
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
        isSavingReview,
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
        fetchDraftById,
        upsertPost,
        fetchLastInProgressDraft,
        fetchAdminReport,
        isFetchingDraftDetails,
        setIsFetchingDraftDetails
    };
};
