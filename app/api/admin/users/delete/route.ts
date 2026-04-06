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

    // Verify Firebase Token
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(token);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Verify ADMIN permissions of the caller
    const callerSnap = await db.collection('user_profiles').doc(decodedToken.uid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    // Process Delete User
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // SAFETY: Prevent self-deletion
    if (userId === decodedToken.uid) {
        return NextResponse.json({ error: "Cannot delete your own administrator account" }, { status: 403 });
    }

    // 1. Delete Firestore Profile
    await db.collection("user_profiles").doc(userId).delete();

    // 2. Delete User from Firebase Auth
    try {
        await admin.auth().deleteUser(userId);
    } catch (authError: any) {
        console.warn("User deleted from Firestore but not Auth (might not exist in Auth):", authError.message);
    }

    return NextResponse.json({ 
        success: true, 
        message: `User ${userId} deleted successfully`
    });

  } catch (error: any) {
    console.error("Delete User Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
