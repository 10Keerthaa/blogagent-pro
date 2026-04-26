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

    // --- URL Crawling Logic (Mirroring WordPress quality) ---
    let learnedContext = "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = (feedback || prompt).match(urlRegex);

    if (urls && urls.length > 0) {
      try {
        const targetUrl = urls[0];
        const res = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
          const html = await res.text();
          learnedContext = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 10000);
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

    // --- FRAMER GENERATION STRATEGY (H4 FOCUS) ---
    const FRAMER_PROMPT = `
        You are an expert SEO copywriter specialized in Framer CMS content. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent data, statistics, names, or specific case studies not found in the context.
        - If LEARNED CONTEXT is provided, it is your SINGLE SOURCE OF TRUTH for facts.
        - Every sentence must add unique technical value. ZERO FLUFF.

        ${learnedContext ? `\nLEARNED CONTEXT FROM URL: \n${learnedContext}\n` : ""}

        STRICT REQUIREMENTS (FRAMER SPECIFIC):
        1. BLOG TITLE: Inside <title> tags. STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon separating them. FORBIDDEN: Do NOT append brand names, pipe characters (|), or "10xDS" to the title under any circumstances. If the topic is short and needs only one part, keep it as a single bold statement without a colon.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST include the primary keyword.
        3. BLOG CONTENT: STRICT range of 1600 to 2000 words inside <content> tags. MINIMUM 1600 words — do not stop early. MAXIMUM 2000 words — STOP writing once you reach 2000 words.
        4. STRUCTURE (Inside <content>):
           - Start with a strategic 2-paragraph introduction (minimum 80 words).
           - **HEADINGS:** For the body of the post, use **<h4>** for all section headings. This is a strict requirement for the Framer template.
           - Use 8–10 <h4> sections for maximum depth. Each section MUST contribute at least 150 words.
           - **SECTION INTROS:** Every <h4> section MUST begin with exactly 3-4 sentences of introductory text before any list.
           - **BULLET POINTS:** ALWAYS use HTML <ul> and <li> tags. Every <li> MUST be at least 2 full sentences (minimum 25 words per point). Minimum 3 <li> items per section.
        5. NEVER use <h2> or <h3> for subheadings. ONLY use <h4>.
        6. NO INTERNAL LINKS: DO NOT generate any <a> tags except for the expert CTA.
        7. CONCLUSION (MANDATORY): Include an "<h2>Conclusion</h2>" heading followed by a professional wrap-up and this exact purple link: <a href="https://www.10xds.ai/contact/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        8. FAQ SECTION (MANDATORY): Include an "<h2>FAQ Section</h2>" heading with 5–7 questions. Wrap each question in <b> tags and each answer in <p> tags. Do not nest them; they must be sequential blocks.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const aiPrompt = isSurgical ? `
        OBJECTIVE: Perform a STRATEGIC SURGICAL REFINEMENT on an existing Framer blog post.
        
        GROUND TRUTH HTML:
        ---
        ${currentContent}
        ---

        USER INSTRUCTION: ${feedback}
        
        STRICT SURGICAL CONTRACT:
        1. Maintain all <h4> tags exactly as they appear in the GROUND TRUTH.
        2. Return the final, fully merged HTML within <content> tags. 
        3. Ensure <title> and <meta> tags are also included.
        4. Every post MUST have an <h2> Conclusion with the expert CTA link.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : FRAMER_PROMPT;

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
            } else break;
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
    console.error("Framer API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
