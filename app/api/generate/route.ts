import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description } = body;

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

    // Determine if we are in "Surgical Refinement" mode
    const isSurgical = !!(feedback && currentContent);

    const aiPrompt = isSurgical ? `
        OBJECTIVE: Perform an ELITE SURGICAL REFINEMENT on an existing blog post.
        
        GROUND TRUTH HTML:
        ---
        ${currentContent}
        ---

        USER INSTRUCTION: ${feedback}
        ${learnedContext ? `\nLEARNED CONTEXT FROM URL (USE FOR FACTS/DATA): \n${learnedContext}\n` : ""}

        STRICT SURGICAL CONTRACT — VIOLATING ANY OF THESE IS A FAILURE:
        1. ZERO DRIFT: You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. 
        2. THREE MODES:
           - INSERT: If asked to add/insert content, find the exact position described and inject the new <p> or <h2>/<h3> blocks. 
           - DELETE: If asked to remove/delete content, locate the specific block and remove it entirely.
           - REPLACE: If asked to change/rename/update a heading or paragraph, swap Only that specific text and maintain all surrounding content exactly as-is.
        3. URL DATA: if LEARNED CONTEXT is provided, use its facts to inform your insertion.
        4. STRUCTURE: Maintain all <h2>, <h3>, and <ul> tags exactly as they appear in the GROUND TRUTH.
        5. FORMAT: Return the final, fully merged HTML within <content> tags. 
        6. META/TITLE: Ensure the <title> and <meta> tags are also included. For meta descriptions, enforce 155 characters EXACTLY and include the primary keyword.
        7. ELITE STANDARDS: 
           - Every post MUST have an <h2> Conclusion. 
           - The Conclusion MUST end with a purple link: <a href="#" style="color: #9333ea; font-weight: 700; text-decoration: none;">Ask our experts</a>.
           - DELETE any existing [[CTA_LINK]] placeholders; they are now deprecated.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : `
        You are an expert Enterprise Content Strategist. Generate a high-quality, long-form blog post for a professional business audience.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        
        ${learnedContext ? `
        LEARNED CONTEXT FROM EXTERNAL URL:
        ---
        ${learnedContext}
        ---
        ` : ""}

        ━━━ AUDIENCE & TONE
        - Target: CIOs, Operations Heads, Digital Transformation Leads.
        - Tone: Authoritative, informative, and clinical. Assume technical familiarity but avoid unnecessary jargon.
        - Voice: Strictly Active Voice.
        
        ━━━ WORD COUNT CALIBRATION (STRICT ENFORCEMENT)
        - TOTAL: 1500–2000 words.
        - INTRODUCTION: 150–200 words.
        - BODY SECTIONS: 200–300 words each.
        - CONCLUSION: 100–150 words.
        - DO NOT HALLUCINATE LENGTH: Every sentence must add unique value to the technical discussion.
        
        ━━━ STRUCTURE (STRICT ORDER)
        1. BLOG TITLE: 50–60 characters.
        2. META DESCRIPTION: 155 characters EXACTLY. Must include the primary keyword: ${primaryKeyword}. Ensure it is compelling and high-converting.
        3. <content> tag:
           - INTRODUCTION: 150–200 words. Open with a business problem or industry data point. 
           - 4–6 BODY SECTIONS (H2 → H3 hierarchy): 200–300 words each.
             - Paragraphs: Max 4-5 lines.
             - Implementation steps: Use numbered lists starting with imperative verbs.
             - Callouts: Add 1–2 "Pro tip:" or "Key insight:" boxes.
           - OPTIONAL MODULES (Use if relevant): "Why [topic] matters", "Key benefits", "Use cases", or "Challenges and considerations".
           - CONCLUSION: Use an <h2> Conclusion header. 100-150 words summarizing the impact. Follow this immediately with a purple-colored link (using <a href="#" style="color: #9333ea; font-weight: 700; text-decoration: none;">Ask our experts</a>).
           - NO CTA PLACEHOLDER: Do NOT use [[CTA_LINK]]. The "Ask our experts" link is the only CTA needed.
           - FAQ SECTION: 5–7 specific questions phrased for practitioners.
        
        ━━━ FORBIDDEN FILLERS:
        - "In today's rapidly evolving world", "As technology continues to advance", "It's no secret that", "In conclusion", "As we can see".
        
        ━━━ FORMATTING:
        - Use <h2> and <h3> only. No Markdown headers (#).
        - First mention of a technology: provide a one-sentence context.
        - The "Ask our experts" link must be the final sentence of the Conclusion.
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
