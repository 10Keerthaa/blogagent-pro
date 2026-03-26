'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useBlogApi } from '../hooks/useBlogApi';

interface DashboardContextType {
    prompt: string;
    setPrompt: (v: string) => void;
    keywordInput: string;
    setKeywordInput: (v: string) => void;
    keywords: string[];
    setKeywords: (v: string[]) => void;
    feedback: string;
    setFeedback: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    activeTab: 'create' | 'review' | 'history';
    setActiveTab: (v: 'create' | 'review' | 'history') => void;
    preview: any | null;
    setPreview: (v: any | null) => void;
    reviewDrafts: any[];
    isFetchingDrafts: boolean;
    selectedReviewDraft: any | null;
    setSelectedReviewDraft: (v: any | null) => void;
    history: any[];
    error: string | null;
    setError: (v: string | null) => void;
    isGenerating: boolean;
    isApplyingFeedback: boolean;
    isGeneratingDescription: boolean;
    isGeneratingInfographic: boolean;
    infographicUrl: string | null;
    setInfographicUrl: (v: string | null) => void;
    isSavingDraft: boolean;
    isRejecting: boolean;
    isSavingManual: boolean;
    isPublished: boolean;
    isFetchingKeywords: boolean;
    primaryKeyword: string | null;
    setPrimaryKeyword: (v: string | null) => void;

    // Handlers
    handleAddKeyword: (e: React.KeyboardEvent) => void;
    removeKeyword: (tag: string) => void;
    handleFetchKeywords: () => Promise<void>;
    handleClearForm: () => void;
    handleGenerate: () => Promise<void>;
    handleGenerateDescription: () => Promise<void>;
    handleApplyFeedback: () => Promise<void>;
    handleApplyReviewFeedback: () => Promise<void>;
    handleSaveManualEdits: () => Promise<void>;
    handleSaveDraft: () => Promise<void>;
    handleRejectDraft: (id: string) => Promise<void>;
    handleApproveDraft: (draft: any) => Promise<void>;
    handleGenerateInfographic: () => Promise<void>;
    fetchDrafts: () => Promise<void>;
    handleSelectReviewDraft: (id: string) => Promise<void>;
    isFetchingDraftDetails: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
    const api = useBlogApi();
    const { fetchSitemap: apiFetchSitemap, fetchHistory: apiFetchHistory, fetchDrafts: apiFetchDrafts } = api;

    const [prompt, setPrompt] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [feedback, setFeedback] = useState('');
    const [description, setDescription] = useState('');
    const [activeTab, setActiveTab] = useState<'create' | 'review' | 'history'>('create');
    const [preview, setPreview] = useState<any | null>(null);
    const [reviewDrafts, setReviewDrafts] = useState<any[]>([]);
    const [selectedReviewDraft, setSelectedReviewDraft] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [infographicUrl, setInfographicUrl] = useState<string | null>(null);
    const [sitemapData, setSitemapData] = useState<Record<string, string>>({});
    const [primaryKeyword, setPrimaryKeyword] = useState<string | null>(null);
    const [isFetchingDraftDetails, setIsFetchingDraftDetails] = useState(false);

    const fetchSitemap = useCallback(async () => {
        const data = await apiFetchSitemap();
        setSitemapData(data);
    }, [apiFetchSitemap]);

    const applySitemapLinks = useCallback((html: string) => {
        if (!sitemapData || Object.keys(sitemapData).length === 0) return html;
        const parts = html.split(/(<[^>]+>)/g);
        let inHeading = false;

        // Filter out very common/short phrases and sort by length descending
        const sortedKeywords = Object.keys(sitemapData)
            .filter(phrase => phrase.length > 5 && !['doing more', 'can help', 'start here', 'read more'].includes(phrase.toLowerCase()))
            .sort((a, b) => b.length - a.length);

        return parts.map(part => {
            if (part.startsWith('<')) {
                const tag = part.toLowerCase();
                if (tag.startsWith('<h1') || tag.startsWith('<h2') || tag.startsWith('<h3')) inHeading = true;
                if (tag.startsWith('</h1') || tag.startsWith('</h2') || tag.startsWith('</h3')) inHeading = false;
                return part;
            }
            if (inHeading) return part;
            let text = part;
            sortedKeywords.forEach(phrase => {
                const regex = new RegExp(`(?<!<[^>]*)\\b(${phrase})\\b(?![^<]*>)`, 'gi');
                // Limit to 1 link per unique phrase to avoid spamminess
                if (text.match(regex)) {
                    text = text.replace(regex, `<a href="${sitemapData[phrase]}" target="_blank" class="sitemap-link underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-600 transition-all font-medium">$1</a>`);
                }
            });
            return text;
        }).join('');
    }, [sitemapData]);

