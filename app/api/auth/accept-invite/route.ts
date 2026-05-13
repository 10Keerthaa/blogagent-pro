import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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

    const { email, name, uid } = decodedToken;

    if (!email) {
        return NextResponse.json({ error: "Email not found in token" }, { status: 400 });
    }

    // 1. Check if user is already fully registered in user_profiles
    const userDoc = await db.collection('user_profiles').doc(uid).get();
    if (userDoc.exists) {
        return NextResponse.json({ success: true, message: "Already registered" });
    }

    // 2. Check if they were explicitly invited
    const inviteRef = db.collection('invited_users').doc(email.toLowerCase());
    const inviteSnap = await inviteRef.get();

    if (inviteSnap.exists) {
        const inviteData = inviteSnap.data();
        
        // Add to user_profiles
        await db.collection('user_profiles').doc(uid).set({
            full_name: name || 'Team Member',
            email: email,
            role: inviteData?.role || 'editor',
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Notification for Admins
        try {
            const adminQuery = await db.collection('user_profiles').where('role', '==', 'admin').get();
            const batch = db.batch();
            adminQuery.docs.forEach(adminDoc => {
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    recipientId: adminDoc.id,
                    type: 'invite_accepted',
                    title: 'New Team Member',
                    message: `${email} has accepted the invitation and joined as ${inviteData?.role || 'editor'}.`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
            });
            await batch.commit();
        } catch (e) {
            console.error("Failed to create notification:", e);
        }

        // Cleanup invitation
        await inviteRef.delete();
        
        return NextResponse.json({ success: true, role: inviteData?.role || 'editor' });
    } else {
        // 3. If not invited, check if this is the very first system user (Admin)
        const initRef = db.collection('system_config').doc('init');
        const initSnap = await initRef.get();
        
        if (!initSnap.exists) {
            await db.collection('user_profiles').doc(uid).set({
                full_name: name || 'Admin',
                email: email,
                role: 'admin',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });
            await initRef.set({ initialized: true });
            return NextResponse.json({ success: true, role: 'admin' });
        }

        // If not first user and not invited, deny access
        return NextResponse.json({ error: "Access Denied. You must be invited by an administrator to join this platform." }, { status: 403 });
    }
  } catch (error: any) {
    console.error("Accept Invite Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
