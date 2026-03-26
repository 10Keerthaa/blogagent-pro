import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Draft ID is required" }, { status: 400 });
        }

        const draftDoc = await db.collection('drafts').doc(id).get();

        if (!draftDoc.exists) {
            return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        }

        const draftData = {
            id: draftDoc.id,
            ...draftDoc.data()
        };

        return NextResponse.json({ success: true, draft: draftData });
    } catch (error: any) {
        console.error("Get Draft Detail Error:", error);
        return NextResponse.json({
            error: "Failed to fetch draft details",
            details: error.message
        }, { status: 500 });
    }
}
