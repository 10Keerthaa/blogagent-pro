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
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; padding: 40px 0;">
                              <tr>
                                <td align="center">
                                  
                                  <table border="0" cellpadding="0" cellspacing="0" width="560" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden;">
                                    
                                    <!-- BRAND HEADER BAR -->
                                    <tr>
                                      <td align="center" style="background-color: #0f172a; padding: 28px 0; border-bottom: 3px solid #8b5cf6;">
                                        <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                                          10xBlog<span style="color: #8b5cf6;">Agent</span>
                                        </span>
                                      </td>
                                    </tr>
 
                                    <!-- BODY CONTENT -->
                                    <tr>
                                      <td style="padding: 40px 48px;">
                                        
                                        <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                                          Invitation to Join the 10xDS Editorial Team
                                        </p>
                                        
                                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 28px 0;">
                                          Hello,<br/><br/>
                                          You have been formally invited to join the official <strong>Editorial Team</strong> on the <strong>10xBlogAgent</strong> platform as an <strong style="color: #7c3aed; background-color: #f5f3ff; padding: 4px 8px; border-radius: 4px; font-size: 13px;">${role.toUpperCase()}</strong>.
                                        </p>
 
                                        <!-- PRIVILEGES BLOCK -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 32px;">
                                          <tr>
                                            <td style="padding: 20px 24px;">
                                              <p style="color: #0f172a; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 12px 0;">
                                                Your Platform Access Includes:
                                              </p>
                                              
                                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                  <td width="24" valign="top" style="color: #8b5cf6; font-weight: bold; font-size: 14px; padding-bottom: 10px;">✓</td>
                                                  <td style="color: #334155; font-size: 13px; padding-bottom: 10px; font-weight: 500; line-height: 1.4;">High-Fidelity Content Generation & Humanizer</td>
                                                </tr>
                                                <tr>
                                                  <td width="24" valign="top" style="color: #8b5cf6; font-weight: bold; font-size: 14px; padding-bottom: 10px;">✓</td>
                                                  <td style="color: #334155; font-size: 13px; padding-bottom: 10px; font-weight: 500; line-height: 1.4;">Executive Review & Approval Pipeline</td>
                                                </tr>
                                                <tr>
                                                  <td width="24" valign="top" style="color: #8b5cf6; font-weight: bold; font-size: 14px;">✓</td>
                                                  <td style="color: #334155; font-size: 13px; font-weight: 500; line-height: 1.4;">Direct Framer & WordPress CMS Publishing</td>
                                                </tr>
                                              </table>
                                              
                                            </td>
                                          </tr>
                                        </table>
 
                                        <!-- SOLID BULLETPROOF BUTTON -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                          <tr>
                                            <td align="center" style="padding: 12px 0 24px 0;">
                                              <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                  <td align="center" bgcolor="#8b5cf6" style="border-radius: 6px;">
                                                    <a href="${appUrl}" target="_blank" style="display: inline-block; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 36px; border: 1px solid #7c3aed; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                                                      Accept Invitation & Sign In
                                                    </a>
                                                  </td>
                                                </tr>
                                              </table>
                                            </td>
                                          </tr>
                                        </table>
 
                                        <!-- HELP TEXT / DISCLAIMER -->
                                        <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 28px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                          This invitation was generated automatically. To secure your account, please activate your access to **10xBlogAgent** using your corporate Microsoft credentials.
                                        </p>  </p>

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
