import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { id, action, updateData } = await req.json();

        if (!id || !action) {
            return NextResponse.json({ error: "Draft ID and action are required" }, { status: 400 });
        }

        const draftRef = db.collection('blog_posts').doc(id);
        const draft = await draftRef.get();

        if (!draft.exists) {
            return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        }

        let updates: any = {};

        if (action === 'reject') {
            updates.status = 'rejected';
        } else if (action === 'approve' || action === 'publish') {
            updates.status = 'published';
        } else if (action === 'edit' && updateData) {
            // Allows AI refinement content updates
            updates = { ...updateData };
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        updates.updatedAt = Date.now();
        await draftRef.update(updates);

        return NextResponse.json({ success: true, action: action, updatedFields: updates });
    } catch (error: any) {
        console.error("Update Draft Error:", error);
        return NextResponse.json({
            error: "Failed to update draft in Firestore",
            details: error.message
        }, { status: 500 });
    }
}
