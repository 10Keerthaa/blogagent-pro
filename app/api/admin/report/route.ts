import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
    try {
        // 1. Extract the Authorization header from the request
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        // If no token is provided, we cannot verify RLS for the Admin report
        if (!token) {
            return NextResponse.json({ error: 'Authentication token required' }, { status: 401 });
        }

        /**
         * 2. Initialize the Supabase client with the user's JWT.
         * This allows Supabase to apply the RLS (Row Level Security) policies
         * we just added in the dashboard. Specifically, if the user is an admin,
         * they will now be able to see all profiles and posts.
         */
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        // 3. Fetch all profiles (Allowed by the new "Admins can browse all profiles" policy)
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role');

        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            throw profileError;
        }

        // 4. Fetch all posts (Allowed by the new "Admins can browse all posts" policy)
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('status, created_by');

        if (postsError) {
            console.error('Error fetching posts:', postsError);
            throw postsError;
        }

        // 5. Aggregate results in memory
        const report = profiles.map(profile => {
            const userPosts = posts?.filter((p: any) => p.created_by === profile.id) || [];
            
            return {
                email: profile.email,
                full_name: profile.full_name,
                total_created: userPosts.length,
                total_published: userPosts.filter((p: any) => p.status === 'published').length,
                role: profile.role
            };
        });

        // 6. Return the formatted report for the dashboard
        return NextResponse.json({ report });

    } catch (error: any) {
        return NextResponse.json({ 
            error: 'Failed to generate report', 
            details: error.message 
        }, { status: 500 });
    }
}
