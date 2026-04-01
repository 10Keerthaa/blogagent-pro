import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snapshot = await db.collection('blog_posts')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Failed to fetch history from Firestore:", error);
    return NextResponse.json({ history: [], error: error.message });
  }
}
