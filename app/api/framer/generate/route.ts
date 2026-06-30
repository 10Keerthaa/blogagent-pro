import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';
import { streamText, tool, isStepCount } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description, ideaBox, sitemapLinks, referenceUrl1, referenceUrl2, referenceUrl3 } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // The SDK expects a specific type of AuthClient, but we cast it as any to bypass version mismatch
    const vertex = createVertex({
      project: projectId,
      location: 'us-central1',
      googleAuthOptions: { authClient: client as any }
    });

    const urlsToFetch = [referenceUrl1, referenceUrl2, referenceUrl3].filter(url => url && url.startsWith('http'));

    const tools = {
      scrapeReferenceUrlTool: tool({
        description: 'Read and extract the textual content of a reference URL. Use this to read the URLs provided by the user.',
        parameters: z.object({
          url: z.string().describe('The reference URL to scrape (e.g., "https://en.wikipedia.org/wiki/Artificial_intelligence")'),
        }),
        execute: async ({ url }: { url: string }) => {
          try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return "Failed to fetch URL content.";
            const html = await res.text();
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            const rawText = bodyMatch ? bodyMatch[1] : html;
            return rawText
              .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
              .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 15000);
          } catch (err) {
            return "Failed to fetch URL content due to a network error.";
          }
        },
      } as any),
      queryInternalSitemapTool: tool({
        description: 'Search the internal sitemap repository for SEO links related to a specific keyword or phrase.',
        parameters: z.object({
          searchQuery: z.string().describe('The keyword or topic to search for in the sitemap (e.g. "automation", "AI")'),
        }),
        execute: async ({ searchQuery }: { searchQuery: string }) => {
          if (!sitemapLinks) return "No sitemap links available.";
          const query = searchQuery.toLowerCase();
          const results = Object.entries(sitemapLinks)
            .filter(([k, v]) => (k as string).toLowerCase().includes(query) || (v as string).toLowerCase().includes(query))
            .slice(0, 5)
            .map(([k, v]) => `- Phrase: "${k}", URL: ${v}`);
          return results.length > 0 ? results.join('\n') : "No relevant internal links found for this query.";
        },
      } as any),
      tavilySearchTool: tool({
        description: 'Search the live web for present-day or futuristic statistics related to the topic.',
        parameters: z.object({
          query: z.string().describe('The search query for the statistic (e.g., "2026 AI in healthcare market size report")'),
        }),
        execute: async ({ query }: { query: string }) => {
          console.log(`[AGENT TOOL] Tavily searching for: "${query}"`);
          try {
            const apiKey = process.env.TAVILY_API_KEY;
            if (!apiKey) return "TAVILY_API_KEY is not set in environment variables.";
            const response = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                api_key: apiKey, 
                query: query,
                search_depth: "advanced" 
              })
            });
            if (!response.ok) return "Search failed to execute.";
            const data = await response.json();
            return JSON.stringify(data.results.map((r: any) => ({ title: r.title, content: r.content, url: r.url })));
          } catch (error) {
            return "Search failed due to network error.";
          }
        }
      } as any)
    };

    const toolDirectives = `
        ${urlsToFetch.length > 0 ? `\n- OPTIONAL CONTEXT: You can use the 'scrapeReferenceUrlTool' to read these reference URLs if needed: ${urlsToFetch.join(', ')}\n` : ""}
        ${sitemapLinks ? `\n- SEO REQUIREMENT: You MUST attempt to use the 'queryInternalSitemapTool' to find internal links. If the tool returns an error or no links, gracefully skip adding internal links and continue writing.\n` : ""}
        \n- STATISTICS REQUIREMENT: You MUST attempt to use the 'tavilySearchTool' to search for live statistics for your 'stat-highlight' tags. If the tool fails, returns an error, or finds nothing, you may provide statistics from memory, but DO NOT wrap them in 'stat-highlight' tags and DO NOT guess URLs. ONLY use 'stat-highlight' tags for URLs directly returned by the Tavily tool.\n
    `;

    const isSurgical = !!(feedback && currentContent);
    const isCustomOutline = !isSurgical && ideaBox && (
      /\bsection\s*\d+\b/i.test(ideaBox) || 
      (/\b(?:introduction|conclusion)\b/i.test(ideaBox) && ideaBox.split('\n').length > 4)
    );

    const FRAMER_PROMPT = `
        You are an expert SEO copywriter specialized in Framer CMS content. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies. You MUST use real-world statistics from your internal knowledge or web tools.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - BRAND NEUTRALITY: Do not mention or reuse product names, brand names, or company names from reference URLs or learned context unless explicitly referring to 10xDS. Rewrite all examples and references in a generic manner.
        - STATISTICS & CLAIMS: You MUST pull diverse statistics. CRITICAL: You MUST ONLY use present-day data or futuristic projections. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: red; font-weight: bold; cursor: pointer;" data-source="[INSERT_REAL_URL]">[INSERT_STATISTIC]</span>. CRITICAL URL RULE: You MUST replace the placeholder "[INSERT_REAL_URL]" with the ACTUAL live URL returned by the 'tavilySearchTool'. If you did not get a URL from the tool, DO NOT use the stat-highlight tag at all. NEVER guess or hallucinate URLs from memory. NEVER output fake URLs. DO NOT use standard <a> tags for statistics.
        - EXAMPLES: Do not use fabricated or generic examples. Use only real, verifiable examples with proper attribution.

        ${toolDirectives}

        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

        STRICT REQUIREMENTS (FRAMER SPECIFIC):
        1. BLOG TITLE: Inside <title> tags. Generate a fresh, high-authority, and catchy blog title BASED on the provided topic. STRICT CHARACTER LIMIT: The title MUST be between 50 and 60 characters to ensure perfect display without truncation. STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon separating them. FORBIDDEN: Do NOT append brand names, pipe characters (|), or "10xDS" to the title under any circumstances. If the topic is short and needs only one part, keep it as a single bold statement without a colon.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST include the primary keyword.
        3. BLOG CONTENT: Write between 1600 and 1800 words. CRITICAL MAXIMUM: You are FORBIDDEN from exceeding 2000 words. Keep paragraphs concise to ensure you finish the entire structure under the limit. DO NOT abruptly cut off the text.
        4. STRUCTURE (Inside <content>):
           - **FORBIDDEN:** Do NOT wrap the content in markdown code blocks or fences like \`\`\`html. Start directly with the content.
           - Start with a strategic exactly 3-sentence introduction paragraph.
           - **HEADINGS:** For the body of the post, you MUST use **<h4><b>** tags for all section headings to make them perfectly bold (e.g., <h4><b>The Strategic Role</b></h4>). This is a strict visual requirement for the Framer template.
           - **DYNAMIC HEADINGS:** If your topic contains a number (e.g. "8 Ways", "7 Steps"), you MUST write exactly that many <h4> sections. If there is no number, default to exactly 5 <h4> sections. Each section MUST contribute at least 150 words.
           - **HEADING STYLE:** All <h4> headings must be formal, declarative, and professional. Do NOT force them to be questions.
           - **SECTION INTROS:** The introductory paragraph directly under every <h4> section MUST consist of STRICTLY EXACTLY 2 sentences (no more, no less) before any lists or bullet points.
           - **ABBREVIATIONS:** You MUST expand every acronym or abbreviation on its first occurrence (e.g., Artificial Intelligence (AI)), and use the abbreviation strictly thereafter.
           - **SENTENCE VARIETY:** Avoid repetitive sentence structures. Specifically, DO NOT repeatedly start sentences with words such as "This", "These", or "Additionally". Ensure dynamic and varied sentence transitions.
           - **BULLET POINTS (OPTIONAL):** Use HTML <ul> and <li> tags ONLY when bullet points are contextually appropriate. FORBIDDEN: Do NOT use <b> bold text or asterisks (*) as a substitute for bullet points. When bullets ARE used, they MUST be inside standard HTML <ul><li> tags. Each <li> MUST follow this exact format: <b>Short Heading:</b> exactly 2 full sentences of detailed description.
           - **NO SQUISHED BULLETS:** Never place multiple bullet points inside a single <p> paragraph. Every single bullet point MUST begin on a brand-new line inside its own separate <li> tag.
        5. NEVER use <h2> or <h3> for subheadings. ONLY use <h4>.
        6. INTERNAL LINKS: You are AUTHORIZED to use <a> tags ONLY for the phrases provided by the 'queryInternalSitemapTool'. DO NOT invent links. Ensure all internal links are contextually relevant to the surrounding content; only hyperlink a phrase if it fits naturally. ABSOLUTE RULE: You MUST add this exact inline style to every internal link you generate: style="color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;". CRITICAL: Each keyword phrase must appear as a hyperlink ONLY ONCE in the entire post. If you have already linked a phrase earlier, you MUST write it as plain text in all subsequent occurrences — never as a link again.
        7. CONCLUSION (MANDATORY): Include an "<h2>Conclusion</h2>" heading followed by exactly 3 to 4 sentences of professional wrap-up and this exact purple link: <a href="https://www.10xds.ai/contact/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        8. FAQ SECTION (MANDATORY): Include an "<h2>FAQ Section</h2>" heading with EXACTLY 5 questions. Wrap each question in <p><b>...</b></p> tags and each answer in <p>...</p> tags. Add a <br /> after every answer to ensure a clear vertical gap between each Q&A pair. Do not nest them; they must be sequential blocks.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,000 WORDS under ANY circumstances. You MUST ensure the total combined word count stays strictly at or below 2,000 words.

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
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies. You MUST use real-world statistics from your internal knowledge or web tools.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - STATISTICS & CLAIMS: You MUST pull diverse statistics. CRITICAL: You MUST ONLY use present-day data or futuristic projections. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: red; font-weight: bold; cursor: pointer;" data-source="[INSERT_REAL_URL]">[INSERT_STATISTIC]</span>. CRITICAL URL RULE: You MUST replace the placeholder "[INSERT_REAL_URL]" with the ACTUAL live URL returned by the 'tavilySearchTool'. If you did not get a URL from the tool, DO NOT use the stat-highlight tag at all. NEVER guess or hallucinate URLs from memory. NEVER output fake URLs. DO NOT use standard <a> tags for statistics.

        ${toolDirectives}
        
        USER PROVIDED OUTLINE (STRICT ADHERENCE REQUIRED):
        ${ideaBox}

        STRICT REQUIREMENTS (FRAMER SPECIFIC):
        1. BLOG TITLE: Inside <title> tags. Generate a fresh, high-authority, and catchy blog title BASED on the provided topic. STRICT CHARACTER LIMIT: The title MUST be between 50 and 60 characters to ensure perfect display without truncation. STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon separating them. FORBIDDEN: Do NOT append brand names, pipe characters (|), or "10xDS" to the title.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST include the primary keyword.
        3. BLOG CONTENT: You MUST deeply expand on the provided outline to reach a target of 1600 to 1800 words. MAXIMUM 2000 words. DO NOT abruptly cut off the text.
        4. CUSTOM STRUCTURE (Inside <content>):
           - ZERO STRUCTURAL HALLUCINATION: You MUST strictly mirror the EXACT headings and sections provided in the USER PROVIDED OUTLINE. Do NOT invent new headings. Do NOT convert bullet points into subheadings.
           - HEADING ENFORCEMENT: The very first line of your <content> output MUST be the <h4> heading for the first section of the outline. Do NOT skip the first heading. Do NOT write a generic introduction paragraph above the first heading unless "Introduction" is explicitly in the outline.
           - ONLY use the headings explicitly written in the outline. Do not add outside topics.
           - **FORBIDDEN:** Do NOT wrap the content in markdown code blocks or fences like \`\`\`html.
           - **HEADINGS:** For the body of the post, you MUST use **<h4><b>** tags for all section headings to make them perfectly bold (e.g., <h4><b>The Strategic Role</b></h4>). NEVER use <h2> or <h3> for subheadings.
           - **SECTION INTROS:** The introductory paragraph directly under every <h4> section MUST consist of STRICTLY EXACTLY 2 sentences (no more, no less) before any lists or bullet points.
           - **BULLET POINTS:** Use HTML <ul> and <li> tags. Do NOT use <b> bold text or asterisks (*) as a substitute for bullet points. Each <li> MUST begin on a brand-new line inside its own separate <li> tag.
           - **ABBREVIATIONS:** You MUST expand every acronym or abbreviation on its first occurrence, and use the abbreviation strictly thereafter.
           - **SENTENCE VARIETY:** Avoid repetitive sentence structures. Specifically, DO NOT repeatedly start sentences with words such as "This", "These", or "Additionally".
        5. INTERNAL LINKS: You are AUTHORIZED to use <a> tags ONLY for the phrases provided by the 'queryInternalSitemapTool'. DO NOT invent links. Ensure all internal links are contextually relevant to the surrounding content; only hyperlink a phrase if it fits naturally. ABSOLUTE RULE: You MUST add this exact inline style to every internal link you generate: style="color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;".
        6. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        7. CONCLUSION: Do NOT add a Conclusion unless it is explicitly requested in the USER PROVIDED OUTLINE. If it IS requested, include an "<h2>Conclusion</h2>" heading followed by 3 to 4 sentences of wrap-up and this exact purple link: <a href="https://www.10xds.ai/contact/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        8. FAQ SECTION: Do NOT add an FAQ section unless it is explicitly requested in the USER PROVIDED OUTLINE. If it IS requested, include an "<h2>FAQ Section</h2>" heading, wrap each question in <p><b>...</b></p> tags and each answer in <p>...</p> tags. Add a <br /> after every answer.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,000 WORDS under ANY circumstances. You must fulfill the entire USER PROVIDED OUTLINE without exceeding this limit.

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
        
        ${toolDirectives}
        
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}
        
        STRICT SURGICAL CONTRACT:
        1. SCOPE DETECTION: First, analyze the USER INSTRUCTION. Is the user asking for a LOCAL EDIT (e.g., "rewrite the intro", "add a stat to the conclusion", "fix paragraph 2") or a GLOBAL REWRITE (e.g., "rewrite the whole post to be casual", "change the tone of the entire article")?
        2. IF LOCAL EDIT (ZERO DRIFT): You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. Apply the requested action (INSERT, DELETE, or REPLACE) only to the targeted block.
        3. IF GLOBAL REWRITE: You are authorized to unlock the entire document. Completely rewrite the GROUND TRUTH HTML from top to bottom exactly according to the new style, tone, and angle requested in the USER INSTRUCTION. However, you MUST preserve the core structural requirements (e.g. 5 <h4> sections, Introduction, Conclusion, FAQ).
        4. STRUCTURE: Maintain all <h4>, <p>, and <ul> tags exactly as they appear in the GROUND TRUTH (or appropriate to the new style if doing a global rewrite). NEVER use <h2> or <h3> for subheadings, ONLY <h4>.
        5. FORMAT: Return the final, fully merged HTML within <content> tags. Ensure <title> and <meta> are included. For the <title>, you MUST follow this STRICT FORMAT: Use "Main Title: Compelling Subtitle" with a colon.
        6. Every post MUST have an <h2> Conclusion with the expert CTA link.
        7. RELATIVE REFERENCE RESOLUTION: If the USER INSTRUCTION uses vague or relative language such as "the new subheading", scan the GROUND TRUTH HTML structure from bottom to top and identify the most recently positioned <h4> or <h2> block as the target.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : (isCustomOutline ? customFramerOutlinePrompt : FRAMER_PROMPT);

    const result = streamText({
      model: vertex('gemini-2.5-pro'),
      prompt: aiPrompt,
      tools: tools,
      stopWhen: isStepCount(5),
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 8192,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
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
