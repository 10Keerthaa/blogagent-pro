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
    const { email, role, msToken } = await req.json();
    
    console.log(`[Admin API] Inviting user: ${email}, Role: ${role}, Has Token: ${!!msToken}`);

    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    // 1. Store Invitation in Firestore
    // This allows the user to log in via Microsoft later
    await db.collection("invited_users").doc(email.toLowerCase()).set({
      email: email.toLowerCase(),
      role,
      invited_by: decodedToken.email,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Send Invitation Email via Microsoft Graph (if token is provided)
    let emailSent = false;
    if (msToken) {
        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://blogagent-pro.vercel.app';
            const emailContent = {
                message: {
                    subject: "You're Invited: Join the BlogAgent Pro Editorial Team",
                    body: {
                        contentType: "HTML",
                        content: `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <div style="display: inline-block; padding: 12px; background-color: #8b5cf6; border-radius: 50%; color: white; font-weight: bold; font-size: 24px; margin-bottom: 10px;">⚡</div>
                                    <h1 style="color: #1e1b4b; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">BlogAgent <span style="color: #8b5cf6;">Pro</span></h1>
                                </div>
                                
                                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                                    Hello, <br/><br/>
                                    You have been invited to join the 10xDS editorial team as an <strong>${role.toUpperCase()}</strong>.
                                </p>
                                
                                <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #8b5cf6;">
                                    <p style="margin: 0; color: #1e293b; font-weight: 600; font-size: 14px;">Platform Privileges:</p>
                                    <ul style="margin: 10px 0 0 20px; color: #64748b; font-size: 14px; padding: 0;">
                                        <li>High-Fidelity Content Generation</li>
                                        <li>Executive Editorial Review</li>
                                        <li>Direct CMS Integration</li>
                                    </ul>
                                </div>

                                <div style="text-align: center; margin-top: 35px;">
                                    <a href="${appUrl}" style="background-color: #8b5cf6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.2);">
                                        ACCEPT INVITATION & SIGN IN
                                    </a>
                                </div>

                                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                    This invitation was sent by your administrator. Please sign in using your corporate Microsoft account to activate your access.
                                </p>
                            </div>
                        `
                    },
                    toRecipients: [
                        { emailAddress: { address: email } }
                    ]
                }
            };

            const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${msToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailContent)
            });

            if (graphResponse.ok) {
                emailSent = true;
            } else {
                console.error("Microsoft Graph Error:", await graphResponse.text());
            }
        } catch (e) {
            console.error("Failed to send invitation email:", e);
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: emailSent 
            ? `User ${email} invited. Official email sent from your account.` 
            : `User ${email} added to authorized list (Email delivery failed).`,
        emailSent
    });

  } catch (error: any) {
    console.error("Add User Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
