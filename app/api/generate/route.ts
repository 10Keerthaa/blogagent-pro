import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description, referenceUrl } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // --- Reference URL Crawling: Fetch and summarize the provided URL for richer context ---
    let learnedContext = "";
    if (referenceUrl && referenceUrl.startsWith('http')) {
      try {
        const res = await fetch(referenceUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const html = await res.text();
          // Extract body content to skip head/meta tags and invisible code
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const rawText = bodyMatch ? bodyMatch[1] : html;

          learnedContext = rawText
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gim, "")
            .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 15000);
        }
      } catch (err) {
        console.error("Reference URL Crawling Failed:", err);
      }
    }

    // Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // Determine if we are in "Surgical Refinement" mode
    const isSurgical = !!(feedback && currentContent);

    // --- GENERATION STRATEGY ---
    const BASE_PROMPT = `
        You are an expert SEO copywriter. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent data, statistics, names, or specific case studies not found in the context.
        - If LEARNED CONTEXT is provided, it is your SINGLE SOURCE OF TRUTH for facts.
        - Every sentence must add unique technical value. ZERO FLUFF.

        ${learnedContext ? `\nLEARNED CONTEXT FROM URL: \n${learnedContext}\n` : ""}

        STRICT REQUIREMENTS:
        1. BLOG TITLE: 50-60 characters inside <title> tags.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST be highly informative, action-oriented, and densely packed with keyword-rich insights. MUST include the primary keyword.
        3. BLOG CONTENT: You MUST write a MINIMUM of 1600 words. Target 1600 to 1800 words. MAXIMUM 2000 words. DO NOT abruptly cut off the text; ensure the full structure is completely finished.
        4. STRUCTURE (Inside <content>):
           - Start with a strategic 1-paragraph introduction.
           - Use 5–7 H2 sections for depth. Headings MUST be direct questions or key statements (e.g., "<h2>What is [Topic]?</h2>").
           - **URL INTEGRATION:** If LEARNED CONTEXT is provided, summarize its core concepts into 2-3 bullet points and naturally weave them into whichever H2 section is most relevant to that data. DO NOT create a separate summary section.
           - **SECTION INTROS:** Every H2 section MUST begin with exactly 2-3 sentences of introductory text before any list or sub-points.
           - **BULLET POINTS:** ALWAYS use HTML <ul> and <li> tags. Every <li> point MUST be exactly 2 full sentences to guarantee sufficient length.
           - Formatting: Use HTML <b>Bold Headers:</b> for specific sub-points. 
        5. Use <h2> and <h3> for headings. NEVER use Markdown headers (#).
        6. NO INTERNAL LINKS: DO NOT generate any <a> tags or links within the content (except for the expert CTA).
        7. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        8. CONCLUSION (MANDATORY): You MUST include an "<h2>Conclusion</h2>" heading followed by a professional wrap-up and this exact purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        9. FAQ SECTION (MANDATORY): You MUST include an "<h2>FAQ Section</h2>" heading with EXACTLY 5 questions. Wrap each question in <b> tags and each answer in <p> tags. Do not nest them; they must be sequential blocks.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const aiPrompt = isSurgical ? `
        OBJECTIVE: Perform a STRATEGIC SURGICAL REFINEMENT on an existing blog post.
        
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
        7. MANDATORY STANDARDS: 
           - Every post MUST have an <h2> Conclusion. 
           - The Conclusion MUST end with a purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
           - DELETE any existing [[CTA_LINK]] placeholders; they are now deprecated.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : BASE_PROMPT;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:streamGenerateContent`;

    const response = await client.request({
      url,
      method: 'POST',
      responseType: 'stream',
      data: {
        contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.4,
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
