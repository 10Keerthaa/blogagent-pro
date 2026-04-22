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

        let bestDescription = '';
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const aiPrompt = `
            TASK: Write a single meta description for a blog post.
            Topic: ${prompt}
            Primary Keyword (REQUIRED): ${primaryKeyword || "None"}

            STRICT REQUIREMENTS — VIOLATING ANY OF THESE IS A FAILURE:
            1. Length: MUST be strictly between 150 and 160 characters long (including spaces). Not 149. Not 161.
            2. Primary Keyword: You MUST include the exact phrase "${primaryKeyword || ""}" naturally within the text.
            3. Informative: Reference specific technical concepts drawn directly from the Topic. Do NOT use vague phrases like "Discover how", "Learn everything".
            4. Tone: Expert and declarative — state what the post covers, not that it exists.
            5. Return ONLY the plain description text. No quotes, no labels, no intro phrases, no markdown.
            ${attempt > 1 ? `\n\nWARNING: Your previous attempt was rejected because it did not meet the 150-160 character limit. You must adjust your length to be EXACTLY between 150 and 160 characters.` : ''}
            `;

            const response = await client.request({
                url,
                method: 'POST',
                data: {
                    contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
                    generationConfig: {
                        temperature: 0.7 + (attempt * 0.1), // Slightly increase variance on retries
                        topP: 0.8,
                        topK: 40,
                    }
                }
            });

            const data = response.data as any;
            let responseText = '';

            if (Array.isArray(data)) {
                responseText = data.map((chunk: any) => chunk.candidates[0].content.parts[0].text).join('');
            } else if (data.candidates && data.candidates[0].content.parts[0].text) {
                responseText = data.candidates[0].content.parts[0].text;
            }

            let cleanedDescription = responseText.replace(/[\n\r]/g, '').replace(/\*/g, '').trim();
            bestDescription = cleanedDescription;

            const hasKeyword = !primaryKeyword || cleanedDescription.toLowerCase().includes(primaryKeyword.toLowerCase());
            const isValidLength = cleanedDescription.length >= 150 && cleanedDescription.length <= 160;

            if (isValidLength && hasKeyword) {
                break; // Success! Exit loop early.
            }
        }

        // ── Fallback if all retries fail ──────────────────────────────────
        // Only trim if it exceeds 160. Do NOT artificially pad if it's < 150 to preserve grammar.
        if (bestDescription.length > 160) {
            const trimmed = bestDescription.slice(0, 160);
            const lastSpace = trimmed.lastIndexOf(' ');
            bestDescription = lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
            bestDescription = bestDescription.trim();
        }

        // Ensure primary keyword is present safely
        if (primaryKeyword && !bestDescription.toLowerCase().includes(primaryKeyword.toLowerCase())) {
            const prefix = `${primaryKeyword}: `;
            if (bestDescription.length + prefix.length <= 160) {
                bestDescription = prefix + bestDescription;
            } else {
                const remaining = bestDescription.slice(0, 160 - prefix.length);
                const lastSpace = remaining.lastIndexOf(' ');
                bestDescription = prefix + (lastSpace > 0 ? remaining.slice(0, lastSpace) : remaining);
                bestDescription = bestDescription.trim();
            }
        }

        return NextResponse.json({ description: bestDescription });
    } catch (error: any) {
        console.error("Meta Description fetch failed:", error);
        return NextResponse.json({
            description: '',
            error: error.message
        }, { status: 200 });
    }
}
