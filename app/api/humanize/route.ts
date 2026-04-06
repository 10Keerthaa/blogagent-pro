import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    const humanizePrompt = `
        You are a Human Tone Specialist. Your goal is to "humanize" the following AI-generated blog post content.
        
        Original Title: ${title || "Untitled Post"}
        
        STRICT OBJECTIVES:
        1. Authoritative Executive Voice: Write with confidence and expertise. Avoid excessive rhetorical questions or "chatty" transitions.
        2. Remove "AI-isms": Eliminate words like "Furthermore," "Moreover," "In the realm of," "It is important to note," and generic "In conclusion" summaries.
        3. Vary Sentence Structure: Use "Burstiness" (mix short, authoritative sentences with longer, descriptive ones).
        4. Structured Documentation: PRESERVE and ENFORCE the use of <ul> and <li> tags for Features, Benefits, and Use Case sections. Do NOT merge them into paragraphs.
        5. Preserve SEO: Keep all core facts and primary keywords intact within the elite professional narrative.
        6. Maintain HTML Structure: Return the exact same HTML tags (<h2>, <p>, <a>, etc.) as the input. 
        7. NO Markdown: Use ONLY valid HTML. Do NOT use markdown artifacts like backticks (\`\`\`), asterisks (*), or bold (**) for emphasis. Use <i> or <b> if needed.

        CONTENT TO HUMANIZE:
        ---
        ${content}
        ---

        REFINED HUMANIZED VERSION (HTML ONLY):
      `;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:streamGenerateContent`;

    const response = await client.request({
      url,
      method: 'POST',
      responseType: 'stream',
      data: {
        contents: [{ role: "user", parts: [{ text: humanizePrompt }] }],
        generationConfig: {
          temperature: 0.85, 
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }
    });

    const stream = new ReadableStream({
      async start(controller) {
        const responseStream = response.data as any;
        let buffer = '';

        responseStream.on('data', (chunk: any) => {
          buffer += chunk.toString();
          while (true) {
            const pattern = '"text": "';
            const startIndex = buffer.indexOf(pattern);
            if (startIndex === -1) break;
            const textValueStart = startIndex + pattern.length;
            let endIndex = -1;
            for (let i = textValueStart; i < buffer.length; i++) {
              if (buffer[i] === '"' && (i === 0 || buffer[i - 1] !== '\\')) {
                endIndex = i;
                break;
              }
            }
            if (endIndex !== -1) {
              let rawText = buffer.slice(textValueStart, endIndex);
              const decodedText = rawText
                .replace(/\\u([a-fA-F0-9]{4})/g, (_, grp) => String.fromCharCode(parseInt(grp, 16)))
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
              controller.enqueue(new TextEncoder().encode(decodedText));
              buffer = buffer.slice(endIndex + 1);
            } else {
              break;
            }
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
    console.error("Humanize API Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
