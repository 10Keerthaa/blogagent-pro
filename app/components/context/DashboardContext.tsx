'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useBlogApi } from '../hooks/useBlogApi';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LOCKED_CATEGORY_ID } from '@/lib/constants/categories';

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
    selectedHistoryItem: any | null;
    setSelectedHistoryItem: (v: any | null) => void;
    handleSelectHistoryItem: (item: any) => void;
    error: string | null;
    setError: (v: string | null) => void;
    isGenerating: boolean;
    isApplyingFeedback: boolean;
    isHumanizing: boolean;
    isFetchingUsers: boolean;
    isUpdatingRole: boolean;
    isTeamManagementOpen: boolean;
    setIsTeamManagementOpen: (v: boolean) => void;
    isPerformanceOpen: boolean;
    setIsPerformanceOpen: (v: boolean) => void;
    handleUpdateUserRole: (uid: string, newRole: string) => Promise<void>;
    handleAddUser: (email: string, role: string) => Promise<boolean>;
    handleDeleteUser: (userId: string) => Promise<boolean>;
    reportData: any[];
    handleFetchReport: () => Promise<void>;
    isGeneratingDescription: boolean;
    isGeneratingInfographic: boolean;
    infographicUrl: string | null;
    setInfographicUrl: (v: string | null) => void;
    infographicFeedback: string;
    setInfographicFeedback: (v: string) => void;
    isInfographicRefining: boolean;
    users: any[];
    handleFetchUsers: () => Promise<void>;
    isSavingDraft: boolean;
    isRejecting: boolean;
    isSavingManual: boolean;
    isSavingReview: boolean;
    isPublished: boolean;
    isFetchingKeywords: boolean;
    primaryKeyword: string | null;
    setPrimaryKeyword: (v: string | null) => void;
    user: FirebaseUser | null;
    role: 'admin' | 'editor' | null;
    handleLogout: () => Promise<void>;
    isPreviewOpen: boolean;
    setIsPreviewOpen: (v: boolean) => void;
    humanizationError: boolean;
    setHumanizationError: (v: boolean) => void;
    handleRetryHumanization: () => Promise<void>;
    selectedCategories: number[];
    setSelectedCategories: (v: number[]) => void;

    // Handlers
    handleAddKeyword: (e: React.KeyboardEvent) => void;
    removeKeyword: (tag: string) => void;
    handleFetchKeywords: () => Promise<void>;
    handleClearForm: () => void;
    handleGenerate: () => Promise<void>;
    handleGenerateDescription: () => Promise<void>;
    handleApplyFeedback: () => Promise<void>;
    handleApplyReviewFeedback: () => Promise<void>;
    handleSaveManualEdits: (updatedDraft?: any) => Promise<void>;
    handleSaveDraft: () => Promise<void>;
    handleRejectDraft: (id: string) => Promise<void>;
    handleMarkAsReviewed: (id: string) => Promise<void>;
    handleApproveDraft: (draft: any) => Promise<void>;
    handleGenerateInfographic: (refinement?: string) => Promise<void>;
    fetchDrafts: () => Promise<void>;
    handleSelectReviewDraft: (id: string) => Promise<void>;
    handleResumeDraft: () => Promise<void>;
    checkForResumeDraft: () => Promise<void>;
    hasResumeDraft: boolean;
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
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [infographicUrl, setInfographicUrl] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
    const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [sitemapData, setSitemapData] = useState<Record<string, string>>({});
    const [anchorMap, setAnchorMap] = useState<Record<string, string[]>>({});
    const [primaryKeyword, setPrimaryKeyword] = useState<string | null>(null);
    const [isFetchingDraftDetails, setIsFetchingDraftDetails] = useState(false);
    const [isResuming, setIsResuming] = useState(false);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [role, setRole] = useState<'admin' | 'editor' | null>(null);
    const [isRefiningSelection, setIsRefiningSelection] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [humanizationError, setHumanizationError] = useState(false);
    const [hasResumeDraft, setHasResumeDraft] = useState(false);
    const [infographicFeedback, setInfographicFeedback] = useState('');
    const [isInfographicRefining, setIsInfographicRefining] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([LOCKED_CATEGORY_ID]);

    // --- HELPER FUNCTIONS ---

    const resetEditorState = useCallback(() => {
        setPrompt('');
        setKeywords([]);
        setKeywordInput('');
        setPrimaryKeyword(null);
        setDescription('');
        setPreview(null);
        setInfographicUrl(null);
        setSelectedCategories([LOCKED_CATEGORY_ID]);
    }, []);

    const fetchUserRole = useCallback(async (userId: string) => {
        try {
            console.log('🔍 Fetching role for user from Firestore:', userId);
            const docRef = doc(db, 'user_profiles', userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('✅ Role Found:', data.role);
                setRole(data.role as 'admin' | 'editor');
            } else {
                console.warn('⚠️ No role data returned for user in user_profiles');
                setRole('editor');
            }
        } catch (err) { 
            console.error('💥 Critical Error in fetchUserRole:', err); 
        }
    }, []);

    const fetchSitemap = useCallback(async () => {
        try {
            const data = await apiFetchSitemap();
            setSitemapData(data.keywordMap || {});
            setAnchorMap(data.anchorMap || {});
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
        await signOut(auth);
        resetEditorState();
        setActiveTab('create');
    };

    // --- TEXT PROCESSING HELPERS ---
    
    const cleanAiHtml = useCallback((html: string) => {
        if (!html) return '';
        // 1. Strip markdown backtick wrappers
        let clean = html.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
        
        // 2. Convert markdown bullet points (*) to <li> items if not already in <ul>
        // This handles "Clean Formatting" requirement
        if (clean.includes('\n* ')) {
             clean = clean.split('\n').map(line => {
                if (line.trim().startsWith('* ')) {
                    return `<li>${line.trim().substring(2)}</li>`;
                }
                return line;
            }).join('\n');
            // Wrap contiguous <li> blocks in <ul>
            clean = clean.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
        }

        // 3. Convert markdown bold/italics (limited) if AI ignored instructions
        clean = clean.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        clean = clean.replace(/\*(.*?)\*/g, '<i>$1</i>');

        // 4. SANITIZE ENCODING: Fix "Smart Characters" that cause  errors
        clean = clean.replace(/[\u2013\u2014]/g, '-') // en-dash and em-dash
                     .replace(/[\u2018\u2019]/g, "'") // smart single quotes
                     .replace(/[\u201C\u201D]/g, '"'); // smart double quotes

        return clean;
    }, []);

    const applySitemapLinks = useCallback(async (html: string) => {
        if (!html) return html;

        const totalWords = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        // Elite Link Density: 1 per 80 words with a FLOOR of 10 links for high-quality technical posts
        const maxLinksLimit = Math.max(10, Math.ceil(totalWords / 80)); 
        let currentLinkCount = 0;
        let globalWordCounter = 0;
        let lastLinkWordIndex = -100; // Start with a safe buffer

        const phraseLookup: Record<string, string> = { ...sitemapData };
        for (const [url, anchors] of Object.entries(anchorMap)) {
            for (const anchor of anchors) if (anchor) phraseLookup[anchor.toLowerCase()] = url;
        }

        if (Object.keys(phraseLookup).length === 0) return html;

        // Prioritize technical phrases by length and depth
        const sortedKeywords = Object.keys(phraseLookup)
            .filter(phrase => phrase.length >= 3 && !/^(is|are|the|how|can|it|we)\s/i.test(phrase))
            .sort((a, b) => b.length - a.length);

        const paragraphs = html.split(/<\/p>/i);
        const usedAnchors = new Set<string>();
        const processedParagraphs: string[] = [];

        // ELITE PRE-CHECK: Scan for existing AI-generated links to avoid double-wrapping
        const existingLinks = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
        for (const match of existingLinks) {
            usedAnchors.add(match[2].toLowerCase().trim());
            currentLinkCount++;
            // Estimate position for existing links if possible, or just treat as word 0
        }

        // STRICT SEQUENTIAL PROCESSING to prevent clumping
        for (let paragraph of paragraphs) {
            const wordCountInPara = paragraph.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
            
            if (!paragraph.trim() || currentLinkCount >= maxLinksLimit) {
                processedParagraphs.push(paragraph);
                globalWordCounter += wordCountInPara;
                continue;
            }

            let paragraphLinked = false;

            // 100-WORD COOL-DOWN: Only try linking if enough distance has passed
            if (globalWordCounter - lastLinkWordIndex >= 100) {
                // Tier 1: Semantic Intent Matching (Primary)
                const candidatesInPara = sortedKeywords.filter(k => {
                    if (usedAnchors.has(k.toLowerCase())) return false; // Skip already linked anchors
                    const regex = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                    return regex.test(paragraph);
                }).slice(0, 5);

                if (candidatesInPara.length > 0) {
                    try {
                        const resp = await fetch('/api/internal-links/contextualize', {
                            method: 'POST',
                            body: JSON.stringify({ paragraph: paragraph.replace(/<[^>]+>/g, ' '), candidates: candidatesInPara })
                        });
                        const data = await resp.json();
                        
                        if (data.match) {
                            let targetUrl = data.match.url;
                            
                            // ELITE: Ensure Absolute URLs to prevent "App Opening" issues
                            if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
                                targetUrl = `https://10xds.com${targetUrl}`;
                            } else if (!targetUrl.startsWith('http')) {
                                targetUrl = `https://10xds.com/${targetUrl}`;
                            }

                            const matchText = candidatesInPara.find(c => paragraph.toLowerCase().includes(c.toLowerCase()));
                            if (matchText && !usedAnchors.has(matchText.toLowerCase())) {
                                const escapedMatch = matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const regex = new RegExp(`(?<!<[^>]*)\\b(${escapedMatch})\\b(?![^<]*>)`, 'i');
                                paragraph = paragraph.replace(regex, `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="sitemap-link underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-600 transition-all font-medium">$1</a>`);
                                usedAnchors.add(matchText.toLowerCase());
                                currentLinkCount++;
                                lastLinkWordIndex = globalWordCounter;
                                paragraphLinked = true;
                            }
                        }
                    } catch (e) {
                        console.warn("Semantic matching failed, falling back to Tier 2...");
                    }
                }

                // Tier 2: Legacy Fallback (if Tier 1 didn't link)
                if (!paragraphLinked && currentLinkCount < maxLinksLimit) {
                    for (const phrase of sortedKeywords) {
                        const targetUrl = phraseLookup[phrase.toLowerCase()];
                        if (usedAnchors.has(phrase.toLowerCase()) || currentLinkCount >= maxLinksLimit) continue;

                        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(?<!<[^>]*)\\b(${escapedPhrase})\\b(?![^<]*>)`, 'i');
                        if (regex.test(paragraph)) {
                            paragraph = paragraph.replace(regex, `<a href="${targetUrl}" target="_blank" class="sitemap-link underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-600 transition-all font-medium">$1</a>`);
                            usedAnchors.add(phrase.toLowerCase());
                            currentLinkCount++;
                            lastLinkWordIndex = globalWordCounter;
                            paragraphLinked = true;
                            break; 
                        }
                    }
                }
            }

            processedParagraphs.push(paragraph);
            globalWordCounter += wordCountInPara;
        }

        return processedParagraphs.join('</p>');
    }, [sitemapData, anchorMap]);

    const processKeywordsInContent = useCallback((html: string, allKeywords: string[], primary: string | null): string => {
        if (!html || allKeywords.length === 0) return html;
        let processedHtml = html;
        
        // Elite Unique Highlighting: Only highlight the FIRST instance of each keyword
        const sortedKws = [...allKeywords].sort((a, b) => b.length - a.length);
        const usedKws = new Set<string>();

        const parts = processedHtml.split(/(<[^>]+>)/g);
        return parts.map(part => {
            if (part.startsWith('<')) return part;
            
            let text = part;
            for (const kw of sortedKws) {
                if (!kw.trim() || usedKws.has(kw.toLowerCase())) continue;
                
                const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(?<!<[^>]*)\\b(${escapedKw})\\b(?![^<]*>)`, 'i');
                
                if (regex.test(text)) {
                    text = text.replace(regex, '<span style="color: #666666; font-weight: 500;">$1</span>');
                    usedKws.add(kw.toLowerCase());
                }
            }
            return text;
        }).join('');
    }, []);

    const sanitizeMetaDescription = useCallback((text: string, primary: string | null): string => {
        if (!text) return '';
        let cleaned = text.replace(/[\n\r]/g, '').replace(/\*/g, '').trim();

        if (cleaned.length > 160) {
            const trimmed = cleaned.slice(0, 160);
            const lastSpace = trimmed.lastIndexOf(' ');
            cleaned = lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
            cleaned = cleaned.trim();
        }

        if (primary && !cleaned.toLowerCase().includes(primary.toLowerCase())) {
            const withKeyword = `${primary}: ${cleaned}`;
            if (withKeyword.length <= 160) {
                cleaned = withKeyword;
            } else {
                const prefix = `${primary}: `;
                const remaining = cleaned.slice(0, 160 - prefix.length);
                const lastSpace = remaining.lastIndexOf(' ');
                cleaned = prefix + (lastSpace > 0 ? remaining.slice(0, lastSpace) : remaining);
                cleaned = cleaned.trim();
            }
        }
        return cleaned;
    }, []);

    // --- EFFECTS ---

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                fetchUserRole(firebaseUser.uid);
                fetchHistory();
                fetchSitemap();
                fetchDrafts();
            } else {
                setRole(null);
            }
        });

        return () => unsubscribe();
    }, [fetchUserRole, fetchHistory, fetchSitemap, fetchDrafts]);

    const checkForResumeDraft = useCallback(async () => {
        if (!user) {
            setHasResumeDraft(false);
            return;
        }
        try {
            const draft = await api.fetchLastInProgressDraft(user.uid);
            setHasResumeDraft(!!draft);
        } catch (err) {
            console.error("Check Resume Status Error:", err);
            setHasResumeDraft(false);
        }
    }, [user, api]);

    useEffect(() => {
        if (user) {
            checkForResumeDraft();
        }
    }, [user, checkForResumeDraft]);

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
            
            // Handle categories persistence
            const cats = selectedReviewDraft.categories;
            if (Array.isArray(cats)) {
                // Ensure Blog is always included even if missing from DB for legacy posts
                const uniqueCats = Array.from(new Set([...cats.map(Number), LOCKED_CATEGORY_ID]));
                setSelectedCategories(uniqueCats);
            } else {
                setSelectedCategories([LOCKED_CATEGORY_ID]);
            }
        }
    }, [selectedReviewDraft]);

    useEffect(() => {
        if (selectedHistoryItem) {
            setPrompt(selectedHistoryItem.prompt || '');
            const kw = selectedHistoryItem.keywords;
            if (Array.isArray(kw)) setKeywords(kw);
            else if (typeof kw === 'string' && kw.trim()) setKeywords(kw.split(',').map(s => s.trim()).filter(Boolean));
            else setKeywords([]);
            setDescription(selectedHistoryItem.metaDesc || '');
            setInfographicUrl(selectedHistoryItem.infographicUrl || null);
            setPrimaryKeyword(selectedHistoryItem.primaryKeyword || null);

            // Handle categories persistence
            const cats = selectedHistoryItem.categories;
            if (Array.isArray(cats)) {
                const uniqueCats = Array.from(new Set([...cats.map(Number), LOCKED_CATEGORY_ID]));
                setSelectedCategories(uniqueCats);
            } else {
                setSelectedCategories([LOCKED_CATEGORY_ID]);
            }
        }
    }, [selectedHistoryItem]);

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
                { prompt, keywords: keywords.join(', '), primaryKeyword },
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
            const finalMeta = sanitizeMetaDescription(metaMatch ? metaMatch[1].trim() : "", primaryKeyword);
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
            finalContent = await applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);

            setPreview({ title: finalTitle, meta: finalMeta, content: finalContent, imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80' });
            if (finalMeta) setDescription(finalMeta);

            setHumanizationError(false);
            
            // --- STAGE 2: Automated Humanization Pass ---
            try {
                const rawHumanized = await api.humanizeContent(
                    { content: finalContent, title: finalTitle },
                    (chunk: string) => {
                        setPreview((prev: any) => ({
                            ...prev,
                            content: (prev?.content || '') + chunk
                        }));
                    }
                );
                
                const cleanHumanized = cleanAiHtml(rawHumanized);
                setPreview((prev: any) => ({ ...prev, content: cleanHumanized, isHumanized: true }));

                // --- STAGE 3: Image Generation & Final Humanized Sync ---
                const finalImgUrl = await api.generateFeaturedImage({ prompt, title: finalTitle });
                if (finalImgUrl) setPreview((prev: any) => ({ ...prev, imageUrl: finalImgUrl }));

                // --- STAGE 4: Auto-Save for Resumption (Draft Buffer) ---
                try {
                    await api.saveDraft({
                        title: finalTitle,
                        content: cleanHumanized,
                        rawContent: finalContent, // ELITE: Save the original AI facts
                        metaDesc: finalMeta,
                        imageUrl: finalImgUrl || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80',
                        prompt,
                        keywords,
                        primaryKeyword,
                        createdBy: user?.uid || 'anonymous',
                        authorEmail: user?.email || '',
                        status: 'in_progress',
                        isHumanized: true,
                        humanizationStatus: 'success',
                        categories: selectedCategories
                    });
                } catch (saveErr) {
                    console.warn("Auto-save failed:", saveErr);
                }
            } catch (humanizeErr) {
                console.error("Humanization failed:", humanizeErr);
                setHumanizationError(true);
                // Fallback: Save as in_progress but with failed status so editor can retry
                try {
                    await api.saveDraft({
                        title: finalTitle,
                        content: finalContent, // Fallback to raw
                        rawContent: finalContent,
                        metaDesc: finalMeta,
                        imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80',
                        prompt,
                        keywords,
                        primaryKeyword,
                        createdBy: user?.uid || 'anonymous',
                        authorEmail: user?.email || '',
                        status: 'in_progress',
                        isHumanized: false,
                        humanizationStatus: 'failed',
                        categories: selectedCategories
                    });
                } catch (saveErr) { console.warn("Fallback auto-save failed"); }
            }
        } catch (e: any) { setError(e.message); }
    };

    const handleRetryHumanization = async () => {
        if (!preview || !preview.content) return;
        setHumanizationError(false);
        setError(null);
        
        try {
            const rawHumanized = await api.humanizeContent(
                { content: preview.content, title: preview.title },
                (chunk: string) => {
                    setPreview((prev: any) => ({
                        ...prev,
                        content: (prev?.content || '') + chunk
                    }));
                }
            );
            
            const cleanHumanized = cleanAiHtml(rawHumanized);
            const finalImgUrl = await api.generateFeaturedImage({ prompt, title: preview.title });
            
            setPreview((prev: any) => ({ 
                ...prev, 
                content: cleanHumanized, 
                imageUrl: finalImgUrl || prev?.imageUrl,
                isHumanized: true 
            }));

            // Sync update to the draft
            try {
                // Find the existing draft for this prompt/user to update
                const drafts = await api.fetchDrafts();
                const latest = drafts.find((d: any) => d.prompt === prompt && d.status === 'in_progress');
                if (latest) {
                    await api.updateDraft({
                        id: latest.id,
                        action: 'edit',
                        updateData: {
                            content: cleanHumanized,
                            isHumanized: true,
                            humanizationStatus: 'success',
                            imageUrl: finalImgUrl || latest.imageUrl,
                            categories: latest.categories || selectedCategories
                        }
                    });
                }
            } catch (saveErr) { console.warn("Retry sync failed", saveErr); }
            
        } catch (err) {
            console.error("Retry humanization failed:", err);
            setHumanizationError(true);
            setError("Tone refinement failed again. You can continue with the current version or try once more.");
        }
    };

    const handleGenerateDescription = async () => {
        if (!prompt.trim()) return;
        if (!primaryKeyword) {
            setError("Please select a primary keyword before refining the description.");
            return;
        }
        setError(null);
        try {
            const d = await api.generateDescription({ prompt, keywords: keywords.join(', '), primaryKeyword });
            setDescription(d);
        } catch (e: any) { setError(e.message); }
    };

    const handleApplyFeedback = async () => {
        if (!primaryKeyword) {
            setError("Please select a primary keyword before refining the post.");
            return;
        }
        const currentImageUrl = preview?.imageUrl;
        setError(null); setPreview(null);
        try {
            const fullRawText = await api.generateContent(
                { prompt: preview?.title || prompt, keywords: keywords.join(', '), primaryKeyword, feedback },
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
            const finalMeta = sanitizeMetaDescription(metaMatch ? metaMatch[1].trim() : (preview?.meta || ""), primaryKeyword);
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;
            finalContent = await applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);
            setPreview({ title: finalTitle, meta: finalMeta, content: finalContent, imageUrl: currentImageUrl || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80' });
            setDescription(finalMeta); setFeedback('');
            const imgUrl = await api.generateFeaturedImage({ prompt: finalTitle, title: finalTitle });
            if (imgUrl) setPreview((prev: any) => ({ ...prev, imageUrl: imgUrl }));
        } catch (e: any) { setError(e.message); }
    };

    const handleApplyReviewFeedback = async () => {
        if (!selectedReviewDraft || !feedback) return;
        if (!primaryKeyword) {
            setError("Please select a primary keyword before refining the review.");
            return;
        }
        setError(null);
        try {
            const fullRawText = await api.generateContent({ prompt: selectedReviewDraft.title, keywords: keywords.join(', '), primaryKeyword, feedback }, () => { });
            const titleMatch = fullRawText.match(/<title>([\s\S]*?)<\/title>/i);
            const metaMatch = fullRawText.match(/<meta>([\s\S]*?)<\/meta>/i);
            const contentMatch = fullRawText.match(/<content>([\s\S]*?)<\/content>/i);
            const finalTitle = titleMatch ? titleMatch[1].trim() : (selectedReviewDraft?.title || prompt);
            const finalMeta = sanitizeMetaDescription(metaMatch ? metaMatch[1].trim() : (selectedReviewDraft?.metaDesc || ""), primaryKeyword);
            let finalContent = contentMatch ? contentMatch[1].trim() : fullRawText;
            finalContent = await applySitemapLinks(finalContent);
            finalContent = processKeywordsInContent(finalContent, keywords, primaryKeyword);
            const updateData = { title: finalTitle, content: finalContent, metaDesc: finalMeta };
            await api.updateDraft({ id: selectedReviewDraft.id, action: 'edit', updateData });
            setSelectedReviewDraft({ ...selectedReviewDraft, ...updateData });
            setFeedback('');
        } catch (e: any) { setError(e.message); }
    };

    const handleSaveManualEdits = async (updatedDraft?: any) => {
        const target = updatedDraft || selectedReviewDraft;
        if (!target) return;
        setError(null);
        try {
            await api.updateDraft({ 
                id: target.id, 
                action: 'edit', 
                updateData: { title: target.title, content: target.content } 
            });
            fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleSaveDraft = async () => {
        if (!preview) return;
        setError(null);
        try {
            await api.saveDraft({ 
                title: preview.title, 
                content: preview.content, 
                metaDesc: description || preview.meta, 
                imageUrl: preview.imageUrl, 
                infographicUrl: infographicUrl, 
                prompt: prompt, 
                keywords: keywords, 
                authorEmail: user?.email || '', 
                createdBy: user?.uid || '',
                status: 'review',
                isHumanized: !!preview.isHumanized,
                categories: selectedCategories
            });
            await fetchDrafts(); // Await the fetch to ensure list is ready
            resetEditorState(); 
            setActiveTab('review'); 
            checkForResumeDraft(); // Sync Resume button
        } catch (e: any) { setError(e.message); }
    };

    const handleRejectDraft = async (id: string) => {
        setError(null);
        try {
            await api.updateDraft({ id, action: 'reject' });
            setSelectedReviewDraft(null); fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleMarkAsReviewed = async (id: string) => {
        if (!user) return;
        setError(null);
        try {
            const updatedDraft = await api.markAsReviewed(id, user.email || user.uid);
            if (updatedDraft && selectedReviewDraft?.id === id) {
                setSelectedReviewDraft(updatedDraft);
            }
            fetchDrafts();
        } catch (e: any) { setError(e.message); }
    };

    const handleApproveDraft = async (draft: any) => {
        if (!user) return;
        setError(null);
        try {
            const rawCategories = selectedCategories.length > 0 ? selectedCategories : (draft.categories || [LOCKED_CATEGORY_ID]);
            const finalCategories = [LOCKED_CATEGORY_ID, ...rawCategories.filter((id: number) => Number(id) !== LOCKED_CATEGORY_ID)];

            const pubData = await api.publishToWordPress({ 
                id: draft.id, 
                title: draft.title, 
                content: draft.content, 
                metaDesc: draft.metaDesc, 
                imageUrl: draft.imageUrl, 
                infographicUrl: draft.infographicUrl, 
                slug: draft.title.toLowerCase().split(' ').join('-').replace(/[^\w-]/g, ''),
                categories: finalCategories
            });
            
            const publishedBy = {
                email: user.email || user.uid,
                timestamp: new Date().toISOString()
            };

            await api.updateDraft({ 
                id: draft.id, 
                action: 'publish', 
                wpUrl: pubData.url,
                publishedBy
            });

            // ✅ Elite Publish Toast Notification
            const toast = document.createElement('div');
            toast.setAttribute('role', 'status');
            toast.style.cssText = `
                position:fixed; bottom:32px; right:32px; z-index:99999;
                display:flex; align-items:center; gap:12px;
                background:#fff; border:1px solid #d1fae5;
                box-shadow:0 8px 40px rgba(0,0,0,0.12);
                padding:16px 24px; min-width:320px;
                animation:fadeIn 0.3s ease;
            `;
            toast.innerHTML = `
                <div style="width:36px;height:36px;background:#059669;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style="flex:1;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#064e3b;">Post Published</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;">${draft.title}</p>
                </div>
                ${pubData.url ? `<a href="${pubData.url}" target="_blank" rel="noopener noreferrer" style="font-size:10px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;white-space:nowrap;">View →</a>` : ''}
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);

            setSelectedReviewDraft(null); fetchDrafts(); fetchHistory(); setActiveTab('history');
        } catch (e: any) { setError(e.message); }
    };

    const handleGenerateInfographic = async (refinement?: string) => {
        const target = preview || selectedReviewDraft;
        if (!target) return;
        
        if (refinement) setIsInfographicRefining(true);
        else api.setIsGeneratingInfographic(true); 
        
        setError(null);
        try {
            const url = await api.generateInfographic({ 
                content: target.content, 
                title: target.title,
                refinement: refinement || ''
            });
            if (url) {
                setInfographicUrl(url);
                setPreview((prev: any) => prev ? { ...prev, infographicUrl: url } : prev);
                
                // Persistence: Sync to database immediately
                if (selectedReviewDraft?.id) {
                    await api.updateDraft({ id: selectedReviewDraft.id, action: 'edit', updateData: { infographic_url: url, infographicUrl: url } });
                    setSelectedReviewDraft((prev: any) => ({ ...prev, infographicUrl: url }));
                } else if (preview && user) {
                    const drafts = await api.fetchDrafts();
                    const latest = drafts.find((d: any) => d.status === 'in_progress' && d.createdBy === user.uid);
                    if (latest) {
                        await api.updateDraft({ id: latest.id, action: 'edit', updateData: { infographic_url: url, infographicUrl: url } });
                    }
                }
                setInfographicFeedback('');
                setIsInfographicRefining(false);
            }
        } catch (e: any) { 
            setError(e.message); 
        } finally { 
            api.setIsGeneratingInfographic(false);
            setIsInfographicRefining(false);
        }
    };

    const handleResumeDraft = async () => {
        if (!user) return;
        setIsResuming(true); setError(null);
        try {
            const draft = await api.fetchLastInProgressDraft(user.uid);
            if (draft) {
                setPreview({ title: draft.title, content: draft.content, imageUrl: draft.imageUrl, infographicUrl: draft.infographicUrl });
                setPrompt(draft.prompt || ''); setDescription(draft.metaDesc || '');
                if (Array.isArray(draft.keywords)) setKeywords(draft.keywords);
                else if (typeof draft.keywords === 'string') setKeywords(draft.keywords.split(',').map((k: string) => k.trim()).filter(Boolean));
                setInfographicUrl(draft.infographicUrl || null); setActiveTab('create');
                
                // Load categories
                const cats = draft.categories;
                if (Array.isArray(cats)) {
                    const uniqueCats = Array.from(new Set([...cats.map(Number), LOCKED_CATEGORY_ID]));
                    setSelectedCategories(uniqueCats);
                } else {
                    setSelectedCategories([LOCKED_CATEGORY_ID]);
                }
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
    
    const handleFetchUsers = async () => {
        const u = await api.fetchUsers();
        setUsers(u);
    };

    const handleFetchReport = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            const r = await fetch('/api/admin/report', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await r.json();
            setReportData(d.report || []);
        } catch (e) { console.error('Fetch Report Error:', e); }
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        const success = await api.updateUserRole(userId, newRole);
        if (success) {
            // Refresh local list
            await handleFetchUsers();
            if (userId === user?.uid) {
                // If I updated my own role (e.g. for testing), we should refresh the whole app or logout
                // For safety, let's just log it or refresh
                console.log("Self role updated");
            }
        } else {
            setError("Failed to update user role.");
        }
    };

    const handleAddUser = async (email: string, role: string) => {
        const success = await api.addUser(email, role);
        if (success) {
            await handleFetchUsers();
            return true;
        } else {
            setError("Failed to add new user. They may already exist.");
            return false;
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const success = await api.deleteUser(userId);
        if (success) {
            await handleFetchUsers();
            return true;
        } else {
            setError("Failed to delete user.");
            return false;
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

    const handleSelectHistoryItem = async (item: any) => {
        if (!item) {
            setSelectedHistoryItem(null);
            return;
        }
        
        setIsFetchingDraftDetails(true);
        try {
            const docRef = doc(db, 'blog_posts', item.id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const draft = { id: docSnap.id, ...docSnap.data() };
                setSelectedHistoryItem(draft);
            } else {
                setSelectedHistoryItem(item);
            }
        } catch (e) {
            console.error("Failed to fetch history details:", e);
            setSelectedHistoryItem(item);
        } finally {
            setIsFetchingDraftDetails(false);
        }
    };

    const value = {
        prompt, setPrompt, keywordInput, setKeywordInput, keywords, setKeywords, feedback, setFeedback, description, setDescription, activeTab, setActiveTab, preview, setPreview, reviewDrafts, isFetchingDrafts: api.isFetchingDrafts, selectedReviewDraft, setSelectedReviewDraft, history, selectedHistoryItem, setSelectedHistoryItem, handleSelectHistoryItem, error, setError, isGenerating: api.isGenerating, isHumanizing: api.isHumanizing, isApplyingFeedback: api.isApplyingFeedback, isGeneratingDescription: api.isGeneratingDescription, isGeneratingInfographic: api.isGeneratingInfographic, infographicUrl, setInfographicUrl, infographicFeedback, setInfographicFeedback, isInfographicRefining, isSavingDraft: api.isSavingDraft, isRejecting: api.isRejecting, isSavingManual: api.isSavingManual, isSavingReview: api.isSavingReview, isPublished: api.isPublished, isFetchingKeywords: api.isFetchingKeywords, isFetchingUsers: api.isFetchingUsers, isUpdatingRole: api.isUpdatingRole, users, handleFetchUsers, isTeamManagementOpen, setIsTeamManagementOpen, isPerformanceOpen, setIsPerformanceOpen, handleUpdateUserRole, handleAddUser, handleDeleteUser, handleAddKeyword, removeKeyword, handleFetchKeywords, handleClearForm, handleGenerate, handleGenerateDescription, handleApplyFeedback, handleApplyReviewFeedback, handleSaveManualEdits, handleSaveDraft, handleRejectDraft, handleMarkAsReviewed, handleApproveDraft, handleGenerateInfographic, fetchDrafts, handleSelectReviewDraft, isFetchingDraftDetails, handleResumeDraft, isResuming, upsertPost: api.upsertPost, primaryKeyword, setPrimaryKeyword, resetEditorState, user, role, handleLogout, isRefiningSelection: api.isRefiningSelection, handleRefineSelection, reportData, handleFetchReport, isPreviewOpen, setIsPreviewOpen, humanizationError, setHumanizationError, handleRetryHumanization, hasResumeDraft, checkForResumeDraft, selectedCategories, setSelectedCategories
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) throw new Error('useDashboard must be used within a DashboardProvider');
    return context;
};
