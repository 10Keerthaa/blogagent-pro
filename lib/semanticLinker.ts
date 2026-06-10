import { db } from './firebaseAdmin';
import { getGoogleAuth } from './googleAuth';

export interface PageKnowledge {
    url: string;
    intent: string;
    tech_level: number;
    primary_anchors: string[];
}

export class SemanticLinker {
    private knowledge: PageKnowledge[] = [];
    private confidenceThreshold = 0.95;

    async init(platform?: string) {
        const collectionName = platform === 'framer' ? 'page_knowledge_framer' : 'page_knowledge';
        const snapshot = await db.collection(collectionName).get();
        this.knowledge = snapshot.docs.map(doc => doc.data() as PageKnowledge);
    }

    setKnowledge(knowledge: PageKnowledge[]) {
        this.knowledge = knowledge;
    }

    /**
     * Tier 1: Semantic Intent Matching
     * Uses LLM to check if a paragraph's context justifies a specific technical link.
     */
    async matchContext(paragraph: string, anchorCandidates: string[], platform?: string): Promise<{ url: string, confidence: number } | null> {
        if (this.knowledge.length === 0) await this.init(platform);

        // Find potential pages based on anchor text overlap
        const potentialPages = this.knowledge.filter(k => 
            k.primary_anchors.some(a => anchorCandidates.some(c => c.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(c.toLowerCase())))
        );

        if (potentialPages.length === 0) return null;

        // Perform semantic check via LLM
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

        const aiPrompt = `Objective: Semantic Intent Matching for Internal Linking.
        
        Paragraph Context: "${paragraph}"
        Candidate Anchors found in paragraph: ${anchorCandidates.join(', ')}
        
        Knowledge Repository (Candidate Pages):
        ${potentialPages.map((p, i) => `[ID: ${i}] URL: ${p.url} | Intent: ${p.intent} | Tech Level: ${p.tech_level}`).join('\n')}
        
        TASK:
        Determine if any of the candidate pages is a VERY HIGH-CONFIDENCE semantic match for the anchors in the given context.
        
        RULES:
        1. "Confidence" score is 0.0 to 1.0. 
        2. "Strict Domain Match": Only approve links related to Technology, Business, or Industrial expertise. 
        3. "Relevance": Destination URL must point to content that "very closely" relates to the technical substance of the paragraph. 
        4. "Conflict Resolution": Prioritize pages with HIGHEST "Tech Level".
        5. If the match isn't surgical and specific, return confidence 0.
        
        RETURN JSON ONLY:
        { "matched_id": number | null, "confidence": number, "reasoning": "string" }`;

        try {
            const response = await client.request({
                url: endpoint,
                method: 'POST',
                data: {
                    contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
                    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
                }
            });
            const data = response.data as any;
            const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

            if (result.matched_id !== null && result.confidence >= this.confidenceThreshold) {
                const match = potentialPages[result.matched_id];
                return { url: match.url, confidence: result.confidence };
            }
        } catch (err) {
            console.error("Semantic Matching Error:", err);
        }

        return null;
    }

    /**
     * Tier 1 Batch: Semantic Intent Matching for Multiple Paragraphs
     */
    async matchContextBatch(requests: Array<{ id: string, paragraph: string, candidates: string[] }>, platform?: string): Promise<Record<string, { url: string, matchText: string }>> {
        if (this.knowledge.length === 0) await this.init(platform);

        const validRequests = requests.map(req => {
            const potentialPages = this.knowledge.filter(k => 
                k.primary_anchors.some(a => req.candidates.some(c => c.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(c.toLowerCase())))
            );
            return { ...req, potentialPages };
        }).filter(r => r.potentialPages.length > 0);

        if (validRequests.length === 0) return {};

        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

        const aiPrompt = `Objective: Semantic Intent Matching for Internal Linking in Batch.
        
        You are given multiple paragraphs. For each paragraph, select the SINGLE best candidate page to link to, based on high semantic relevance.
        
        RULES:
        1. "Strict Domain Match": Only approve links related to Technology, Business, or Industrial expertise.
        2. "Relevance": Destination URL must point to content that closely relates to the technical substance of the paragraph.
        3. "ONE-LINK RULE": A specific candidate phrase/url can only be used ONCE across all paragraphs. If you approve a candidate phrase for paragraph A, you cannot approve it for any other paragraph.
        4. "Confidence Threshold": Must be very high confidence. If no match, return null for that ID.
        
        REQUESTS:
        ${validRequests.map(r => `
        --- ID: ${r.id} ---
        Paragraph: "${r.paragraph}"
        Candidates: ${r.candidates.join(', ')}
        Candidate Pages:
        ${r.potentialPages.map((p, i) => `[URL: ${p.url}] | Intent: ${p.intent} | Anchors: ${p.primary_anchors.join(', ')}`).join('\n')}
        `).join('\n')}
        
        RETURN JSON ONLY mapping the request ID to the selected URL and the exact candidate phrase matched from the paragraph.
        Format:
        {
           "results": {
               "part_1": { "url": "https://...", "matchText": "Exact matched candidate phrase" },
               "part_3": null
           }
        }`;

        try {
            const response = await client.request({
                url: endpoint,
                method: 'POST',
                data: {
                    contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
                    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
                }
            });
            const data = response.data as any;
            const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            return result.results || {};
        } catch (err) {
            console.error("Batch Semantic Matching Error:", err);
            return {};
        }
    }
}
