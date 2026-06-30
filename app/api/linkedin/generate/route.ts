import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';
import { streamText, tool, isStepCount } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, primaryKeyword, feedback, currentContent, description, ideaBox, referenceUrl1, referenceUrl2, referenceUrl3 } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

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
        \n- STATISTICS REQUIREMENT: You MUST attempt to use the 'tavilySearchTool' to search for live statistics for your 'stat-highlight' tags. If the tool fails, returns an error, or finds nothing, you may provide statistics from memory, but DO NOT wrap them in 'stat-highlight' tags and DO NOT guess URLs. ONLY use 'stat-highlight' tags for URLs directly returned by the Tavily tool.\n
    `;

    const isSurgical = !!(feedback && currentContent);
    const isCustomOutline = !isSurgical && ideaBox && (
      /\bsection\s*\d+\b/i.test(ideaBox) || 
      (/\b(?:introduction|conclusion)\b/i.test(ideaBox) && ideaBox.split('\n').length > 4)
    );

    const BASE_PROMPT = `
        You are an elite B2B Executive Thought Leader, Industry Analyst, and Enterprise Strategist. Your objective is to write highly engaging, authoritative, and scannable articles or newsletters that analyze major paradigm shifts within a specific domain. Your target audience consists of C-suite executives, directors, and senior decision-makers who value strategic insights over tactical fluff.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        Primary Keyword: ${primaryKeyword || "None"}
        STRICT CONSTRAINT: Stay strictly focused on ${prompt}.
        
        ━━━ ANTI-HALLUCINATION CONTRACT (STRICT)
        - DO NOT invent fake data, fake statistics, fake names, or fake case studies. You MUST use real-world statistics from your internal knowledge or web tools.
        - Every sentence must add unique technical value. ZERO FLUFF.
        - STATISTICS & CLAIMS: You MUST pull diverse statistics. CRITICAL: You MUST ONLY use present-day data or futuristic projections. Wrap the exact statistic text in this HTML tag: <span class="stat-highlight" style="color: red; font-weight: bold; cursor: pointer;" data-source="[INSERT_REAL_URL]">[INSERT_STATISTIC]</span>. CRITICAL URL RULE: You MUST replace the placeholder "[INSERT_REAL_URL]" with the ACTUAL live URL returned by the 'tavilySearchTool'. If you did not get a URL from the tool, DO NOT use the stat-highlight tag at all. NEVER guess or hallucinate URLs from memory. NEVER output fake URLs. DO NOT use standard <a> tags for statistics.

        ${toolDirectives}

        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

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
           - **SECTION INTROS:** The introductory paragraph directly under every <h2> section MUST consist of STRICTLY EXACTLY 2 sentences (no more, no less) before presenting any sub-sections or lists.
           - **ABBREVIATIONS:** You MUST expand every acronym or abbreviation on its first occurrence (e.g. Return on Investment (ROI)), and use the abbreviation strictly thereafter.
           - **SENTENCE VARIETY:** Avoid repetitive sentence structures. Specifically, DO NOT repeatedly start sentences with words such as "This", "These", or "Additionally".
           - **NO FAQs:** Do NOT include any FAQ sections or Q&A pairs under any circumstances.
           - **NO bullet lists under H3:** Under every <h3> heading, you must write ONLY prose paragraphs of exactly 3 to 4 sentences. No bullet points or numbered lists are allowed under H3 headings.
           - **H2 Bullet Point Placement & HTML Structure:** Bullet points can ONLY be placed directly under main <h2> headings. You MUST use a standard HTML <ul> list, and every single bullet item MUST be placed inside its own separate <li> tag (e.g., <ul><li><b>Bolded Core Concept:</b> exactly 1 sentence of explanation.</li><li><b>Another Concept:</b> ...</li></ul>).
           - **NO SQUISHED BULLETS:** Never place multiple bolded concepts inside a single paragraph or inside a single <li> tag. Every single core concept must begin on a brand-new line inside its own separate <li> tag.
           - **Roadmap Section:** Include an optional "Crawl, Walk, Run" phased adoption framework ONLY if it is contextually relevant to the implementation of the topic.
        8. NO INTERNAL LINKS: DO NOT generate any <a> tags or links within the content.
        9. CONCLUSION (MANDATORY): You MUST include a final "<h2>Conclusion</h2>" heading followed by exactly 1 paragraph of 3 to 4 sentences looking towards the future and ending on a strong, definitive statement celebrating the new operational era.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,100 WORDS under ANY circumstances. You MUST compress your writing and weave facts into the existing H2 sections. Do NOT skip any structural requirements, but you MUST ensure the total combined word count stays strictly at or below 2,100 words.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>...</content>
    `;

    const customLinkedInOutlinePrompt = `
        You are an elite B2B Executive Thought Leader, Industry Analyst, and Enterprise Strategist. Your objective is to write highly engaging, authoritative, and scannable articles or newsletters.
        
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

        STRICT PROMPT BLUEPRINT & RULES:
        1. TITLE: 50-60 characters inside <title> tags.
        2. META DESCRIPTION: Exactly 155 characters inside <meta> tags. MUST be action-oriented, densely packed with keyword-rich insights, and include the primary keyword.
        3. CONTENT WORD COUNT: You MUST deeply expand on the provided outline to reach a target of 1500 to 2000 words. DO NOT write a short summary. Write comprehensively for every single bullet point to ensure you hit the word count. MAXIMUM 2100 words. DO NOT abruptly cut off the text.
        4. TONE PROFILE: Authoritative & Domain-Native, Visionary yet Pragmatic.
        5. EXECUTIVE SCANNABILITY: Every single paragraph throughout the article MUST contain exactly 3 to 4 sentences, with TWO strict exceptions: the very first introductory paragraph MUST consist of exactly 3 sentences, and the introductory paragraph directly under every <h2> subheading MUST consist of exactly 2 sentences.
        6. CUSTOM STRUCTURE (Inside <content>):
           - ZERO STRUCTURAL HALLUCINATION: You MUST strictly mirror the EXACT headings and sections provided in the USER PROVIDED OUTLINE. Do NOT invent new headings. Do NOT convert bullet points into subheadings.
           - HEADING ENFORCEMENT: The very first line of your <content> output MUST be the <h2> heading for the first section of the outline. Do NOT skip the first heading. Do NOT write a generic introduction paragraph above the first heading unless "Introduction" is explicitly in the outline.
           - ONLY use the headings explicitly written in the outline. Do not add outside topics.
           - Use HTML <h2> and <h3> tags ONLY. NEVER use Markdown headers (#).
           - **NO FAQs:** Do NOT include any FAQ sections or Q&A pairs under any circumstances, even if requested.
           - **NO bullet lists under H3:** Under every <h3> heading, you must write ONLY prose paragraphs. No bullet points allowed under H3 headings.
           - **H2 Bullet Point Placement:** Bullet points can ONLY be placed directly under main <h2> headings inside a standard HTML <ul> list. Every single bullet item MUST be inside its own separate <li> tag.
           - **URL INTEGRATION:** Weave facts naturally inside the most relevant sections of the outline.
        7. NO INTERNAL LINKS: DO NOT generate any <a> tags or links within the content.
        8. NO REDUNDANCY: Do not repeat the blog title as an <h1>.
        9. CONCLUSION: Do NOT add a Conclusion unless it is explicitly requested in the USER PROVIDED OUTLINE. If it IS requested, include a final "<h2>Conclusion</h2>" heading followed by exactly 1 paragraph of 3 to 4 sentences looking towards the future.

        ABSOLUTE FINAL DIRECTIVE: 
        Your ENTIRE generated output inside <content> MUST NOT EXCEED 2,100 WORDS under ANY circumstances. You must fulfill the entire USER PROVIDED OUTLINE without exceeding this limit.

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
        
        ${toolDirectives}
        
        ${ideaBox ? `\nADDITIONAL CONTENT DETAILS & INSTRUCTIONS: \n${ideaBox}\n(CRITICAL: You MUST incorporate these specific details naturally into the content. Do NOT ignore this.)\n` : ""}

        STRICT SURGICAL CONTRACT — VIOLATING ANY OF THESE IS A FAILURE:
        1. SCOPE DETECTION: First, analyze the USER INSTRUCTION. Is the user asking for a LOCAL EDIT (e.g., "rewrite the intro", "add a stat to the conclusion") or a GLOBAL REWRITE (e.g., "rewrite the whole post to be casual", "change the tone of the entire article")?
        2. IF LOCAL EDIT (ZERO DRIFT): You must return the GROUND TRUTH HTML with EXTREME PRECISION. Do not rephrase, move, or edit any sentence, heading, or paragraph that was not explicitly mentioned in the USER INSTRUCTION. Apply the requested action (INSERT, DELETE, or REPLACE) only to the targeted block.
        3. IF GLOBAL REWRITE: You are authorized to unlock the entire document. Completely rewrite the GROUND TRUTH HTML from top to bottom exactly according to the new style, tone, and angle requested in the USER INSTRUCTION. However, you MUST preserve the LinkedIn structural requirements.
        4. TONE & FORMAT ALIGNMENT: Any new sections or global rewrites must strictly follow the LinkedIn style guide:
           - Every paragraph must consist of exactly 3 to 4 sentences (intro paragraph is 3 sentences, intro under H2 is 2 sentences).
           - H3 headings must only have prose paragraphs (no bullets).
           - Bullets can only live under H2 headings, must follow the <b>Bolded Core Concept:</b> followed by exactly 1 sentence rule, inside <li>.
           - No FAQ section under any circumstances.
           - Word count stays within 1500 to 2000 words, and never exceeds 2100 words.
        5. STRUCTURE: Maintain all <h2>, <h3>, and <ul> tags exactly as they appear in the GROUND TRUTH (or appropriate to the new style if doing a global rewrite).
        6. FORMAT: Return the final, fully merged HTML within <content> tags. Ensure <title> and <meta> are included.
        7. RELATIVE REFERENCE RESOLUTION: If the USER INSTRUCTION uses vague or relative language such as "the new subheading", scan the GROUND TRUTH HTML structure from bottom to top and identify the most recently positioned <h2> or <h3> block as the target.

        RESULT FORMAT:
        <title>...</title>
        <meta>...</meta>
        <content>Full Updated HTML with surgical changes applied</content>
    ` : (isCustomOutline ? customLinkedInOutlinePrompt : BASE_PROMPT);

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
    console.error("API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