    // Feature 2 & 3: Keyword Frequency Enforcement & Underlining
    const processKeywordsInContent = useCallback((html: string, allKeywords: string[], primary: string | null): string => {
        if (!html || allKeywords.length === 0) return html;
        let processedHtml = html;

        // 1. Keyword Frequency Enforcement Logic (Feature 2)
        allKeywords.forEach(kw => {
            const isPrimary = kw === primary;
            const targetCount = isPrimary ? 3 : 2;

            // Count using regex with word boundaries
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            const matches = processedHtml.match(regex) || [];
            const currentCount = matches.length;

            if (currentCount < targetCount) {
                const missing = targetCount - currentCount;
                // Simple insertion: at the end of the content before the last </p> or at the very end
                for (let j = 0; j < missing; j++) {
                    const insertionText = ` <span style="opacity: 0.9;">Note: <strong>${kw}</strong> is a key theme in this context.</span>`;
                    if (processedHtml.includes('</p>')) {
                        const lastIndex = processedHtml.lastIndexOf('</p>');
                        processedHtml = processedHtml.substring(0, lastIndex) + insertionText + processedHtml.substring(lastIndex);
                    } else {
                        processedHtml += `<p>${insertionText}</p>`;
                    }
                }
            }
        });

        // 2. Underlining with Black (Feature 3) - Single Pass to avoid nesting
        const sortedKws = [...allKeywords].sort((a, b) => b.length - a.length);
        const pattern = sortedKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const mainRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

        const parts = processedHtml.split(/(<[^>]+>)/g);
        processedHtml = parts.map(part => {
            if (part.startsWith('<')) return part; // Skip HTML tags
            return part.replace(mainRegex, '<span style="text-decoration: underline; text-decoration-color: black;">$1</span>');
        }).join('');

        return processedHtml;
    }, []);

    const fetchHistory = useCallback(async () => {
        const data = await apiFetchHistory();
        setHistory(data);
    }, [apiFetchHistory]);

    const fetchDrafts = useCallback(async () => {
        const data = await apiFetchDrafts();
        setReviewDrafts(data);
    }, [apiFetchDrafts]);

    useEffect(() => {
        fetchHistory();
        fetchSitemap();
    }, [fetchHistory, fetchSitemap]);

    useEffect(() => {
        if (activeTab === 'review') {
            fetchDrafts();
            setSelectedReviewDraft(null);
        }
    }, [activeTab, fetchDrafts]);

