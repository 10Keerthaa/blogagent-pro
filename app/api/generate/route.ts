import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description, referenceUrl1, referenceUrl2, referenceUrl3 } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // --- Reference URLs Crawling: Fetch and summarize the provided URLs for richer context ---
    let learnedContext = "";
    const urlsToFetch = [referenceUrl1, referenceUrl2, referenceUrl3].filter(url => url && url.startsWith('http'));
    
    if (urlsToFetch.length > 0) {
      try {
        const fetchPromises = urlsToFetch.map(async (url) => {
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (res.ok) {
              const html = await res.text();
              const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
              const rawText = bodyMatch ? bodyMatch[1] : html;
              return rawText
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
            console.error(`Failed to fetch ${url}:`, err);
          }
          return "";
        });

        const results = await Promise.all(fetchPromises);
        learnedContext = results.filter(text => text.length > 0).join("\n\n---\n\n");
      } catch (err) {
        console.error("Reference URLs Crawling Failed:", err);
      }
    }

    // Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // Determine if we are in "Surgical Refinement" mode
    const isSurgical = !!(feedback && currentContent);

    // Detect structural intent in user feedback to select the correct refinement engine
    const isStructuralFeedback = isSurgical && (
      /reorganize|restructure|merge\s+(sections|headings|h2|h3)|consolidate|headings|structure|7\s+h2|5\s+core|outline|layout/i.test(feedback)
    );

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
        3. BLOG CONTENT: You MUST write a MINIMUM of 1800 words. Target 1800 to 2100 words. MAXIMUM 2100 words. DO NOT abruptly cut off the text; ensure the full structure is completely finished.
        4. STRUCTURE (Inside <content>):
           - Start with an exactly 3-sentence introduction paragraph that clearly describes the topic and sets the context for the reader.
           - **DYNAMIC H2 COUNT:** If the Topic title contains a number (e.g., "7 Steps", "8 Ways"), you MUST write exactly that many content H2 sections. If the title has NO numbers, default to exactly 5 content H2 sections.
           - **MANDATORY ADDITIONS:** After your content H2s, you MUST always append exactly 1 Conclusion H2 and 1 FAQ H2.
           - **HEADING STYLE:** All H2 and H3 headings must be formal, declarative, and professional (e.g., "The Strategic Role of Autonomous Systems"). Do NOT force them to be questions.
           - **H3 SUB-SECTIONS:** Use <h3> sub-headings to break down complex H2 topics where appropriate. Each <h3> section must be followed by exactly 3 sentences of prose before any list.
           - **URL INTEGRATION:** If LEARNED CONTEXT is provided, extract 2-3 facts that are HIGHLY RELEVANT to the main blog topic. Weave these facts naturally inside the most relevant existing H2 section. DO NOT create a separate summary section for them. DO NOT copy exact wording from the URLs (no plagiarism, synthesize in your own words). DO NOT use exact phrases from the URLs as subheadings. **FORBIDDEN:** Do NOT use phrases like "According to the learned context" or "Based on the provided URL". Act as if you already knew these facts.
           - **SECTION INTROS:** Every H2 section MUST begin with exactly 3 sentences of introductory prose before any sub-section or list.
           - **BULLET POINTS:** Use HTML <ul> and <li> tags ONLY where contextually appropriate (e.g., listing features, steps, or comparisons). Do NOT force bullet points into every section. Where bullets are used, each <li> can be 1 or 2 sentences.
           - Formatting: Use HTML <b>Bold Headers:</b> for specific sub-points where needed.
        5. Use <h2> and <h3> for headings. NEVER use Markdown headers (#).
        6. NO INTERNAL LINKS: DO NOT generate any <a> tags or links within the content (except for the expert CTA).
        7. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        8. CONCLUSION (MANDATORY): You MUST include an "<h2>Conclusion</h2>" heading followed by exactly 3 to 4 sentences of professional wrap-up and this exact purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        9. FAQ SECTION (MANDATORY): You MUST include an "<h2>FAQ Section</h2>" heading with EXACTLY 5 questions. Wrap each question in <p><b>...</b></p> tags and each answer in <p>...</p> tags. Add a <br /> after every answer to ensure a clear vertical gap between each Q&A pair. Do not nest them; they must be sequential blocks.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const surgicalPrompt = `
        OBJECTIVE: Perform a STRATEGIC SURGICAL REFINEMENT on an existing blog post.
        
        GROUND TRUTH HTML:
        ---
        ${currentContent}
        ---

        USER INSTRUCTION: ${feedback}
        ${learnedContext ? `\nLEARNED CONTEXT FROM URL (USE FOR FACTS/DATA): \n${learnedContext}\n` : ""}

        STRICT SURGICAL CONTRACT — VIOLATING ANY OF THESE IS A FAILURE:
        1. ZERO DRIFT: You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. **EXCEPTION:** If LEARNED CONTEXT is provided, you ARE allowed to "drift" solely to weave in new facts into existing sections.
        2. THREE MODES:
           - INSERT: If asked to add/insert content, find the exact position described and inject the new <p> or <h2>/<h3> blocks. 
           - DELETE: If asked to remove/delete content, locate the specific block and remove it entirely.
           - REPLACE: If asked to change/rename/update a heading or paragraph, swap Only that specific text and maintain all surrounding content exactly as-is.
        3. URL DATA: if LEARNED CONTEXT is provided, you MUST use its facts to inform your generation or refinement. This is the only case where you may add new technical bullet points to existing sections.
        4. STRUCTURE: Maintain all <h2>, <h3>, and <ul> tags exactly as they appear in the GROUND TRUTH.
        5. FORMAT: Return the final, fully merged HTML within <content> tags. 
        6. META/TITLE: Ensure the <title> and <meta> tags are also included. For meta descriptions, enforce 155 characters EXACTLY and include the primary keyword.
        7. MANDATORY STANDARDS: 
           - Every post MUST have an <h2> Conclusion. 
           - The Conclusion MUST end with a purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
           - DELETE any existing [[CTA_LINK]] placeholders; they are now deprecated.
        8. RELATIVE REFERENCE RESOLUTION: If the USER INSTRUCTION uses vague or relative language such as "the new subheading", "the section I just added", "the last heading", "the recently added block", or "the new section" — scan the GROUND TRUTH HTML structure from bottom to top and identify the most recently positioned <h2> or <h3> block as the target. Apply the requested action (INSERT, DELETE, or REPLACE) to that identified block. All other content must remain completely untouched.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    `;

    const structuralPrompt = `
        OBJECTIVE: Perform an ARCHITECTURAL / STRUCTURAL REORGANIZATION on an existing blog post.
        
        GROUND TRUTH HTML:
        ---
        ${currentContent}
        ---

        USER RESTRUCTURE INSTRUCTION: ${feedback}
        ${learnedContext ? `\nLEARNED CONTEXT FROM URL (USE FOR FACTS/DATA): \n${learnedContext}\n` : ""}

        STRICT STRUCTURAL REBUILD CONTRACT:
        1. RESTRUCTURE: You are hereby permitted and commanded to reorganize, merge, delete, or rename headings and paragraphs to match the USER RESTRUCTURE INSTRUCTION. Do not worry about the "Zero Drift" rule for this structural rewrite.
        2. PRESERVE SUBSTANCE: You must retain all existing facts, numbers, dates, tables, and bullet points from the GROUND TRUTH HTML. Do not invent any new facts.
        3. COMPLETION GUARANTEE: You MUST output the entire redesigned HTML from the introduction to the FAQ section. Do NOT stop generating or truncate early.
        4. FORMAT: Return the final, fully merged HTML within <content> tags. Ensure the <title> and <meta> tags are also included.
        5. MANDATORY STANDARDS: The post must end with an <h2>Conclusion</h2> containing a 3-sentence prose wrap-up and this exact purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with structural changes applied</content>
    `;

    const aiPrompt = isSurgical 
      ? (isStructuralFeedback ? structuralPrompt : surgicalPrompt)
      : BASE_PROMPT;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:streamGenerateContent`;

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
