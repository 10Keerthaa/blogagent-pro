'use client';

import { useState, useCallback } from 'react';
import { db, auth } from '../../lib/firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    getDoc, 
    doc, 
    addDoc, 
    updateDoc, 
    arrayUnion,
    orderBy, 
    limit, 
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

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
    const [isHumanizing, setIsHumanizing] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [isRefiningSelection, setIsRefiningSelection] = useState(false);

    const mapFirestoreToDraft = useCallback((docSnap: any) => {
        if (!docSnap || !docSnap.exists()) return null;
        const data = docSnap.data();
        return {
            id: docSnap.id,
            title: data.title,
            content: data.body || data.content,
            imageUrl: data.imageUrl || data.image_url,
            infographicUrl: data.infographicUrl || data.infographic_url || null,
            metaDesc: data.metaDesc || data.meta_desc || '',
            status: data.status,
            createdBy: data.created_by || data.createdBy,
            authorEmail: data.authorEmail || data.user_email || '',
            prompt: data.prompt || '',
            keywords: data.keywords || [],
            primaryKeyword: data.primaryKeyword || null,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            wpUrl: data.wpUrl || data.wp_url || null,
            auditLog: data.auditLog || data.audit_log || [],
            publishedBy: data.publishedBy || data.published_by || null
        };
    }, []);

    const fetchSitemap = useCallback(async () => {
        try {
            const r = await fetch('/api/sitemap-urls');
            const d = await r.json();
            return d.keywordMap || {};
        } catch { return {}; }
    }, []);

    const fetchAdminReport = useCallback(async () => {
        try {
            const user = auth.currentUser;
            if (!user) return [];
            const token = await user.getIdToken();
            const r = await fetch('/api/admin/report', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await r.json();
            return d.report || [];
        } catch { return []; }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const r = await fetch('/api/history');
            const d = await r.json();
            return d.history || [];
        } catch { return []; }
    }, []);

    const fetchUsers = useCallback(async () => {
        setIsFetchingUsers(true);
        try {
            const user = auth.currentUser;
            if (!user) return [];
            const token = await user.getIdToken();
            const r = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const d = await r.json();
            return d.users || [];
        } catch (e) {
            console.error('Fetch Users Error:', e);
            return [];
        } finally {
            setIsFetchingUsers(false);
        }
    }, []);

    const updateUserRole = useCallback(async (userId: string, newRole: string) => {
        setIsUpdatingRole(true);
        try {
            const user = auth.currentUser;
            if (!user) return false;
            const token = await user.getIdToken();
            const r = await fetch('/api/admin/users/update', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, newRole })
            });
            const d = await r.json();
            return d.success || false;
        } catch (e) {
            console.error('Update Role Error:', e);
            return false;
        } finally {
            setIsUpdatingRole(false);
        }
    }, []);

    const fetchDrafts = useCallback(async () => {
        setIsFetchingDrafts(true);
        try {
            const q = query(
                collection(db, 'blog_posts'), 
                where('status', '==', 'review'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => mapFirestoreToDraft(d));
        } catch (e) {
            console.error('Fetch Drafts Error:', e);
            return [];
        } finally {
            setIsFetchingDrafts(false);
        }
    }, [mapFirestoreToDraft]);

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

    const humanizeContent = useCallback(async (body: any, onChunk?: (chunk: string) => void) => {
        setIsHumanizing(true);
        try {
            const r = await fetch('/api/humanize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!r.ok) throw new Error('Humanization failed');

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
            setIsHumanizing(false);
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

    const refineSelection = useCallback(async (text: string, action: string, onChunk: (chunk: string) => void) => {
        setIsRefiningSelection(true);
        try {
            const r = await fetch('/api/refine-selection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action })
            });
            if (!r.ok) throw new Error("Refinement failed");
            const reader = r.body?.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;
                onChunk(decoder.decode(value));
            }
        } catch (e: any) { throw e; }
        finally {
            setIsRefiningSelection(false);
        }
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

    const saveDraft = useCallback(async (data: any) => {
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
        const { id, action, updateData, wpUrl, publishedBy } = body;
        if (action === 'reject') setIsRejecting(true);
        if (action === 'edit') setIsSavingManual(true);

        try {
            const docRef = doc(db, 'blog_posts', id);
            const payload: any = {
                last_edited_at: serverTimestamp()
            };

            if (action === 'reject') payload.status = 'rejected';
            if (action === 'publish') {
                payload.status = 'published';
                if (publishedBy) payload.publishedBy = publishedBy;
            }

            if (updateData?.title) payload.title = updateData.title;
            if (updateData?.content) payload.body = updateData.content;
            if (updateData?.metaDesc) payload.metaDesc = updateData.metaDesc;
            if (updateData?.infographicUrl) payload.infographicUrl = updateData.infographicUrl;
            if (wpUrl) payload.wpUrl = wpUrl;

            await updateDoc(docRef, payload);
            const updatedSnap = await getDoc(docRef);
            return mapFirestoreToDraft(updatedSnap);
        } catch (e) {
            console.error('Update Draft Error:', e);
            throw e;
        } finally {
            setIsRejecting(false);
            setIsSavingManual(false);
        }
    }, [mapFirestoreToDraft]);

    const markAsReviewed = useCallback(async (postId: string, userEmail: string) => {
        try {
            const docRef = doc(db, 'blog_posts', postId);
            await updateDoc(docRef, {
                auditLog: arrayUnion({
                    email: userEmail,
                    timestamp: new Date().toISOString(),
                    action: 'reviewed'
                })
            });
            const updatedSnap = await getDoc(docRef);
            return mapFirestoreToDraft(updatedSnap);
        } catch (e) {
            console.error('Mark As Reviewed Error:', e);
            throw e;
        }
    }, [mapFirestoreToDraft]);

    const fetchDraftById = useCallback(async (id: string) => {
        try {
            const docRef = doc(db, 'blog_posts', id);
            const docSnap = await getDoc(docRef);
            return mapFirestoreToDraft(docSnap);
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
            const payload: any = {
                title: data.title,
                body: data.content || data.body,
                status: data.status,
                created_by: data.created_by || data.createdBy,
                imageUrl: data.imageUrl || data.image_url,
                metaDesc: data.metaDesc || "",
                prompt: data.prompt || data.topic || "",
                keywords: data.keywords || [],
                primaryKeyword: data.primaryKeyword || null,
                infographicUrl: data.infographicUrl || data.infographic_url || null,
                wpUrl: data.wpUrl || data.wp_url || null,
                user_email: data.user_email || data.authorEmail || null,
                last_edited_at: serverTimestamp()
            };

            if (data.id) {
                const docRef = doc(db, 'blog_posts', data.id);
                await updateDoc(docRef, payload);
                const snap = await getDoc(docRef);
                return mapFirestoreToDraft(snap);
            } else {
                payload.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, 'blog_posts'), payload);
                const snap = await getDoc(docRef);
                return mapFirestoreToDraft(snap);
            }
        } finally {
            if (isReview) setIsSavingReview(false);
            else setIsSavingManual(false);
        }
    }, []);

    const fetchLastInProgressDraft = useCallback(async (userId: string) => {
        try {
            const q = query(
                collection(db, 'blog_posts'),
                where('created_by', '==', userId),
                where('status', '==', 'in_progress'),
                orderBy('last_edited_at', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return mapFirestoreToDraft(snapshot.docs[0]);
        } catch { return null; }
    }, [mapFirestoreToDraft]);

    return {
        isFetchingDrafts,
        isGenerating,
        isHumanizing,
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
        isFetchingUsers,
        isUpdatingRole,
        isRefiningSelection,
        fetchSitemap,
        fetchHistory,
        fetchDrafts,
        generateContent,
        humanizeContent,
        fetchUsers,
        updateUserRole,
        generateFeaturedImage,
        generateDescription,
        fetchKeywords,
        saveDraft,
        updateDraft,
        markAsReviewed,
        publishToWordPress,
        generateInfographic,
        fetchDraftById,
        upsertPost,
        fetchLastInProgressDraft,
        isFetchingDraftDetails,
        setIsFetchingDraftDetails,
        refineSelection,
        mapSupabaseToDraft: mapFirestoreToDraft // Alias for compatibility
    };
};
