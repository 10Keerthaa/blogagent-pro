import { NextResponse } from 'next/server';
import { SemanticLinker } from '@/lib/semanticLinker';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { requests, platform, knowledgeBase } = await req.json();

        if (!requests || !Array.isArray(requests)) {
            return NextResponse.json({ error: "Requests array is required" }, { status: 400 });
        }

        const linker = new SemanticLinker();
        if (knowledgeBase) {
            linker.setKnowledge(knowledgeBase);
        } else {
            await linker.init(platform);
        }

        const results = await linker.matchContextBatch(requests, platform);

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("Batch Contextualize API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
