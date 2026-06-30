import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';
import { streamText, tool, isStepCount } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';

export const maxDuration = 300; // Set timeout for Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description, ideaBox, sitemapLinks, referenceUrl1, referenceUrl2, referenceUrl3 } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const urlsToFetch = [referenceUrl1, referenceUrl2, referenceUrl3].filter(url => url && url.startsWith('http'));

    // Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const vertex = createVertex({
      project: projectId,
      location: 'us-central1',
      googleAuthOptions: { authClient: client as any }
    });

    const isSurgical = !!(feedback && currentContent);
    const isStructuralFeedback = isSurgical && (
      /\b(reorganize|restructure|merge\s+(sections|headings|h2|h3)|consolidate|headings|structure|7\s+h2|5\s+core|outline|layout)\b/i.test(feedback)
    );
    const isCustomOutline = !isSurgical && ideaBox && (
      /\bsection\s*\d+\b/i.test(ideaBox) || 
      (/\b(?:introduction|conclusion)\b/i.test(ideaBox) && ideaBox.split('\n').length > 4)
    );

    const tools = {
      scrapeReferenceUrlTool: tool({
        description: 'Scrape the text content of a specific URL to gather facts and learned context. Use this on the reference URLs provided by the user.',
        parameters: z.object({
          url: z.string().url().describe('The full HTTP URL to scrape'),
        }),
        execute: async ({ url }: { url: string }) => {
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
            return "Failed to fetch content or access denied.";
          } catch (err) {
            return "Failed to fetch URL.";
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
            // Return only the most relevant result facts and URLs to save tokens
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

    const BASE_PROMPT = `
        You are an expert SEO copywriter. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies. You MUST use real-world statistics from your internal knowledge or web tools.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - BRAND NEUTRALITY: Do not mention or reuse product names, brand names, or company names from reference URLs or learned context unless explicitly referring to 10xDS. Rewrite all examples and references in a generic manner.
        - STATISTICS & CLAIMS: You MUST pull diverse statistics. CRITICAL: You MUST ONLY use present-day data or futuristic projections. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: red; font-weight: bold; cursor: pointer;" data-source="[INSERT_REAL_URL]">[INSERT_STATISTIC]</span>. CRITICAL URL RULE: You MUST replace the placeholder "[INSERT_REAL_URL]" with the ACTUAL live URL returned by the 'tavilySearchTool'. If you did not get a URL from the tool, DO NOT use the stat-highlight tag at all. NEVER guess or hallucinate URLs from memory. NEVER output fake URLs. DO NOT use standard <a> tags for statistics.
        - EXAMPLES: Use only real, verifiable examples with proper attribution.

        ${toolDirectives}
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

        STRICT REQUIREMENTS:
        1. BLOG TITLE: 50-60 characters inside <title> tags.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST be highly informative, action-oriented, and densely packed with keyword-rich insights. MUST include the primary keyword.
        3. BLOG CONTENT: Write between 1800 and 2100 words. CRITICAL MAXIMUM: You are FORBIDDEN from exceeding 2100 words. Keep paragraphs concise to ensure you finish the entire structure under the limit. DO NOT abruptly cut off the text.
        4. STRUCTURE (Inside <content>):
           - Start with an exactly 3-sentence introduction paragraph.
           - **DYNAMIC H2 COUNT:** If the Topic title contains a number (e.g., "7 Steps"), you MUST write exactly that many content H2 sections. If the title has NO numbers, default to exactly 5 content H2 sections.
           - **MANDATORY ADDITIONS:** After your content H2s, you MUST always append exactly 1 Conclusion H2 and 1 FAQ H2.
           - **HEADING STYLE:** All H2 and H3 headings must be formal, declarative, and professional.
           - **INTERNAL LINKS:** You are AUTHORIZED to use <a> tags ONLY for the phrases returned by the queryInternalSitemapTool. DO NOT invent links. ABSOLUTE RULE: You MUST add this exact inline style to every internal link you generate: style="color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;". CRITICAL: Each keyword phrase must appear as a hyperlink ONLY ONCE.
           - **H3 SUB-SECTIONS:** Use <h3> sub-headings to break down complex H2 topics where appropriate. The introductory paragraph directly under each <h3> section MUST consist of STRICTLY EXACTLY 2 sentences.
           - **SECTION INTROS:** The introductory paragraph directly under every H2 section MUST consist of STRICTLY EXACTLY 2 sentences (no more, no less) before presenting any sub-sections or lists.
           - **ABBREVIATIONS:** You MUST expand every acronym or abbreviation on its first occurrence.
           - **SENTENCE VARIETY:** Avoid repetitive sentence structures.
           - **BULLET POINTS:** Use HTML <ul> and <li> tags ONLY where contextually appropriate.
           - Formatting: Use HTML <b>Bold Headers:</b> for specific sub-points where needed.
        5. Use <h2> and <h3> for headings. NEVER use Markdown headers (#).
        6. NO INTERNAL LINKS: DO NOT generate any <a> tags or links within the content (except for the expert CTA).
        7. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        8. CONCLUSION (MANDATORY): You MUST include an "<h2>Conclusion</h2>" heading followed by exactly 3 to 4 sentences of professional wrap-up and this exact purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        9. FAQ SECTION (MANDATORY): You MUST include an "<h2>FAQ Section</h2>" heading with EXACTLY 5 questions. Wrap each question in <p><b>...</b></p> tags and each answer in <p>...</p> tags. Add a <br /> after every answer.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,100 WORDS under ANY circumstances. Do NOT skip any structural requirements (Intro, 5 H2s, Conclusion, FAQs).

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const customOutlinePrompt = `
        You are an expert SEO copywriter. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - STATISTICS & CLAIMS: You MUST pull diverse statistics from external, real-world industry reports and websites. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: green; font-weight: bold; cursor: pointer;" data-source="[INSERT_REAL_URL]">[INSERT_STATISTIC]</span>.

        ${toolDirectives}
        
        USER PROVIDED OUTLINE (STRICT ADHERENCE REQUIRED):
        ${ideaBox}

        STRICT REQUIREMENTS:
        1. BLOG TITLE: 50-60 characters inside <title> tags.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST be highly informative.
        3. BLOG CONTENT: You MUST deeply expand on the provided outline to reach a target of 1800 to 2100 words. DO NOT write a short summary.
        4. CUSTOM STRUCTURE (Inside <content>):
           - ZERO STRUCTURAL HALLUCINATION: You MUST strictly mirror the EXACT headings and sections provided in the USER PROVIDED OUTLINE. Do NOT invent new headings.
           - HEADING ENFORCEMENT: The very first line of your <content> output MUST be the <h2> heading for the first section of the outline.
           - ONLY use the headings explicitly written in the outline.
           - Use <h2> for main outline sections. NEVER use Markdown headers (#).
           - **SECTION INTROS:** The introductory paragraph directly under every H2 section MUST consist of STRICTLY EXACTLY 2 sentences.
           - Format: Use HTML <b>Bold Headers:</b> for specific sub-points where needed, and <ul>/<li> for lists.
        5. INTERNAL LINKS: You are AUTHORIZED to use <a> tags ONLY for the phrases returned by the queryInternalSitemapTool. ABSOLUTE RULE: You MUST add this exact inline style to every internal link you generate: style="color: #9333ea; text-decoration: underline; text-decoration-color: #9333ea; font-weight: 500;".
        6. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        7. CONCLUSION: Do NOT add a Conclusion unless it is explicitly requested in the USER PROVIDED OUTLINE. If requested, it must be an "<h2>Conclusion</h2>" containing 3 to 4 sentences of wrap-up and this exact purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        8. FAQ SECTION: Do NOT add an FAQ section unless it is explicitly requested in the USER PROVIDED OUTLINE.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,100 WORDS under ANY circumstances.

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
        ${toolDirectives}
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

        STRICT SURGICAL CONTRACT — VIOLATING ANY OF THESE IS A FAILURE:
        1. SCOPE DETECTION: First, analyze the USER INSTRUCTION. Is the user asking for a LOCAL EDIT (e.g., "rewrite the intro", "add a stat to the conclusion", "fix paragraph 2") or a GLOBAL REWRITE (e.g., "rewrite the whole post to be casual", "change the tone of the entire article")?
        2. IF LOCAL EDIT (ZERO DRIFT): You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. Apply the requested action (INSERT, DELETE, or REPLACE) only to the targeted block.
        3. IF GLOBAL REWRITE: You are authorized to unlock the entire document. Completely rewrite the GROUND TRUTH HTML from top to bottom exactly according to the new style, tone, and angle requested in the USER INSTRUCTION. However, you MUST preserve the core structural requirements (e.g. 5 H2s, Introduction, Conclusion, FAQ).
        4. STRUCTURE: Maintain all <h2>, <h3>, and <ul> tags exactly as they appear in the GROUND TRUTH (or appropriate to the new style if doing a global rewrite).
        5. FORMAT: Return the final, fully merged HTML within <content> tags. Ensure <title> and <meta> are included.
        6. MANDATORY STANDARDS: 
           - Every post MUST have an <h2> Conclusion. 
           - The Conclusion MUST end with a purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        7. RELATIVE REFERENCE RESOLUTION: If the USER INSTRUCTION uses vague or relative language such as "the new subheading", scan the GROUND TRUTH HTML structure from bottom to top and identify the most recently positioned <h2> or <h3> block as the target.
        8. ESCAPE HATCH: If the USER INSTRUCTION is clearly a massive outline for a completely new topic that contradicts the GROUND TRUTH HTML, generate the new article from scratch to avoid logical contradictions.

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
        ${toolDirectives}
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

        STRICT STRUCTURAL REBUILD CONTRACT:
        1. RESTRUCTURE: You are hereby permitted and commanded to reorganize, merge, delete, or rename headings and paragraphs to match the USER RESTRUCTURE INSTRUCTION. Do not worry about the "Zero Drift" rule for this structural rewrite.
        2. PRESERVE SUBSTANCE: You must retain all existing facts, numbers, dates, tables, and bullet points from the GROUND TRUTH HTML. Do not invent any new facts.
        3. COMPLETION GUARANTEE: You MUST output the entire redesigned HTML from the introduction to the FAQ section. Do NOT stop generating or truncate early.
        4. FORMAT: Return the final, fully merged HTML within <content> tags. Ensure the <title> and <meta> tags are also included.
        5. ESCAPE HATCH: If the USER RESTRUCTURE INSTRUCTION is clearly a completely new topic or outline that has nothing to do with the GROUND TRUTH HTML, generate the new article from scratch to avoid logical contradictions.
        6. MANDATORY STANDARDS: The post must end with an <h2>Conclusion</h2> containing a 3-sentence prose wrap-up and this exact purple link: <a href="https://10xds.com/ask-the-expert/" style="color: #9333ea; font-weight: 700; text-decoration: none;">Talk to our experts to learn more</a>.
        
        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with structural changes applied</content>
    `;

    const aiPrompt = isSurgical 
      ? (isStructuralFeedback ? structuralPrompt : surgicalPrompt)
      : (isCustomOutline ? customOutlinePrompt : BASE_PROMPT);

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
        } catch (err) {
          controller.error(err);
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
    console.error("Agent API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
