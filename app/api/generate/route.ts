import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // --- NEW: URL Crawling Logic ---
    let learnedContext = "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = (feedback || prompt).match(urlRegex);

    if (urls && urls.length > 0) {
      try {
        const targetUrl = urls[0];
        const res = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) }); // 10s timeout
        if (res.ok) {
          const html = await res.text();
          // Lightweight HTML-to-Text extraction
          learnedContext = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 10000); // Limit to 10k chars for prompt safety
        }
      } catch (err) {
        console.error("URL Crawling Failed:", err);
      }
    }

    // Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    const aiPrompt = `
        You are an expert SEO copywriter. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.

        ${learnedContext ? `
        LEARNED CONTEXT FROM EXTERNAL URL:
        ---
        ${learnedContext}
        ---
        ` : ""}

        ${feedback ? `\nSMART REFINEMENT MODE: 
        Apply these changes SURGICALLY: ${feedback}. 
        ${learnedContext ? "INTELLIGENT INSERTION: Based on the LEARNED CONTEXT above, add a new professionally written section that incorporates these facts. Match the current post's tone and style perfectly." : ""}
        PRESERVE the rest of the existing article structure, headings, and detailed paragraphs exactly as they are. 
        DO NOT rewrite unrelated sections. If asked to add a heading, insert it naturally without deleting other content.` : ""}

        STRICT REQUIREMENTS:
        1. BLOG TITLE (Meta Title): 50-60 characters.
        2. META DESCRIPTION: STRICT ENFORCEMENT: Exactly 150-160 characters (including spaces). MUST include the primary keyword.
        3. BLOG CONTENT: 1500 to 2000 words.
        4. CLEAN FORMATTING (SCANNABLE BLOCKS): When listing benefits, use-cases, or steps, ALWAYS use standard Markdown bullet points (*). 
        5. NO LIST STUFFING: Do not mix bold headers with long paragraphs for simple lists. Transition directly from a context sentence to a clean list of scannable points.
        6. ZERO REDUNDANCY: If a sentence says "Consider these factors:", do NOT add a redundant <b>Factors to Consider:</b> header immediately after. Transition directly to the bulleted list.
        7. TIGHT SPACING: Avoid empty <p>&nbsp;</p> tags or unnecessary <br> breaks between headings/text and lists. 
        8. Use <h2> and <h3> for headings. 
        9. NEVER use Markdown headers (#) for titles or headings. Use valid HTML for headings.
        10. DO NOT repeat the blog title as an <h1> in the <content> tag. Start directly with an <h2>.

        PERFECT FORMAT EXAMPLE:
        <title>Professional Blog Title Here</title>
        <meta>Engaging 155-character meta description goes here.</meta>
        <content>
          <h2>Primary Section Heading</h2>
          <p>Introductory paragraph content...</p>
          * Key Scannable Point 1
          * Key Scannable Point 2
        </content>
      `;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:streamGenerateContent`;

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
        let buffer = '';

        responseStream.on('data', (chunk: any) => {
          buffer += chunk.toString();

          // Robust extraction of "text" values that might span multiple chunks
          while (true) {
            const pattern = '"text": "';
            const startIndex = buffer.indexOf(pattern);
            if (startIndex === -1) break;

            const textValueStart = startIndex + pattern.length;
            let endIndex = -1;

            // Find the closing quote, skipping escaped quotes (\")
            for (let i = textValueStart; i < buffer.length; i++) {
              if (buffer[i] === '"' && (i === 0 || buffer[i - 1] !== '\\')) {
                endIndex = i;
                break;
              }
            }

            if (endIndex !== -1) {
              // Extract the raw escaped text
              let rawText = buffer.slice(textValueStart, endIndex);

              // Unescape common JSON/Unicode sequences
              const decodedText = rawText
                .replace(/\\u([a-fA-F0-9]{4})/g, (_, grp) => String.fromCharCode(parseInt(grp, 16)))
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

              controller.enqueue(new TextEncoder().encode(decodedText));

              // Remove the handled portion from the buffer
              buffer = buffer.slice(endIndex + 1);
            } else {
              // The text value is incomplete, wait for more chunks
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
    console.error("API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
