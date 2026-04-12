import { NextResponse } from 'next/server';
import { SemanticLinker } from '@/lib/semanticLinker';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { paragraph, candidates } = await req.json();

        if (!paragraph || !candidates) {
            return NextResponse.json({ error: "Paragraph and candidates are required" }, { status: 400 });
        }

        const linker = new SemanticLinker();
        await linker.init();

        const match = await linker.matchContext(paragraph, candidates);

        return NextResponse.json({ match });
    } catch (error: any) {
        console.error("Contextual Linker API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
