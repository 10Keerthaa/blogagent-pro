import { NextResponse } from "next/server";
import { getGoogleAuth } from "@/lib/googleAuth";

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ keywords: '' });
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // Use standard generateContent (not streaming) for predictable parsing
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash-002:generateContent`;

    const aiPrompt = `You are a professional SEO analyst. A user is writing a blog post about: "${prompt}".

TASK: Generate EXACTLY 3 highly relevant SEO keyword phrases.
REQUIREMENTS:
- Each phrase MUST be 3 to 5 words long (No single words).
- Phrases must be directly related to "${prompt}".
- Return ONLY the 3 phrases separated by commas.
- NO numbering, NO bullets, NO quotes, NO introductory text.

GOOD EXAMPLE: AI document automation, enterprise workflow optimization, intelligent character recognition
BAD EXAMPLE: 1. AI, 2. Document, 3. Enterprise`;

    const response = await client.request({
      url,
      method: 'POST',
      data: {
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 128,
        }
      }
    });

    const data = response.data as any;
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Advanced Global Cleaning: Strip all numbering, dots, and bullets
    const cleanedArr = rawText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\d+\.\s*/g, ' ')  // remove "1." etc.
      .replace(/[-•]/g, ' ')     // remove bullets
      .split(/[,\n\r;|]/)         // Split by multiple possible delimiters
      .map((l: string) => l.trim().replace(/^"|"$/g, '')) // Remove quotes
      .filter(Boolean);

    // Extract up to 3 phrases
    const phrases = cleanedArr
      .filter((k: string) => k.length >= 2)
      .slice(0, 3);

    console.log(`Keywords generated for "${prompt}":`, phrases);
    return NextResponse.json({ keywords: phrases.join(', ') });

  } catch (error: any) {
    console.error("Vertex AI Keyword fetch failed:", error);
    return NextResponse.json({ keywords: '', error: error.message }, { status: 200 });
  }
}
