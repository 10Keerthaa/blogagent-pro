import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content, metaDesc, imageUrl, infographicUrl, prompt, keywords, primaryKeyword, createdBy, authorEmail } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        // Standardized collection: blog_posts
        const postRef = db.collection('blog_posts').doc();
        const payload = {
            title,
            body: content, // Standardized field name
            metaDesc: metaDesc || '',
            imageUrl: imageUrl || '',
            infographicUrl: infographicUrl || '',
            prompt: prompt || '',
            keywords: keywords || [],
            primaryKeyword: primaryKeyword || '',
            status: 'review', // Default status for review tab
            createdAt: new Date().toISOString(),
            last_edited_at: new Date().toISOString(),
            created_by: createdBy || 'anonymous',
            authorEmail: authorEmail || ''
        };

        await postRef.set(payload);

        return NextResponse.json({ success: true, id: postRef.id, payload });
    } catch (error: any) {
        console.error("Save Draft Error:", error);
        return NextResponse.json({
            error: "Failed to save draft to Firestore",
            details: error.message
        }, { status: 500 });
    }
}
