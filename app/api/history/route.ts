import { NextResponse } from "next/server";
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const logFile = path.resolve(process.cwd(), 'logs', 'publications.json');
    console.log(`Fetching history from: ${logFile}`);

    try {
      const fileContent = await fs.readFile(logFile, 'utf8');
      const history = JSON.parse(fileContent);
      return NextResponse.json({ history });
    } catch (e) {
      // File doesn't exist yet
      return NextResponse.json({ history: [] });
    }
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json({ history: [] });
  }
}
