import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const draftsSnapshot = await db.collection('blog_posts')
            .where('status', '==', 'review')
            .get();

        console.log(`Found ${draftsSnapshot.size} review-ready drafts in database`);

        const drafts = draftsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure dates are parsed cleanly for the frontend logic
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString()
            };
        }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ success: true, drafts });
    } catch (error: any) {
        console.error("Get Drafts Error:", error);
        return NextResponse.json({
            error: "Failed to fetch pending drafts",
            details: error.message
        }, { status: 500 });
    }
}
