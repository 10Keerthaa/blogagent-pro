import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Find the most recent 'in_progress' draft for this user
        const snapshot = await db.collection('blog_posts')
            .where('created_by', '==', userId)
            .where('status', '==', 'in_progress')
            .orderBy('last_edited_at', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ message: "No in-progress draft found to delete" });
        }

        // Delete the draft
        const docId = snapshot.docs[0].id;
        await db.collection('blog_posts').doc(docId).delete();

        return NextResponse.json({ success: true, deletedId: docId });
    } catch (error: any) {
        console.error("Delete In-Progress Draft Error:", error);
        return NextResponse.json({
            error: "Failed to delete in-progress draft",
            details: error.message
        }, { status: 500 });
    }
}
