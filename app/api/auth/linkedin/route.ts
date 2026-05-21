import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/linkedin/callback`;
    
    // Request permission to post to an organization page + basic user info
    const scope = encodeURIComponent('w_organization_social openid profile email');
    
    // Create random state to prevent CSRF
    const state = Math.random().toString(36).substring(7);

    // Build the official LinkedIn login URL
    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
    
    // Redirect the user's browser to LinkedIn
    return NextResponse.redirect(linkedInAuthUrl);
}
