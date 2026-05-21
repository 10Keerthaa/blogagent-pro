import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const origin = request.nextUrl.origin;

    // If the manager clicked "Cancel" on the LinkedIn popup
    if (error) {
        return NextResponse.redirect(`${origin}/dashboard?error=linkedin_auth_failed`);
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID!;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    const redirectUri = `${origin}/api/auth/linkedin/callback`;

    try {
        // Exchange the temporary code for a permanent Access Token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }).toString(),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('LinkedIn Token Error:', tokenData);
            return NextResponse.json({ error: tokenData.error_description }, { status: 400 });
        }

        // Save the token to Firebase securely so the backend can use it for daily publishing
        await db.collection('settings').doc('linkedin').set({
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        // Redirect back to the dashboard indicating success
        return NextResponse.redirect(`${origin}/dashboard?linkedin=connected`);
    } catch (err) {
        console.error('LinkedIn Callback Failed:', err);
        return NextResponse.json({ error: 'Failed to process LinkedIn callback' }, { status: 500 });
    }
}
