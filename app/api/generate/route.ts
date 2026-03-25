import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, feedback } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    const aiPrompt = `
        You are an expert SEO copywriter. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        ${feedback ? `\nReference this feedback for refinement: ${feedback}` : ""}

        STRICT REQUIREMENTS:
        1. BLOG TITLE (Meta Title): 50-60 characters.
        2. META DESCRIPTION: 150-160 characters.
        3. BLOG CONTENT: 1500 to 2000 words.
        4. Use <h2> and <h3> for headings. No markdown (#).

        FORMATTING REQUIREMENT:
        Wrap output in <title>, <meta>, and <content> tags.
      `;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-pro:streamGenerateContent`;

    const response = await client.request({
      url,
      method: 'POST',
      responseType: 'stream',
      data: {
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }
    });

    const stream = new ReadableStream({
      async start(controller) {
        const responseStream = response.data as any;

        responseStream.on('data', (chunk: any) => {
          const chunkString = chunk.toString();
          // Extract text from Vertex AI stream chunks using a robust regex
          const matches = chunkString.match(/"text":\s*"([\s\S]*?)"/g);

          if (matches) {
            matches.forEach((match: string) => {
              // 1. Extract the raw text part
              let textContent = match.replace(/^"text":\s*"/, '').replace(/"$/, '');

              // 2. Surgical unescape for common JSON/Unicode sequences
              // This is more resilient against fragmented chunks than JSON.parse
              textContent = textContent
                .replace(/\\u([a-fA-F0-9]{4})/g, (_, grp) => String.fromCharCode(parseInt(grp, 16)))
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

              controller.enqueue(new TextEncoder().encode(textContent));
            });
          }
        });

        responseStream.on('end', () => controller.close());
        responseStream.on('error', (err: any) => controller.error(err));
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
