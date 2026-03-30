import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 1. Fetch all profiles to ensure we show everyone (even with 0 posts)
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role');

        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            throw profileError;
        }

        // 2. Fetch all posts with their status and author ID (created_by)
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('status, created_by');

        if (postsError) {
            console.error('Error fetching posts:', postsError);
            throw postsError;
        }

        // 3. Aggregate results in memory by matching the profile ID
        const report = profiles.map(profile => {
            // Match posts directly by the author's internal UUID (created_by)
            const userPosts = posts?.filter((p: any) => p.created_by === profile.id) || [];
            
            return {
                email: profile.email,
                full_name: profile.full_name,
                total_created: userPosts.length,
                total_published: userPosts.filter((p: any) => p.status === 'published').length,
                role: profile.role
            };
        });

        // 4. Return the formatted report for the AdminTracking component
        return NextResponse.json({ report });

    } catch (error: any) {
        return NextResponse.json({ 
            error: 'Failed to generate report', 
            details: error.message 
        }, { status: 500 });
    }
}
