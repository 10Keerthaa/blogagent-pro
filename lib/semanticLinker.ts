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
    private confidenceThreshold = 0.85;

    async init() {
        const snapshot = await db.collection('page_knowledge').get();
        this.knowledge = snapshot.docs.map(doc => doc.data() as PageKnowledge);
    }

    /**
     * Tier 1: Semantic Intent Matching
     * Uses LLM to check if a paragraph's context justifies a specific technical link.
     */
    async matchContext(paragraph: string, anchorCandidates: string[]): Promise<{ url: string, confidence: number } | null> {
        if (this.knowledge.length === 0) await this.init();

        // Find potential pages based on anchor text overlap
        const potentialPages = this.knowledge.filter(k => 
            k.primary_anchors.some(a => anchorCandidates.some(c => c.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(c.toLowerCase())))
        );

        if (potentialPages.length === 0) return null;

        // Perform semantic check via LLM
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;

        const aiPrompt = `Objective: Semantic Intent Matching for Internal Linking.
        
        Paragraph Context: "${paragraph}"
        Candidate Anchors found in paragraph: ${anchorCandidates.join(', ')}
        
        Knowledge Repository (Candidate Pages):
        ${potentialPages.map((p, i) => `[ID: ${i}] URL: ${p.url} | Intent: ${p.intent} | Tech Level: ${p.tech_level}`).join('\n')}
        
        TASK:
        Determine if any of the candidate pages is a HIGH-CONFIDENCE semantic match for the anchors in the given context.
        
        RULES:
        1. "Confidence" score is 0.0 to 1.0. 
        2. "Conflict Resolution": If two pages are relevant, prioritize the one with the HIGHEST "Tech Level" (specific deep-dives over generic overviews).
        3. If no page is a strong match, return confidence 0.
        
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
}
