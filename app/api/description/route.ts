import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleAuth";

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
    try {
        const { prompt, keywords } = await req.json();

        if (!prompt) {
            return NextResponse.json({ description: '' });
        }

        // Authenticate with Vertex AI
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);

        const client = await auth.getClient();
        const projectId = await auth.getProjectId();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:streamGenerateContent`;

        const aiPrompt = `You are an SEO copywriter. Generate a high-quality meta description for a blog post about: '${prompt}'.
    Keywords to include: ${keywords || "None"}
    
    RULES:
    1. CRITICAL RULE: Length MUST be strictly between 150 and 160 characters. Count every character including spaces. Do not fail this constraint.
    2. SEO Optimized: Include at least 2 keywords or closely related phrases.
    3. Return ONLY the description text. No quotes, no intro text, no labels.`;

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

        const cleanedDescription = responseText.replace(/[\n\r]/g, '').replace(/\*/g, '').trim();

        return NextResponse.json({ description: cleanedDescription });
    } catch (error: any) {
        console.error("Meta Description fetch failed:", error);
        return NextResponse.json({
            description: '',
            error: error.message
        }, { status: 200 });
    }
}
