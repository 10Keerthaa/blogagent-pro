import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
        }

        // Verify Firebase Token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
        }

        // Check if requester is Admin
        const adminSnap = await db.collection('user_profiles').doc(decodedToken.uid).get();
        if (!adminSnap.exists || adminSnap.data()?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        // 1. Fetch all profiles
        const profilesSnap = await db.collection('user_profiles').get();
        const profiles = profilesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 2. Fetch all posts (minimal fields for aggregation)
        const postsSnap = await db.collection('blog_posts').get();
        const posts = postsSnap.docs.map(doc => ({
            status: doc.data().status,
            created_by: doc.data().created_by
        }));

        // 3. Aggregate results
        const report = profiles.filter((p: any) => p.email).map((profile: any) => {
            const userPosts = posts.filter(p => p.created_by === profile.id);
            
            return {
                email: profile.email,
                full_name: profile.full_name,
                total_created: userPosts.length,
                total_published: userPosts.filter(p => p.status === 'published').length,
                role: profile.role
            };
        });

        return NextResponse.json({ report });

    } catch (error: any) {
        console.error('Admin Report Error:', error);
        return NextResponse.json({ 
            error: 'Failed to generate report', 
            details: error.message 
        }, { status: 500 });
    }
}