    const handleAddKeyword = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && keywordInput.trim()) {
            e.preventDefault();
            if (!keywords.includes(keywordInput.trim())) {
                setKeywords([...keywords, keywordInput.trim()]);
            }
            setKeywordInput('');
        }
    };

    const removeKeyword = (tag: string) => {
        setKeywords(keywords.filter(k => k !== tag));
    };

    const handleFetchKeywords = async () => {
        if (!prompt.trim()) return;
        try {
            const keys = await api.fetchKeywords(prompt);
            setKeywords(keys);
            if (primaryKeyword && !keys.includes(primaryKeyword)) {
                setPrimaryKeyword(null);
            }
        } catch (e: any) { setError(e.message); }
    };

    const handleClearForm = () => {
        setPrompt('');
        setKeywords([]);
        setKeywordInput('');
        setDescription('');
        setPreview(null);
        setFeedback('');
        setInfographicUrl(null);
        setError(null);
    };

    const handleGenerate = async () => {
        setError(null); setInfographicUrl(null);
        setPreview(null);
        try {
            const fullRawText = await api.generateContent(
                { prompt, keywords: keywords.join(', ') },
                (chunk: string) => {
                    setPreview((prev: any) => {
                        const newContent = (prev?.content || '') + chunk;
                        const titleMatch = newContent.match(/<title>([\s\S]*?)<\/title>/i);
                        const currentTitle = titleMatch ? titleMatch[1].trim() : prompt;
                        return { ...prev, content: newContent, title: currentTitle, meta: '' };
                    });
                }
            );

            const titleMatch = fullRawText.match(/<title>([\s\S]*?)<\/title>/i);
            const metaMatch = fullRawText.match(/<meta>([\s\S]*?)<\/meta>/i);
            const contentMatch = fullRawText.match(/<content>([\s\S]*?)<\/content>/i);

            const finalTitle = titleMatch ? titleMatch[1].trim() : prompt;
            const finalMeta = metaMatch ? metaMatch[1].trim() : "";
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;
            finalContent = applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);

            setPreview({ title: finalTitle, meta: finalMeta, content: finalContent, imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80' });
            setDescription(finalMeta);

            const imgUrl = await api.generateFeaturedImage({ prompt, title: finalTitle });
            if (imgUrl) setPreview((prev: any) => ({ ...prev, imageUrl: imgUrl }));
        } catch (e: any) { setError(e.message); }
    };

    const handleGenerateDescription = async () => {
        if (!prompt.trim()) return;
        setError(null);
        try {
            const body = {
                prompt,
                keywords: keywords.join(', '),
                primaryKeyword: primaryKeyword
            };
            const d = await api.generateDescription(body);
            setDescription(d);
        } catch (e: any) { setError(e.message); }
    };

    const handleApplyFeedback = async () => {
        const currentImageUrl = preview?.imageUrl;
        setError(null);
        setPreview(null);
        try {
            const fullRawText = await api.generateContent(
                { prompt: preview?.title || prompt, keywords: keywords.join(', '), feedback },
                (chunk: string) => {
                    setPreview((prev: any) => {
                        const newContent = (prev?.content || '') + chunk;
                        const titleMatch = newContent.match(/<title>([\s\S]*?)<\/title>/i);
                        const currentTitle = titleMatch ? titleMatch[1].trim() : (prev?.title || prompt);
                        return { ...prev, content: newContent, title: currentTitle, meta: prev?.meta || '' };
                    });
                }
            );

            const titleMatch = fullRawText.match(/<title>([\s\S]*?)<\/title>/i);
            const metaMatch = fullRawText.match(/<meta>([\s\S]*?)<\/meta>/i);
            const contentMatch = fullRawText.match(/<content>([\s\S]*?)<\/content>/i);

            const finalTitle = titleMatch ? titleMatch[1].trim() : (preview?.title || prompt);
            const finalMeta = metaMatch ? metaMatch[1].trim() : (preview?.meta || "");
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;
            finalContent = applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);

            setPreview({ title: finalTitle, meta: finalMeta, content: finalContent, imageUrl: currentImageUrl || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80' });
            setDescription(finalMeta);
            setFeedback('');

            const imgUrl = await api.generateFeaturedImage({ prompt, title: finalTitle });
            if (imgUrl) setPreview((prev: any) => ({ ...prev, imageUrl: imgUrl }));
        } catch (e: any) { setError(e.message); }
    };

    const handleApplyReviewFeedback = async () => {
        if (!selectedReviewDraft || !feedback) return;
        setError(null);
        try {
            const fullRawText = await api.generateContent(
                { prompt: selectedReviewDraft.title, keywords: keywords.join(', '), feedback },
                (chunk: string) => {
                    // Review tab update (no real-time preview yet, just keeping it consistent)
                }
            );

            const titleMatch = fullRawText.match(/<title>([\s\S]*?)<\/title>/i);
            const metaMatch = fullRawText.match(/<meta>([\s\S]*?)<\/meta>/i);
            const contentMatch = fullRawText.match(/<content>([\s\S]*?)<\/content>/i);

            const finalTitle = titleMatch ? titleMatch[1].trim() : (selectedReviewDraft?.title || prompt);
            const finalMeta = metaMatch ? metaMatch[1].trim() : (selectedReviewDraft?.metaDesc || "");
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;
            finalContent = applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);

            const updateData = {
                title: finalTitle,
                content: finalContent,
                metaDesc: finalMeta
            };

            await api.updateDraft({ id: selectedReviewDraft.id, action: 'edit', updateData });
            setSelectedReviewDraft({ ...selectedReviewDraft, ...updateData });
            setFeedback('');
        } catch (e: any) { setError(e.message); }
    };

    const handleSaveManualEdits = async () => {
        if (!selectedReviewDraft) return;
        setError(null);
        try {
            const updateData = {
                title: selectedReviewDraft.title,
                content: selectedReviewDraft.content
            };
            await api.updateDraft({ id: selectedReviewDraft.id, action: 'edit', updateData });
            fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    useEffect(() => {
        if (selectedReviewDraft) {
            setPrompt(selectedReviewDraft.prompt || '');

            // Handle keywords being either an array or a comma-separated string
            const kw = selectedReviewDraft.keywords;
            if (Array.isArray(kw)) {
                setKeywords(kw);
            } else if (typeof kw === 'string' && kw.trim()) {
                setKeywords(kw.split(',').map(s => s.trim()).filter(Boolean));
            } else {
                setKeywords([]);
            }

            setDescription(selectedReviewDraft.metaDesc || '');
        }
    }, [selectedReviewDraft]);

    const handleSaveDraft = async () => {
        if (!preview) return;
        setError(null);
        try {
            await api.saveDraft({
                title: preview.title,
                content: preview.content,
                metaDesc: description || preview.meta,
                imageUrl: preview.imageUrl,
                prompt: prompt,
                keywords: keywords
            });
            setActiveTab('review');
        } catch (e: any) { setError(e.message); }
    };

    const handleRejectDraft = async (id: string) => {
        setError(null);
        try {
            await api.updateDraft({ id, action: 'reject' });
            setSelectedReviewDraft(null);
            fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleApproveDraft = async (draft: any) => {
        setError(null);
        try {
            const pubData = await api.publishToWordPress({
                title: draft.title,
                content: draft.content,
                metaDesc: draft.metaDesc,
                slug: draft.title.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, ''),
                imageUrl: draft.imageUrl
            });

            await api.updateDraft({ id: draft.id, action: 'publish', wpUrl: pubData.url });

            setSelectedReviewDraft(null);
            fetchDrafts();
            fetchHistory();
            setActiveTab('history');
        } catch (e: any) { setError(e.message); }
    };

    const handleGenerateInfographic = async () => {
        const target = preview || selectedReviewDraft;
        if (!target) return;
        try {
            const url = await api.generateInfographic({ content: target.content, title: target.title });
            if (url) setInfographicUrl(url);
        } catch (e: any) { setError(e.message); }
    };

    const handleSelectReviewDraft = async (id: string) => {
        setIsFetchingDraftDetails(true);
        setError(null);
        try {
            const draft = await api.fetchDraftById(id);
            if (draft) {
                setSelectedReviewDraft(draft);
                // Explicitly sync sidebar fields
                setPrompt(draft.prompt || '');
                setDescription(draft.metaDesc || '');

                if (Array.isArray(draft.keywords)) {
                    setKeywords(draft.keywords);
                } else if (typeof draft.keywords === 'string') {
                    setKeywords(draft.keywords.split(',').map((k: string) => k.trim()).filter(Boolean));
                } else {
                    setKeywords([]);
                }
            }
        } catch (e: any) {
            setError("Failed to load post details");
        } finally {
            setIsFetchingDraftDetails(false);
        }
    };

    const value = {
        prompt, setPrompt,
        keywordInput, setKeywordInput,
        keywords, setKeywords,
        feedback, setFeedback,
        description, setDescription,
        activeTab, setActiveTab,
        preview, setPreview,
        reviewDrafts, isFetchingDrafts: api.isFetchingDrafts,
        selectedReviewDraft, setSelectedReviewDraft,
        history, error, setError,
        isGenerating: api.isGenerating,
        isApplyingFeedback: api.isApplyingFeedback,
        isGeneratingDescription: api.isGeneratingDescription,
        isGeneratingInfographic: api.isGeneratingInfographic,
        infographicUrl, setInfographicUrl,
        isSavingDraft: api.isSavingDraft,
        isRejecting: api.isRejecting,
        isSavingManual: api.isSavingManual,
        isPublished: api.isPublished,
        isFetchingKeywords: api.isFetchingKeywords,
        handleAddKeyword, removeKeyword,
        handleFetchKeywords, handleClearForm,
        handleGenerate, handleGenerateDescription,
        handleApplyFeedback, handleApplyReviewFeedback,
        handleSaveManualEdits, handleSaveDraft,
        handleRejectDraft, handleApproveDraft,
        handleGenerateInfographic, fetchDrafts,
        handleSelectReviewDraft, isFetchingDraftDetails,
        primaryKeyword, setPrimaryKeyword
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};
