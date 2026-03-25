import { NextResponse } from "next/server";
import { uploadToGCS } from '@/lib/gcs';
import { generateHeroBanner } from '@/lib/imageProcessor';
import { getGoogleAuth } from '@/lib/googleAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, keywords, feedback } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Step 1: Authenticate with Vertex AI
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);

    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    // Task 1: Generate Blog Content via Vertex AI Gemini 2.5 Flash
    let blogData: { title: string; metaDesc: string; content: string } = {
      title: "",
      metaDesc: "",
      content: ""
    };

    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

      const aiPrompt = `
        You are an expert SEO copywriter. Generate a high-quality, long-form blog post.
        
        Topic: ${prompt}
        Keywords to include: ${keywords || "None"}
        STRICT CONSTRAINT: The content must be EXCLUSIVELY about the topic above. Do not include unrelated industry jargon, tangents, or generic filler content. Stay strictly focused on ${prompt}.
        ${feedback ? `\nReference this feedback for refinement: ${feedback}` : ""}

        STRICT REQUIREMENTS:
        1. BLOG TITLE (Meta Title):
           - CRITICAL RULE: Length MUST be stringently between 50 and 60 characters. Count spaces. Do not fail this constraint.
           - Must include at least 1 keyword.
        2. META DESCRIPTION:
           - CRITICAL RULE: Length MUST be strictly between 150 and 160 characters.
           - Must include at least 2 keywords.
        3. BLOG CONTENT:
           - Total Word Count MUST be between 1500 and 2000 words.
           - Expand each section with detailed explanations, industry case studies, and practical examples.
           - Do NOT use Markdown (## or ###) for headings. Instead, use standard HTML tags (<h2>, <h3>) so WordPress can apply its native formatting.
           - Do NOT include an H1 or article title at the beginning of the content. Start the blog content directly with the introductory paragraph.
           - Prioritize bulleted points.

        FORMATTING REQUIREMENT:
        You MUST wrap your output in these custom tags. DO NOT use JSON.
        <title>The Blog Title</title>
        <meta>The SEO Meta Description</meta>
        <content>The full HTML blog post content goes here...</content>

        Constraint: Use EXCLUSIVELY the tags above. No markdown code blocks.
      `;

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain" // Raw text for maximum stability
          }
        }
      });

      const data = response.data as any;
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Extraction via Regex (Bypasses all JSON parsing fragility)
      const titleMatch = responseText.match(/<title>([\s\S]*?)<\/title>/i);
      const metaMatch = responseText.match(/<meta>([\s\S]*?)<\/meta>/i);
      const contentMatch = responseText.match(/<content>([\s\S]*?)<\/content>/i);

      blogData = {
        title: titleMatch ? titleMatch[1].trim() : prompt,
        metaDesc: metaMatch ? metaMatch[1].trim() : "Generated SEO blog post",
        content: contentMatch ? contentMatch[1].trim() : responseText // Fallback to raw text if tags fail
      };

      if (!titleMatch && !metaMatch && !contentMatch) {
        console.warn("Tag-based extraction failed, using raw response as fallback.");
      }

    } catch (error: any) {
      console.error("Vertex AI Content Generation Error:", error);
      return NextResponse.json({
        error: "Content Generation Failed",
        details: error.message
      }, { status: 500 });
    }

    // Task 2: Implement the Featured Image via Vertex AI
    let generatedImageUrl = '';
    try {
      const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
      const imagePrompt = `A stunning, high-quality photograph representing ${prompt}. The image should be central to the topic, with a professional minimalist aesthetic, elegant lighting, and premium corporate color palette. No text.`;

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          instances: [{ prompt: imagePrompt }],
          parameters: { sampleCount: 1, aspectRatio: "4:3" },
        },
      });

      const data = response.data as any;
      if (data.predictions?.[0]?.bytesBase64Encoded) {
        const base64Data = data.predictions[0].bytesBase64Encoded;
        const buffer = Buffer.from(base64Data, 'base64');

        // Task 2.5: Generate the baked-in Hero Banner (Tint + Title)
        const bannerBuffer = await generateHeroBanner(buffer, blogData.title);

        const fileName = `featured-${Date.now()}.png`;

        console.log("Uploading Featured Image to GCS...");
        generatedImageUrl = await uploadToGCS(bannerBuffer, fileName, 'image/png');
        console.log("GCS Upload Success:", generatedImageUrl);
      } else {
        throw new Error("Invalid image response");
      }
    } catch (vertexError) {
      console.error("Vertex AI Image Error:", vertexError);
      const fallbackKeyword = keywords ? keywords.split(',')[0].trim() : 'technology';
      generatedImageUrl = `https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=960&q=720&q=80`;
    }

    return NextResponse.json({
      title: blogData.title,
      metaDesc: blogData.metaDesc,
      content: blogData.content,
      imageUrl: generatedImageUrl
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
