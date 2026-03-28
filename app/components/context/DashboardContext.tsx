'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useBlogApi } from '../hooks/useBlogApi';
import { supabase } from '../../../lib/supabase';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

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
    isSavingReview: boolean;
    isPublished: boolean;
    isFetchingKeywords: boolean;
    primaryKeyword: string | null;
    setPrimaryKeyword: (v: string | null) => void;
    user: User | null;
    role: 'admin' | 'editor' | null;
    handleLogout: () => Promise<void>;

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
    handleResumeDraft: () => Promise<void>;
    upsertPost: (data: any) => Promise<any>;
    isResuming: boolean;
    isFetchingDraftDetails: boolean;
    isRefiningSelection: boolean;
    resetEditorState: () => void;
    handleRefineSelection: (text: string, action: string, onUpdate: (newText: string) => void) => Promise<void>;
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
    const [isResuming, setIsResuming] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'editor' | null>(null);
    const [isRefiningSelection, setIsRefiningSelection] = useState(false);

    // --- HELPER FUNCTIONS (DEFINED BEFORE USE) ---

    const resetEditorState = useCallback(() => {
        setPrompt('');
        setKeywords([]);
        setKeywordInput('');
        setPrimaryKeyword(null);
        setDescription('');
        setPreview(null);
        setInfographicUrl(null);
    }, []);

    const fetchUserRole = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();
            if (data) setRole(data.role as 'admin' | 'editor');
        } catch (err) { console.error('Error fetching role:', err); }
    }, []);

    const fetchSitemap = useCallback(async () => {
        try {
            const data = await apiFetchSitemap();
            setSitemapData(data);
        } catch (e) { console.error('Sitemap fetch failed'); }
    }, [apiFetchSitemap]);

    const fetchHistory = useCallback(async () => {
        try {
            const data = await apiFetchHistory();
            setHistory(data);
        } catch (e) { console.error('History fetch failed'); }
    }, [apiFetchHistory]);

    const fetchDrafts = useCallback(async () => {
        try {
            const data = await apiFetchDrafts();
            setReviewDrafts(data);
        } catch (e) { console.error('Drafts fetch failed'); }
    }, [apiFetchDrafts]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        resetEditorState();
        setActiveTab('create');
    };

    // --- TEXT PROCESSING HELPERS ---

    const applySitemapLinks = useCallback((html: string) => {
        if (!sitemapData || Object.keys(sitemapData).length === 0) return html;
        const parts = html.split(/(<[^>]+>)/g);
        let inHeading = false;

        const genericPhrases = ['can help', 'doing more', 'start here', 'read more', 'businesses can', 'how businesses', 'agents are', 'more about', 'learn more'];
        const sortedKeywords = Object.keys(sitemapData)
            .filter(phrase =>
                phrase.length > 12 &&
                !genericPhrases.includes(phrase.toLowerCase()) &&
                !/^(is|are|the|how|can|it|we)\s/i.test(phrase)
            )
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
                if (text.match(regex)) {
                    text = text.replace(regex, `<a href="${sitemapData[phrase]}" target="_blank" class="sitemap-link underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-600 transition-all font-medium">$1</a>`);
                }
            });
            return text;
        }).join('');
    }, [sitemapData]);

    const processKeywordsInContent = useCallback((html: string, allKeywords: string[], primary: string | null): string => {
        if (!html || allKeywords.length === 0) return html;
        let processedHtml = html;
        const sortedKws = [...allKeywords].sort((a, b) => b.length - a.length);
        const pattern = sortedKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        if (!pattern) return processedHtml;
        const mainRegex = new RegExp(`(?<!<[^>]*)\\b(${pattern})\\b(?![^<]*>)`, 'gi');
        const parts = processedHtml.split(/(<[^>]+>)/g);
        return parts.map(part => {
            if (part.startsWith('<')) return part;
            return part.replace(mainRegex, '<span style="color: #666666; font-weight: 500;">$1</span>');
        }).join('');
    }, []);

    // --- EFFECTS ---

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
                fetchHistory();
                fetchSitemap();
                fetchDrafts();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserRole(session.user.id);
                fetchHistory();
                fetchSitemap();
                fetchDrafts();
            } else {
                setRole(null);
            }
        });
        return () => subscription.unsubscribe();
    }, [fetchUserRole, fetchHistory, fetchSitemap, fetchDrafts]);

    useEffect(() => {
        if (activeTab === 'review') {
            fetchDrafts();
        }
    }, [activeTab, fetchDrafts]);

    useEffect(() => {
        if (selectedReviewDraft) {
            setPrompt(selectedReviewDraft.prompt || '');
            const kw = selectedReviewDraft.keywords;
            if (Array.isArray(kw)) setKeywords(kw);
            else if (typeof kw === 'string' && kw.trim()) setKeywords(kw.split(',').map(s => s.trim()).filter(Boolean));
            else setKeywords([]);
            setDescription(selectedReviewDraft.metaDesc || '');
            setInfographicUrl(selectedReviewDraft.infographicUrl || null);
            setPrimaryKeyword(selectedReviewDraft.primaryKeyword || null);
        }
    }, [selectedReviewDraft]);

    // --- HANDLERS ---

    const handleAddKeyword = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && keywordInput.trim()) {
            e.preventDefault();
            if (!keywords.includes(keywordInput.trim())) setKeywords([...keywords, keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const removeKeyword = (tag: string) => setKeywords(keywords.filter(k => k !== tag));

    const handleFetchKeywords = async () => {
        if (!prompt.trim()) return;
        try {
            const keys = await api.fetchKeywords(prompt);
            setKeywords(keys);
            if (primaryKeyword && !keys.includes(primaryKeyword)) setPrimaryKeyword(null);
        } catch (e: any) { setError(e.message); }
    };

    const handleClearForm = useCallback(() => {
        setPrompt('');
        setKeywords([]);
        setKeywordInput('');
        setDescription('');
        setPreview(null);
        setInfographicUrl(null);
        setError(null);
        setPrimaryKeyword(null);
    }, []);

    const handleGenerate = async () => {
        setError(null); setInfographicUrl(null); setPreview(null);
        try {
            const fullRawText = await api.generateContent(
                { prompt, keywords: keywords.join(', ') },
                (chunk: string) => {
                    setPreview((prev: any) => {
                        const newContent = (prev?.content || '') + chunk;
                        const titleMatch = newContent.match(/<title>([\s\S]*?)<\/title>/i);
                        const currentTitle = titleMatch ? titleMatch[1].trim().replace(/\*\*|#/g, '') : prompt;
                        return { ...prev, content: newContent, title: currentTitle, meta: '' };
                    });
                }
            );

            const titleMatch = fullRawText.match(/<title>([\s\S]*?)<\/title>/i);
            const metaMatch = fullRawText.match(/<meta>([\s\S]*?)<\/meta>/i);
            const contentMatch = fullRawText.match(/<content>([\s\S]*?)<\/content>/i);

            let finalTitle = titleMatch ? titleMatch[1].trim() : "";
            const finalMeta = metaMatch ? metaMatch[1].trim() : "";
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;

            finalContent = finalContent.replace(/^<(h1|h2)[^>]*>.*?<\/\1>/i, '').trim();
            if (!finalTitle) {
                const boldMatch = finalContent.match(/^(\*\*|#+)\s*([\s\S]*?)\s*(\*\*|#*)\n/);
                if (boldMatch) {
                    finalTitle = boldMatch[2].trim();
                    finalContent = finalContent.replace(boldMatch[0], "").trim();
                } else finalTitle = prompt;
            }
            finalTitle = finalTitle.replace(/\*\*|#/g, '').trim();
            finalContent = applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);

            setPreview({ title: finalTitle, meta: finalMeta, content: finalContent, imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80' });
            if (finalMeta) setDescription(finalMeta);
            const imgUrl = await api.generateFeaturedImage({ prompt, title: finalTitle });
            if (imgUrl) setPreview((prev: any) => ({ ...prev, imageUrl: imgUrl }));
        } catch (e: any) { setError(e.message); }
    };

    const handleGenerateDescription = async () => {
        if (!prompt.trim()) return;
        setError(null);
        try {
            const d = await api.generateDescription({ prompt, keywords: keywords.join(', '), primaryKeyword });
            setDescription(d);
        } catch (e: any) { setError(e.message); }
    };

    const handleApplyFeedback = async () => {
        const currentImageUrl = preview?.imageUrl;
        setError(null); setPreview(null);
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
            setDescription(finalMeta); setFeedback('');
            const imgUrl = await api.generateFeaturedImage({ prompt: finalTitle, title: finalTitle });
            if (imgUrl) setPreview((prev: any) => ({ ...prev, imageUrl: imgUrl }));
        } catch (e: any) { setError(e.message); }
    };

    const handleApplyReviewFeedback = async () => {
        if (!selectedReviewDraft || !feedback) return;
        setError(null);
        try {
            const fullRawText = await api.generateContent({ prompt: selectedReviewDraft.title, keywords: keywords.join(', '), feedback }, () => { });
            const titleMatch = fullRawText.match(/<title>([\s\S]*?)<\/title>/i);
            const metaMatch = fullRawText.match(/<meta>([\s\S]*?)<\/meta>/i);
            const contentMatch = fullRawText.match(/<content>([\s\S]*?)<\/content>/i);
            const finalTitle = titleMatch ? titleMatch[1].trim() : (selectedReviewDraft?.title || prompt);
            const finalMeta = metaMatch ? metaMatch[1].trim() : (selectedReviewDraft?.metaDesc || "");
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;
            finalContent = applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);
            const updateData = { title: finalTitle, content: finalContent, metaDesc: finalMeta };
            await api.updateDraft({ id: selectedReviewDraft.id, action: 'edit', updateData });
            setSelectedReviewDraft({ ...selectedReviewDraft, ...updateData });
            setFeedback('');
        } catch (e: any) { setError(e.message); }
    };

    const handleSaveManualEdits = async () => {
        if (!selectedReviewDraft) return;
        setError(null);
        try {
            await api.updateDraft({ id: selectedReviewDraft.id, action: 'edit', updateData: { title: selectedReviewDraft.title, content: selectedReviewDraft.content } });
            fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleSaveDraft = async () => {
        if (!preview) return;
        setError(null);
        try {
            await api.saveDraft({ title: preview.title, content: preview.content, metaDesc: description || preview.meta, imageUrl: preview.imageUrl, infographicUrl: infographicUrl, prompt: prompt, keywords: keywords });
            resetEditorState(); setActiveTab('review'); fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleRejectDraft = async (id: string) => {
        setError(null);
        try {
            await api.updateDraft({ id, action: 'reject' });
            setSelectedReviewDraft(null); fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleApproveDraft = async (draft: any) => {
        setError(null);
        try {
            const pubData = await api.publishToWordPress({ title: draft.title, content: draft.content, metaDesc: draft.metaDesc, imageUrl: draft.imageUrl, infographicUrl: draft.infographicUrl, slug: draft.title.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, '') });
            await api.updateDraft({ id: draft.id, action: 'publish', wpUrl: pubData.url });
            setSelectedReviewDraft(null); fetchDrafts(); fetchHistory(); setActiveTab('history');
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

    const handleResumeDraft = async () => {
        if (!user) return;
        setIsResuming(true); setError(null);
        try {
            const draft = await api.fetchLastInProgressDraft(user.id);
            if (draft) {
                setPreview({ title: draft.title, content: draft.content, imageUrl: draft.imageUrl, infographicUrl: draft.infographicUrl });
                setPrompt(draft.prompt || ''); setDescription(draft.metaDesc || '');
                if (Array.isArray(draft.keywords)) setKeywords(draft.keywords);
                else if (typeof draft.keywords === 'string') setKeywords(draft.keywords.split(',').map((k: string) => k.trim()).filter(Boolean));
                setInfographicUrl(draft.infographicUrl || null); setActiveTab('create');
            } else setError("No recent draft found to resume.");
        } catch (err) { setError("Failed to resume draft"); } finally { setIsResuming(false); }
    };

    const handleRefineSelection = async (text: string, action: string, onUpdate: (newText: string) => void) => {
        let fullRefined = '';
        try {
            await api.refineSelection(text, action, (chunk: string) => {
                fullRefined += chunk;
                onUpdate(fullRefined);
            });
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSelectReviewDraft = async (id: string) => {
        setIsFetchingDraftDetails(true); setError(null);
        try {
            const draft = await api.fetchDraftById(id);
            if (draft) {
                setSelectedReviewDraft(draft);
                setPrompt(draft.prompt || ''); setDescription(draft.metaDesc || '');
                setInfographicUrl(draft.infographicUrl || null); setPrimaryKeyword(draft.primaryKeyword || null);
                if (Array.isArray(draft.keywords)) setKeywords(draft.keywords);
                else if (typeof draft.keywords === 'string' && draft.keywords.trim()) setKeywords(draft.keywords.split(',').map((k: string) => k.trim()).filter(Boolean));
                else setKeywords([]);
            }
        } catch (e: any) { setError("Failed to load post details"); } finally { setIsFetchingDraftDetails(false); }
    };

    const value = {
        prompt, setPrompt, keywordInput, setKeywordInput, keywords, setKeywords, feedback, setFeedback, description, setDescription, activeTab, setActiveTab, preview, setPreview, reviewDrafts, isFetchingDrafts: api.isFetchingDrafts, selectedReviewDraft, setSelectedReviewDraft, history, error, setError, isGenerating: api.isGenerating, isApplyingFeedback: api.isApplyingFeedback, isGeneratingDescription: api.isGeneratingDescription, isGeneratingInfographic: api.isGeneratingInfographic, infographicUrl, setInfographicUrl, isSavingDraft: api.isSavingDraft, isRejecting: api.isRejecting, isSavingManual: api.isSavingManual, isSavingReview: api.isSavingReview, isPublished: api.isPublished, isFetchingKeywords: api.isFetchingKeywords, handleAddKeyword, removeKeyword, handleFetchKeywords, handleClearForm, handleGenerate, handleGenerateDescription, handleApplyFeedback, handleApplyReviewFeedback, handleSaveManualEdits, handleSaveDraft, handleRejectDraft, handleApproveDraft, handleGenerateInfographic, fetchDrafts, handleSelectReviewDraft, isFetchingDraftDetails, handleResumeDraft, isResuming, upsertPost: api.upsertPost, primaryKeyword, setPrimaryKeyword, resetEditorState, user, role, handleLogout, isRefiningSelection: api.isRefiningSelection, handleRefineSelection
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) throw new Error('useDashboard must be used within a DashboardProvider');
    return context;
};
