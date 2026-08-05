import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import * as admin from 'firebase-admin';

export async function POST(req: Request) {
    try {
        // Verify token & role
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
        }

        // Check user role
        const userSnap = await db.collection('user_profiles').doc(decodedToken.uid).get();
        const role = userSnap.exists ? userSnap.data()?.role : null;
        if (role === 'viewer') {
            return NextResponse.json({ error: 'Forbidden: Viewers are read-only' }, { status: 403 });
        }

        const body = await req.json();
        const { title, content, metaDesc, imageUrl, infographicUrl, prompt, keywords, primaryKeyword, createdBy, authorEmail, status, categories, refinementHistory, ideaBox, referenceUrl1, referenceUrl2, referenceUrl3 } = body;

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
            status: status || 'pending', // Standardized status for editorial review
            categories: categories || [253],
            refinementHistory: refinementHistory || [],
            ideaBox: ideaBox || '',
            referenceUrl1: referenceUrl1 || '',
            referenceUrl2: referenceUrl2 || '',
            referenceUrl3: referenceUrl3 || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            last_edited_at: admin.firestore.FieldValue.serverTimestamp(),
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
