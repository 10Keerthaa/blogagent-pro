import { NextResponse } from "next/server";
import { getGoogleAuth } from '@/lib/googleAuth';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { text, action } = await req.json();

        if (!text || !action) {
            return NextResponse.json({ error: "Text and action are required" }, { status: 400 });
        }

        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();

        let instruction = "";
        switch (action) {
            case 'rephrase':
                instruction = "Rephrase this content to be more professional and engaging while keeping the original meaning.";
                break;
            case 'shorten':
                instruction = "Summarize or shorten this content significantly while preserving the core message.";
                break;
            case 'expand':
                instruction = "Expand on this content by adding relevant details and professional context.";
                break;
            case 'humanize':
                instruction = "Rewrite this content to sound like it was written by an expert human, not an AI. Use a natural rhythm (mix sentence lengths), professional vocabulary (avoid 'unleash', 'landscape', 'moreover'), and seamless transitions. Return only the rewritten text.";
                break;
            default:
                instruction = "Refine this text professionally.";
        }

        const aiPrompt = `
      You are a professional editor. Apply the following instruction to the provided text.
      Instruction: ${instruction}
      Text to refine: "${text}"
      
      STRICT REQUIREMENTS:
      1. Return ONLY the refined text. 
      2. DO NOT include any conversational filler (e.g., "Here is the shortened version").
      3. PRESERVE the tone and context of the surrounding article.
      4. DO NOT use Markdown formatting unless it was present in the original (usually plain text).
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
                    maxOutputTokens: 2048,
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
