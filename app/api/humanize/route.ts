import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    const humanizePrompt = `
        Act as a Senior Human Editor.
        Goal: Rewrite the text below to sound like it was written by an expert human, not an AI.

        Original Title: ${title || "Untitled Post"}

        STRICT TECHNICAL CONSTRAINTS:
        1. Structural Integrity: Return the EXACT same HTML tags (<h2>, <p>, <ul>, <li>). Do not add or remove any sections.
        2. Keyword Protection: Do NOT change any text inside <span style='color: #666666;'>. These are protected SEO keywords — leave them completely untouched, including the surrounding <span> tag.
        3. Link Protection: Do NOT change any text inside <a> tags. The anchor text must remain exactly as it is, including href attributes and class names.
        4. NO Markdown: Use ONLY valid HTML. Do NOT use backticks (\`\`\`), asterisks (*), or (**) for headings or emphasis. Use <i> or <b> if needed.
        5. ZERO REDUNDANCY: If a lead-in sentence already introduces a list (e.g. "Consider these factors:"), do NOT add a redundant bold header before the <ul>.
        6. TIGHT SPACING: Do not add empty <p> tags or unnecessary <br> breaks between headings, text, and lists.

        HUMANIZING STYLE RULES:
        1. Rhythm: Mix short, punchy sentences with longer, more descriptive ones. Avoid uniform sentence length.
        2. Voice: Use an 'Authoritative Executive' tone. Use 'We' or 'I' where appropriate to show ownership and expertise.
        3. Vocabulary: Delete AI buzzwords such as 'Unleash', 'Dive deep', 'Landscape', 'Furthermore', 'Moreover', 'In the realm of', 'It is important to note', 'In conclusion'. Replace them with plain, direct, professional English.
        4. Transitions: Use natural, human transitions like 'Moving on to...', 'The reality is...', 'Simply put', 'Here is the thing:', instead of robotic connectors.

        CONTENT TO HUMANIZE:
        ---
        ${content}
        ---

        REFINED HUMANIZED VERSION (HTML ONLY):
      `;

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:streamGenerateContent`;

    const response = await client.request({
      url,
      method: 'POST',
      responseType: 'stream',
      data: {
        contents: [{ role: "user", parts: [{ text: humanizePrompt }] }],
        generationConfig: {
          temperature: 0.85, 
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
    console.error("Humanize API Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
