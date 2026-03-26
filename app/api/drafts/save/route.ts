import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content, metaDesc, imageUrl, infographicUrl, prompt, keywords } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        const draftRef = db.collection('drafts').doc();
        const payload = {
            title,
            content,
            metaDesc: metaDesc || '',
            imageUrl: imageUrl || '',
            infographicUrl: infographicUrl || '',
            prompt: prompt || '',
            keywords: keywords || [],
            status: 'pending',
            createdAt: Date.now(),
            author: 'User'
        };

        await draftRef.set(payload);

        return NextResponse.json({ success: true, id: draftRef.id, payload });
    } catch (error: any) {
        console.error("Save Draft Error:", error);
        return NextResponse.json({
            error: "Failed to save draft to Firestore",
            details: error.message
        }, { status: 500 });
    }
}
