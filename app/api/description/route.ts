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
        TASK: Generate a single, highly compelling meta description for this blog post.
        Topic: ${prompt}
        Keywords: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}

        REQUIREMENTS:
        - Must be closely related to the Topic and Keywords.
        - MANDATORY LENGTH: EXACTLY between 150 and 160 characters. Count every character including spaces.
        - Include the Primary Keyword ("${primaryKeyword || ""}") EXACTLY at least once.
        - Return ONLY the description text. No quotes, no intro text, no labels.
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
