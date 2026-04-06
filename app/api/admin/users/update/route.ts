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

    // Process Update
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return NextResponse.json({ error: "Missing userId or newRole" }, { status: 400 });
    }

    // Update Firestore profile
    await db.collection("user_profiles").doc(userId).update({
      role: newRole,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: `User role updated to ${newRole}` });

  } catch (error: any) {
    console.error("Update Role Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
