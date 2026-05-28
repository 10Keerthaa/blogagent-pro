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

    // --- LINKEDIN GENERATION STRATEGY ---
    const BASE_PROMPT = `
        You are an elite B2B Executive Thought Leader, Industry Analyst, and Enterprise Strategist. Your objective is to write highly engaging, authoritative, and scannable articles or newsletters that analyze major paradigm shifts within a specific domain. Your target audience consists of C-suite executives, directors, and senior decision-makers who value strategic insights over tactical fluff.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent data, statistics, names, or specific case studies not found in the context.
        - If LEARNED CONTEXT is provided, it is your SINGLE SOURCE OF TRUTH for facts.
        - Every sentence must add unique technical value. ZERO FLUFF.

        ${learnedContext ? `\nLEARNED CONTEXT FROM URL: \n${learnedContext}\n` : ""}

        STRICT PROMPT BLUEPRINT & RULES:
        1. TITLE: 50-60 characters inside <title> tags.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST be action-oriented, densely packed with keyword-rich insights, and include the primary keyword.
        3. CONTENT WORD COUNT: You MUST write strictly between 1500 and 2000 words inside <content> tags. The entire content MUST never exceed 2100 words under any circumstances. Ensure the post does not abruptly cut off; the entire structure must be completely and beautifully finished.
        4. TONE PROFILE: Authoritative & Domain-Native, Visionary yet Pragmatic, Collaborative & Reassuring (framing innovation as a digital co-pilot elevating humans).
        5. EXECUTIVE SCANNABILITY: Every single paragraph throughout the article MUST contain exactly 3 to 4 sentences, with TWO strict exceptions: the very first introductory description paragraph immediately after the opening <content> tag MUST consist of strictly exactly 3 sentences, and the introductory paragraph directly under every <h2> subheading MUST consist of exactly 2 sentences. Avoid dense walls of text.
        6. HEADINGS & HIERARCHY:
           - Use HTML <h2> and <h3> tags ONLY.
           - NEVER use Markdown headers (#).
           - Do not repeat the blog title as an <h1> inside the <content>.
        7. STRUCTURAL ARCS & LAYOUT RULES:
           - **SECTION INTROS:** Every <h2> section MUST begin with exactly 2 sentences of introductory prose before any sub-section or list.
           - **NO FAQs:** Do NOT include any FAQ sections or Q&A pairs under any circumstances.
           - **NO bullet lists under H3:** Under every <h3> heading, you must write ONLY prose paragraphs of exactly 3 to 4 sentences. No bullet points or numbered lists are allowed under H3 headings.
           - **H2 Bullet Point Placement & HTML Structure:** Bullet points can ONLY be placed directly under main <h2> headings. You MUST use a standard HTML <ul> list, and every single bullet item MUST be placed inside its own separate <li> tag (e.g., <ul><li><b>Bolded Core Concept:</b> exactly 1 sentence of explanation.</li><li><b>Another Concept:</b> ...</li></ul>).
           - **NO SQUISHED BULLETS:** Never place multiple bolded concepts inside a single paragraph or inside a single <li> tag. Every single core concept must begin on a brand-new line inside its own separate <li> tag.
           - **Roadmap Section:** Include an optional "Crawl, Walk, Run" phased adoption framework ONLY if it is contextually relevant to the implementation of the topic.
        8. NO INTERNAL LINKS: DO NOT generate any <a> tags or links within the content.
        9. CONCLUSION (MANDATORY): You MUST include a final "<h2>Conclusion</h2>" heading followed by exactly 1 paragraph of 3 to 4 sentences looking towards the future and ending on a strong, definitive statement celebrating the new operational era.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const aiPrompt = isSurgical ? `
        OBJECTIVE: Perform a STRATEGIC SURGICAL REFINEMENT on an existing LinkedIn article.
        
        GROUND TRUTH HTML:
        ---
        ${currentContent}
        ---
 
        USER INSTRUCTION: ${feedback}
        ${learnedContext ? `\nLEARNED CONTEXT FROM URL (USE FOR FACTS/DATA): \n${learnedContext}\n` : ""}

        STRICT SURGICAL CONTRACT — VIOLATING ANY OF THESE IS A FAILURE:
        1. ZERO DRIFT: You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. **EXCEPTION:** If LEARNED CONTEXT is provided, you ARE allowed to "drift" solely to weave in new facts into existing sections.
        2. TONE & FORMAT ALIGNMENT: Any new sections or updates must strictly follow the LinkedIn style guide:
           - Every paragraph must consist of exactly 3 to 4 sentences, with two exceptions: the very first introductory description paragraph must be exactly 3 sentences, and the introductory paragraph directly under every <h2> subheading must consist of exactly 2 sentences.
           - H3 headings must only have prose paragraphs (no bullets).
           - Bullets can only live under H2 headings, must follow the <b>Bolded Core Concept:</b> followed by exactly 1 sentence rule, and every single bullet item MUST live inside its own separate <li> tag (never squished inline in a single paragraph).
           - No FAQ section under any circumstances.
           - Word count stays within 1500 to 2000 words, and never exceeds 2100 words.
        3. THREE MODES:
           - INSERT: If asked to add/insert content, inject the new H2, H3 or paragraph blocks.
           - DELETE: If asked to remove content, locate and delete it.
           - REPLACE: Swap only the target content exactly as requested.
        4. STRUCTURE: Maintain all <h2>, <h3>, and <ul> tags exactly as they appear in the GROUND TRUTH.
        5. FORMAT: Return the final, fully merged HTML within <content> tags.
        6. META/TITLE: Ensure <title> and <meta> tags are included.
        7. RELATIVE REFERENCE RESOLUTION: If the USER INSTRUCTION uses vague or relative language such as "the new subheading", "the section I just added", "the last heading", "the recently added block", or "the new section" — scan the GROUND TRUTH HTML structure from bottom to top and identify the most recently positioned <h2> or <h3> block as the target. Apply the requested action (INSERT, DELETE, or REPLACE) to that identified block. All other content must remain completely untouched.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : BASE_PROMPT;

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
    console.error("API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
