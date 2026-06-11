import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const platform = searchParams.get('platform');
        
        const collectionName = platform === 'framer' ? 'page_knowledge_framer' : 'page_knowledge';
        const snapshot = await db.collection(collectionName).get();
        const knowledge = snapshot.docs.map(doc => doc.data());
        
        return NextResponse.json({ knowledge });
    } catch (error: any) {
        console.error("Knowledge Fetch API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
