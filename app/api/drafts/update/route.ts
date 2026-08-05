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
