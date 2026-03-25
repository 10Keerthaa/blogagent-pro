import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const draftsSnapshot = await db.collection('drafts')
            .where('status', '==', 'pending')
            .get(); // Optional: .orderBy('createdAt', 'desc') but requires composite index

        const drafts = draftsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a: any, b: any) => b.createdAt - a.createdAt);

        return NextResponse.json({ success: true, drafts });
    } catch (error: any) {
        console.error("Get Drafts Error:", error);
        return NextResponse.json({
            error: "Failed to fetch pending drafts",
            details: error.message
        }, { status: 500 });
    }
}
