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
                    subject: "You're Invited: Join the 10xBlogAgent Editorial Team",
                    body: {
                        contentType: "HTML",
                        content: `
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; padding: 48px 0;">
                              <tr>
                                <td align="center">
                                  
                                  <table border="0" cellpadding="0" cellspacing="0" width="560" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); overflow: hidden;">
                                    
                                    <!-- GRADIENT TOP ACCENT BAR -->
                                    <tr>
                                      <td height="4" style="background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%);"></td>
                                    </tr>

                                    <!-- BRAND HEADER -->
                                    <tr>
                                      <td align="center" style="padding: 32px 0 24px 0;">
                                        <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">
                                          10xBlog<span style="color: #a78bfa;">Agent</span>
                                        </span>
                                      </td>
                                    </tr>
 
                                    <!-- BODY CONTENT -->
                                    <tr>
                                      <td style="padding: 0 48px 40px 48px;">
                                        
                                        <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
                                          You're Invited to Join the Team
                                        </p>
                                        
                                        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0; text-align: center;">
                                          You have been formally invited to join the official <strong>Editorial Team</strong> on the <strong>10xBlogAgent</strong> platform as an <strong style="color: #c084fc; background-color: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); padding: 4px 10px; border-radius: 20px; font-size: 12px; letter-spacing: 0.05em; display: inline-block; margin-left: 4px;">${role.toUpperCase()}</strong>.
                                        </p>
 
                                        <!-- PRIVILEGES BLOCK -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; margin-bottom: 32px;">
                                          <tr>
                                            <td style="padding: 24px;">
                                              <p style="color: #9ca3af; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 16px 0;">
                                                Your Platform Privileges:
                                              </p>
                                              
                                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                  <td width="24" valign="top" style="color: #a78bfa; font-weight: bold; font-size: 14px; padding-bottom: 12px;">✓</td>
                                                  <td style="color: #e5e7eb; font-size: 13px; padding-bottom: 12px; font-weight: 500; line-height: 1.4;">High-Fidelity Content Generation & AI Humanizer</td>
                                                </tr>
                                                <tr>
                                                  <td width="24" valign="top" style="color: #a78bfa; font-weight: bold; font-size: 14px; padding-bottom: 12px;">✓</td>
                                                  <td style="color: #e5e7eb; font-size: 13px; padding-bottom: 12px; font-weight: 500; line-height: 1.4;">Executive Review & Approval Pipeline</td>
                                                </tr>
                                                <tr>
                                                  <td width="24" valign="top" style="color: #a78bfa; font-weight: bold; font-size: 14px;">✓</td>
                                                  <td style="color: #e5e7eb; font-size: 13px; font-weight: 500; line-height: 1.4;">Direct Framer & WordPress CMS Publishing</td>
                                                </tr>
                                              </table>
                                              
                                            </td>
                                          </tr>
                                        </table>
 
                                        <!-- SOLID BULLETPROOF BUTTON -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                          <tr>
                                            <td align="center" style="padding: 8px 0 20px 0;">
                                              <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                  <td align="center" style="border-radius: 6px; background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%);">
                                                    <a href="${appUrl}" target="_blank" style="display: inline-block; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.08em;">
                                                      Get Started
                                                    </a>
                                                  </td>
                                                </tr>
                                              </table>
                                            </td>
                                          </tr>
                                        </table>
 
                                        <!-- HELP TEXT / DISCLAIMER -->
                                        <p style="color: #6b7280; font-size: 11px; line-height: 1.6; text-align: center; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid #1f2937;">
                                          This is an automated system email. To secure your account, please register and authenticate to the <strong>10xBlogAgent</strong> platform using your authorized Microsoft AD credentials.
                                        </p>
 
                                      </td>
                                    </tr>
                                  </table>
 
                                </td>
                              </tr>
                            </table>
                        `
                    },
                    toRecipients: [
                        { emailAddress: { address: email } }
                    ]
                }
            };

            const senderEndpoint = process.env.SHARED_EMAIL_SENDER 
                ? `https://graph.microsoft.com/v1.0/users/${process.env.SHARED_EMAIL_SENDER}/sendMail`
                : 'https://graph.microsoft.com/v1.0/me/sendMail';

            const graphResponse = await fetch(senderEndpoint, {
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
