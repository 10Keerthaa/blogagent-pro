import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description, ideaBox, sitemapLinks, referenceUrl1, referenceUrl2, referenceUrl3 } = body;

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
        learnedContext = results.map((text, index) => text.length > 0 ? `SOURCE_URL: ${urlsToFetch[index]}\nCONTENT: ${text}` : "").filter(text => text.length > 0).join("\n\n---\n\n");
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

    // Detect if the Idea Box contains a highly structured outline for Initial Generation
    const isCustomOutline = !isSurgical && ideaBox && (
      /\bsection\s*\d+\b/i.test(ideaBox) || 
      (/\b(?:introduction|conclusion)\b/i.test(ideaBox) && ideaBox.split('\n').length > 4)
    );

    // --- FRAMER GENERATION STRATEGY (H4 FOCUS) ---
    const FRAMER_PROMPT = `
        You are an expert SEO copywriter specialized in Framer CMS content. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies. You ARE encouraged to use real-world statistics from your internal knowledge of external sites if LEARNED CONTEXT is not provided.
        - If LEARNED CONTEXT is provided, it is your SINGLE SOURCE OF TRUTH for facts.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - BRAND NEUTRALITY: Do not mention or reuse product names, brand names, or company names from reference URLs or learned context unless explicitly referring to 10xDS. Rewrite all examples and references in a generic manner.
        - STATISTICS & CLAIMS: You are encouraged to include real-world statistics, percentages, and numerical claims from your internal knowledge or the LEARNED CONTEXT. Whenever you include a statistic, you MUST format it as a double-clickable span using the source's actual URL. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: red; font-weight: bold; cursor: pointer;" data-source="[INSERT_SOURCE_URL]">[INSERT_STATISTIC]</span>. DO NOT use standard <a> tags for statistics. Do not fabricate numbers; only use real data from credible external sites.
        - EXAMPLES: Do not use fabricated or generic examples containing fake statistics (e.g., "a pet store chain achieved a 10% increase in sales"). Use only real, verifiable examples with proper attribution, or keep the example entirely conceptual without specific numerical claims.

        ${sitemapLinks ? `
        ━━━ INTERNAL LINKING REPOSITORY (ELITE SEO)
        From the sitemap data below, select ONLY the 8 to 10 keyword phrases that are MOST RELEVANT to the topic "${prompt}". Ignore all others.
        STRICT ONE-LINK RULE: Each selected keyword phrase must be linked EXACTLY ONCE in the entire post. Once a phrase has been hyperlinked anywhere in the content, NEVER link that same phrase again — not in any other paragraph, section, or sentence.
        ONLY link if the phrase fits the sentence perfectly. Do not force links.
        SITEMAP DATA:
        ${Object.entries(sitemapLinks).map(([k, v]) => `- "${k}": ${v}`).join('\n')}
        ` : ""}

        ${learnedContext ? `\nLEARNED CONTEXT FROM URL: \n${learnedContext}\n` : ""}
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

        STRICT REQUIREMENTS (FRAMER SPECIFIC):
        1. BLOG TITLE: Inside <title> tags. Generate a fresh, high-authority, and catchy blog title BASED on the provided topic. STRICT CHARACTER LIMIT: The title MUST be between 50 and 60 characters to ensure perfect display without truncation. STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon separating them. FORBIDDEN: Do NOT append brand names, pipe characters (|), or "10xDS" to the title under any circumstances. If the topic is short and needs only one part, keep it as a single bold statement without a colon.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST include the primary keyword.
        3. BLOG CONTENT: You MUST write a MINIMUM of 1600 words. Target 1600 to 1800 words. MAXIMUM 2000 words. DO NOT abruptly cut off the text; ensure the full structure is completely finished.
        4. STRUCTURE (Inside <content>):
           - **FORBIDDEN:** Do NOT wrap the content in markdown code blocks or fences like \`\`\`html. Start directly with the content.
           - Start with a strategic exactly 3-sentence introduction paragraph.
           - **HEADINGS:** For the body of the post, you MUST use **<h4><b>** tags for all section headings to make them perfectly bold (e.g., <h4><b>The Strategic Role</b></h4>). This is a strict visual requirement for the Framer template.
           - **DYNAMIC HEADINGS:** If your topic contains a number (e.g. "8 Ways", "7 Steps"), you MUST write exactly that many <h4> sections. If there is no number, default to exactly 5 <h4> sections. Each section MUST contribute at least 150 words.
           - **HEADING STYLE:** All <h4> headings must be formal, declarative, and professional. Do NOT force them to be questions.
           - **URL INTEGRATION:** If LEARNED CONTEXT is provided, extract 2-3 facts that are HIGHLY RELEVANT to the main blog topic. Weave these facts naturally as bullet points inside the most relevant existing <h4> section. DO NOT create a separate summary section for them. DO NOT copy exact wording from the URLs. Properly paraphrase and synthesize all source material in your own words. Do not closely follow the sentence structure of the reference content. DO NOT use exact phrases from the URLs as subheadings. **FORBIDDEN:** Do NOT use phrases like "According to the learned context", "Based on the provided URL", or "According to the LEARNED CONTEXT". Act as if you already knew these facts.
           - **SECTION INTROS:** The introductory paragraph directly under every <h4> section MUST consist of STRICTLY EXACTLY 2 sentences (no more, no less) before any lists or bullet points.
           - **ABBREVIATIONS:** You MUST expand every acronym or abbreviation on its first occurrence (e.g., Artificial Intelligence (AI)), and use the abbreviation strictly thereafter.
           - **SENTENCE VARIETY:** Avoid repetitive sentence structures. Specifically, DO NOT repeatedly start sentences with words such as "This", "These", or "Additionally". Ensure dynamic and varied sentence transitions.
           - **BULLET POINTS (OPTIONAL):** Use HTML <ul> and <li> tags ONLY when bullet points are contextually appropriate. FORBIDDEN: Do NOT use <b> bold text or asterisks (*) as a substitute for bullet points. When bullets ARE used, they MUST be inside standard HTML <ul><li> tags. Each <li> MUST follow this exact format: <b>Short Heading:</b> exactly 2 full sentences of detailed description.
           - **NO SQUISHED BULLETS:** Never place multiple bullet points inside a single <p> paragraph. Every single bullet point MUST begin on a brand-new line inside its own separate <li> tag.
        5. NEVER use <h2> or <h3> for subheadings. ONLY use <h4>.
        6. INTERNAL LINKS: You are AUTHORIZED to use <a> tags ONLY for the phrases provided in the INTERNAL LINKING REPOSITORY. DO NOT invent links. Ensure all internal links are contextually relevant to the surrounding content; only hyperlink a phrase if it fits naturally. ABSOLUTE RULE: You MUST add this exact inline style to every internal link you generate: style="color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;". CRITICAL: Each keyword phrase must appear as a hyperlink ONLY ONCE in the entire post. If you have already linked a phrase earlier, you MUST write it as plain text in all subsequent occurrences — never as a link again.
        7. CONCLUSION (MANDATORY): Include an "<h2>Conclusion</h2>" heading followed by exactly 3 to 4 sentences of professional wrap-up and this exact purple link: <a href="https://www.10xds.ai/contact/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        8. FAQ SECTION (MANDATORY): Include an "<h2>FAQ Section</h2>" heading with EXACTLY 5 questions. Wrap each question in <p><b>...</b></p> tags and each answer in <p>...</p> tags. Add a <br /> after every answer to ensure a clear vertical gap between each Q&A pair. Do not nest them; they must be sequential blocks.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,100 WORDS under ANY circumstances. If LEARNED CONTEXT or ADDITIONAL INSTRUCTIONS are provided, you MUST compress your writing and weave those facts into the existing H4 sections. Do NOT skip any structural requirements (Intro, 5 H4s, Conclusion, FAQs), but you MUST ensure the total combined word count stays strictly at or below 2,100 words.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const customFramerOutlinePrompt = `
        You are an expert SEO copywriter specialized in Framer CMS content. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies. You ARE encouraged to use real-world statistics from your internal knowledge of external sites if LEARNED CONTEXT is not provided.
        - If LEARNED CONTEXT is provided, it is your SINGLE SOURCE OF TRUTH for facts.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - STATISTICS & CLAIMS: You are encouraged to include real-world statistics, percentages, and numerical claims from your internal knowledge or the LEARNED CONTEXT. Whenever you include a statistic, you MUST format it as a double-clickable span using the source's actual URL. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: red; font-weight: bold; cursor: pointer;" data-source="[INSERT_SOURCE_URL]">[INSERT_STATISTIC]</span>. DO NOT use standard <a> tags for statistics. Do not fabricate numbers; only use real data from credible external sites.

        ${sitemapLinks ? `
        ━━━ INTERNAL LINKING REPOSITORY (ELITE SEO)
        From the sitemap data below, select ONLY the 8 to 10 keyword phrases that are MOST RELEVANT to the topic "${prompt}". Ignore all others.
        STRICT ONE-LINK RULE: Each selected keyword phrase must be linked EXACTLY ONCE in the entire post. Once a phrase has been hyperlinked anywhere in the content, NEVER link that same phrase again — not in any other paragraph, section, or sentence.
        ONLY link if the phrase fits the sentence perfectly. Do not force links.
        SITEMAP DATA:
        ${Object.entries(sitemapLinks).map(([k, v]) => `- "${k}": ${v}`).join('\n')}
        ` : ""}

        ${learnedContext ? `\nLEARNED CONTEXT FROM URL: \n${learnedContext}\n` : ""}
        
        USER PROVIDED OUTLINE (STRICT ADHERENCE REQUIRED):
        ${ideaBox}

        STRICT REQUIREMENTS (FRAMER SPECIFIC):
        1. BLOG TITLE: Inside <title> tags. Generate a fresh, high-authority, and catchy blog title BASED on the provided topic. STRICT CHARACTER LIMIT: The title MUST be between 50 and 60 characters to ensure perfect display without truncation. STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon separating them. FORBIDDEN: Do NOT append brand names, pipe characters (|), or "10xDS" to the title.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST include the primary keyword.
        3. BLOG CONTENT: You MUST deeply expand on the provided outline to reach a target of 1600 to 1800 words. DO NOT write a short summary. Write comprehensively for every single bullet point to ensure you hit the word count. MAXIMUM 2000 words. DO NOT abruptly cut off the text.
        4. CUSTOM STRUCTURE (Inside <content>):
           - ZERO STRUCTURAL HALLUCINATION: You MUST strictly mirror the EXACT headings and sections provided in the USER PROVIDED OUTLINE. Do NOT invent new headings. Do NOT convert bullet points into subheadings.
           - HEADING ENFORCEMENT: The very first line of your <content> output MUST be the <h4> heading for the first section of the outline. Do NOT skip the first heading. Do NOT write a generic introduction paragraph above the first heading unless "Introduction" is explicitly in the outline.
           - ONLY use the headings explicitly written in the outline. Do not add outside topics.
           - **FORBIDDEN:** Do NOT wrap the content in markdown code blocks or fences like \`\`\`html.
           - **HEADINGS:** For the body of the post, you MUST use **<h4><b>** tags for all section headings to make them perfectly bold (e.g., <h4><b>The Strategic Role</b></h4>). NEVER use <h2> or <h3> for subheadings.
           - **SECTION INTROS:** The introductory paragraph directly under every <h4> section MUST consist of STRICTLY EXACTLY 2 sentences (no more, no less) before any lists or bullet points.
           - **BULLET POINTS:** Use HTML <ul> and <li> tags. Do NOT use <b> bold text or asterisks (*) as a substitute for bullet points. Each <li> MUST begin on a brand-new line inside its own separate <li> tag.
           - **URL INTEGRATION:** If LEARNED CONTEXT is provided, weave facts naturally inside the most relevant sections of the outline. Properly paraphrase all source material; do not closely follow the reference content's wording.
           - **ABBREVIATIONS:** You MUST expand every acronym or abbreviation on its first occurrence, and use the abbreviation strictly thereafter.
           - **SENTENCE VARIETY:** Avoid repetitive sentence structures. Specifically, DO NOT repeatedly start sentences with words such as "This", "These", or "Additionally".
        5. INTERNAL LINKS: You are AUTHORIZED to use <a> tags ONLY for the phrases provided in the INTERNAL LINKING REPOSITORY. DO NOT invent links. Ensure all internal links are contextually relevant to the surrounding content; only hyperlink a phrase if it fits naturally. ABSOLUTE RULE: You MUST add this exact inline style to every internal link you generate: style="color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;".
        6. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        7. CONCLUSION: Do NOT add a Conclusion unless it is explicitly requested in the USER PROVIDED OUTLINE. If it IS requested, include an "<h2>Conclusion</h2>" heading followed by 3 to 4 sentences of wrap-up and this exact purple link: <a href="https://www.10xds.ai/contact/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        8. FAQ SECTION: Do NOT add an FAQ section unless it is explicitly requested in the USER PROVIDED OUTLINE. If it IS requested, include an "<h2>FAQ Section</h2>" heading, wrap each question in <p><b>...</b></p> tags and each answer in <p>...</p> tags. Add a <br /> after every answer.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,100 WORDS under ANY circumstances. You must fulfill the entire USER PROVIDED OUTLINE without exceeding this limit.

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
        ${sitemapLinks ? `INTERNAL LINKING REFERENCE: ${JSON.stringify(sitemapLinks)}` : ""}

        USER INSTRUCTION: ${feedback}
        ${learnedContext ? `\nLEARNED CONTEXT FROM URL (USE FOR FACTS/DATA): \n${learnedContext}\n` : ""}
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}
        
        STRICT SURGICAL CONTRACT:
        1. ZERO DRIFT: You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. **EXCEPTION:** If LEARNED CONTEXT is provided, you ARE allowed to "drift" solely to weave in new facts into existing sections.
        2. Maintain all <h4> tags exactly as they appear in the GROUND TRUTH.
        3. URL DATA: if LEARNED CONTEXT is provided, you MUST use its facts to inform your generation or refinement. This is the only case where you may add new technical bullet points to existing sections.
        4. Return the final, fully merged HTML within <content> tags. 
        5. Ensure <title> and <meta> tags are also included. For the <title>, you MUST follow this STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon separating them. FORBIDDEN: Do NOT append brand names, pipe characters (|), or "10xDS" to the title under any circumstances.
        6. Every post MUST have an <h2> Conclusion with the expert CTA link.
        7. RELATIVE REFERENCE RESOLUTION: If the USER INSTRUCTION uses vague or relative language such as "the new subheading", "the section I just added", "the last heading", "the recently added block", or "the new section" — scan the GROUND TRUTH HTML structure from bottom to top and identify the most recently positioned <h4> or <h2> block as the target. Apply the requested action (INSERT, DELETE, or REPLACE) to that identified block. All other content must remain completely untouched.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : (isCustomOutline ? customFramerOutlinePrompt : FRAMER_PROMPT);

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
          maxOutputTokens: 4500, // Increased budget to ensure 1900-word posts can finish and close all HTML tags
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
