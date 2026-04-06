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

    // Process Add User
    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    // 1. Create User in Firebase Auth
    // Use a default temporary password that they must change
    const tempPassword = "BlogAgent2026!";
    
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({
            email,
            password: tempPassword,
            emailVerified: true
        });
    } catch (authError: any) {
        if (authError.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
        }
        throw authError;
    }

    // 2. Create Firestore Profile
    await db.collection("user_profiles").doc(userRecord.uid).set({
      email,
      role,
      id: userRecord.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ 
        success: true, 
        message: `User ${email} created successfully with role ${role}`,
        tempPassword 
    });

  } catch (error: any) {
    console.error("Add User Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
