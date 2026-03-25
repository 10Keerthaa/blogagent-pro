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
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent`;

    const aiPrompt = `You are a professional SEO analyst. A user is writing a blog post about: "${prompt}".

TASK: Generate EXACTLY 3 highly relevant SEO keyword phrases.
REQUIREMENTS:
- Each phrase MUST be 2 to 4 words long (No single words).
- Phrases must be directly related to the topic.
- Return ONLY a JSON array of 3 strings.

EXAMPLE: ["AI document processing", "enterprise automation solutions", "intelligent workflow optimization"]`;

    const response = await client.request({
      url,
      method: 'POST',
      data: {
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      }
    });

    const data = response.data as any;
    const responseText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    let phrases: string[] = [];
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) {
        phrases = parsed.slice(0, 3).map(p => String(p).trim());
      }
    } catch (e) {
      console.error("JSON Parse failed for keywords:", responseText);
      // Minimal fallback cleanup if JSON fails
      phrases = responseText.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).slice(0, 3);
    }

    console.log(`Keywords generated for "${prompt}":`, phrases);
    return NextResponse.json({ keywords: phrases.join(', ') });

  } catch (error: any) {
    console.error("Vertex AI Keyword fetch failed:", error);
    return NextResponse.json({ keywords: '', error: error.message }, { status: 200 });
  }
}
