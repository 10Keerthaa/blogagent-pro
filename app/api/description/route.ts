import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleAuth";

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
    try {
        const { prompt, keywords, primaryKeyword } = await req.json();

        if (!prompt) {
            return NextResponse.json({ description: '' });
        }

        // Authenticate with Vertex AI
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);

        const client = await auth.getClient();
        const projectId = await auth.getProjectId();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-001:streamGenerateContent`;

        const aiPrompt = `
        TASK: Write a single meta description for a blog post.
        Topic: ${prompt}
        Primary Keyword (REQUIRED): ${primaryKeyword || "None"}
        Supporting Keywords: ${keywords || "None"}

        STRICT REQUIREMENTS — VIOLATING ANY OF THESE IS A FAILURE:
        1. Length: EXACTLY 155 characters (including spaces). This is a hard requirement.
        2. Primary Keyword: You MUST include the exact phrase "${primaryKeyword || ""}" naturally within the text.
        3. Informative: Reference at least 2 specific technical concepts, outcomes, or sub-topics drawn directly from the Topic and Supporting Keywords. Do NOT use vague phrases like "Discover how", "Learn everything", "Unlock the power of".
        4. Tone: Expert and declarative — state what the post covers, not that it exists.
        5. Return ONLY the plain description text. No quotes, no labels, no intro phrases, no markdown.
        `;

        const response = await client.request({
            url,
            method: 'POST',
            data: {
                contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                }
            }
        });

        const data = response.data as any;
        let responseText = '';

        if (Array.isArray(data)) {
            responseText = data.map(chunk => chunk.candidates[0].content.parts[0].text).join('');
        } else if (data.candidates && data.candidates[0].content.parts[0].text) {
            responseText = data.candidates[0].content.parts[0].text;
        }

        let cleanedDescription = responseText.replace(/[\n\r]/g, '').replace(/\*/g, '').trim();

        // ── Hard-enforce 155-character limit ──────────────────────────────────
        // If the AI returns more than 155 chars, trim at the last word boundary
        // that still fits within 155 characters.
        if (cleanedDescription.length > 155) {
            const trimmed = cleanedDescription.slice(0, 155);
            const lastSpace = trimmed.lastIndexOf(' ');
            cleanedDescription = lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
            cleanedDescription = cleanedDescription.trim();
        }

        // ── Enforce target 155-character length ─────────────────────────────
        // If the AI returns less than 150 chars, append a contextual filler using the topic.
        if (cleanedDescription.length < 150 && prompt) {
            const topicSnippet = prompt.length > 30 ? prompt.slice(0, 30).trim() : prompt;
            const filler = ` Explore key insights on ${topicSnippet}.`;
            const extended = (cleanedDescription + filler).slice(0, 155);
            const lastSpace = extended.lastIndexOf(' ');
            cleanedDescription = lastSpace > 0 ? extended.slice(0, lastSpace) : extended;
            cleanedDescription = cleanedDescription.trim();
        }

        // ── Ensure primary keyword is present after trimming ──────────────────
        // If the keyword was cut off, prepend it + a separator and re-trim to 155.
        if (primaryKeyword && !cleanedDescription.toLowerCase().includes(primaryKeyword.toLowerCase())) {
            const withKeyword = `${primaryKeyword}: ${cleanedDescription}`;
            if (withKeyword.length <= 155) {
                cleanedDescription = withKeyword;
            } else {
                // Re-trim the rest of the description so keyword + text = ≤ 155
                const prefix = `${primaryKeyword}: `;
                const remaining = cleanedDescription.slice(0, 155 - prefix.length);
                const lastSpace = remaining.lastIndexOf(' ');
                cleanedDescription = prefix + (lastSpace > 0 ? remaining.slice(0, lastSpace) : remaining);
                cleanedDescription = cleanedDescription.trim();
            }
        }

        return NextResponse.json({ description: cleanedDescription });
    } catch (error: any) {
        console.error("Meta Description fetch failed:", error);
        return NextResponse.json({
            description: '',
            error: error.message
        }, { status: 200 });
    }
}
