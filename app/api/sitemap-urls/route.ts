import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'logs', 'sitemap-cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const STOP_WORDS = new Set(['and', 'the', 'into', 'of', 'in', 'to', 'a', 'for', 'with', 'is', 'on', 'at', 'by', 'an', 'be', 'as', 'about', 'from', 'this', 'that', 'we', 'our', 'it', 'its', 'their', 'they', 'you', 'your']);

export async function GET() {
    try {
        const sitemapUrl = "https://10xds.com/sitemap.xml";

        // 1. Internal Helper: Fast Slug-based Map (Baseline)
        function generateSlugMap(urls: string[]) {
            const map: Record<string, string> = {};
            urls.forEach(url => {
                try {
                    const slug = new URL(url).pathname.replace(/\/$/, "").replace(/^\//, "").replace(/-/g, " ");
                    if (!slug) return;
                    const segments = slug.split(/\s+/).filter(s => s.length >= 3 && !STOP_WORDS.has(s));
                    for (let i = 0; i < segments.length; i++) {
                        for (let len = 2; len <= 4; len++) {
                            if (i + len <= segments.length) {
                                const phrase = segments.slice(i, i + len).join(" ");
                                if (phrase.length >= 6 && !map[phrase]) map[phrase] = url;
                            }
                        }
                    }
                } catch (e) { }
            });
            return map;
        }

        // 2. Fetch Sitemap URLs (The Locs)
        async function getLocs(url: string): Promise<string[]> {
            try {
                const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
                if (!resp.ok) return [];
                const text = await resp.text();
                const locMatch = /<loc>(.*?)<\/loc>/g;
                let match, locs: string[] = [];
                while ((match = locMatch.exec(text))) locs.push(match[1]);
                if (text.includes("<sitemapindex")) {
                    const subLocs = await Promise.all(locs.map(l => getLocs(l)));
                    return subLocs.flat();
                }
                return locs;
            } catch (e) { return []; }
        }

        let allLocs: string[] = [];
        try {
            allLocs = await getLocs(sitemapUrl);
        } catch (fetchErr: any) {
            console.error("Failed to fetch initial sitemap:", fetchErr.message);
        }

        const urls = [...new Set(allLocs)].filter(l => l.includes("10xds.com") && !l.endsWith(".xml"));

        // 3. Load Cache and Generate Baseline
        let cachedData: { timestamp: number, keywordMap: Record<string, string>, crawledUrls?: string[] } = {
            timestamp: 0,
            keywordMap: {},
            crawledUrls: []
        };

        if (fs.existsSync(CACHE_FILE)) {
            try { cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) { }
        }

        // Start with the Fast Slug Map, then overplay with metadata
        const slugMap = generateSlugMap(urls);
        const finalMap = { ...slugMap, ...cachedData.keywordMap };

        // 4. Incremental Crawl (Crawl a small batch on every hit to avoid timeouts)
        const alreadyCrawled = new Set(cachedData.crawledUrls || []);
        const toCrawl = urls.filter(u => !alreadyCrawled.has(u)).slice(0, 20);

        if (toCrawl.length > 0) {
            console.log(`Incremental crawl starting for ${toCrawl.length} new URLs...`);

            const metadataMatches: Record<string, string> = {};
            await Promise.all(toCrawl.map(async (url) => {
                try {
                    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
                    if (!resp.ok) return;
                    const html = await resp.text();
                    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
                    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
                        html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);

                    const combined = `${titleMatch ? titleMatch[1] : ''} ${descMatch ? descMatch[1] : ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
                    const segments = combined.split(/\s+/).filter(s => s.length >= 3 && !STOP_WORDS.has(s));

                    for (let i = 0; i < segments.length; i++) {
                        for (let len = 2; len <= 4; len++) {
                            if (i + len <= segments.length) {
                                const phrase = segments.slice(i, i + len).join(" ");
                                if (phrase.length >= 6) {
                                    // Prefer shorter URLs (e.g. homepage over deep service pages)
                                    const existing = metadataMatches[phrase];
                                    if (!existing || url.length < existing.length) {
                                        metadataMatches[phrase] = url;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) { }
            }));

            // Sync Cache
            const newKeywordMap = { ...cachedData.keywordMap, ...metadataMatches };
            const newCrawledUrls = [...alreadyCrawled, ...toCrawl];

            try {
                if (!fs.existsSync(path.dirname(CACHE_FILE))) fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
                fs.writeFileSync(CACHE_FILE, JSON.stringify({
                    timestamp: Date.now(),
                    keywordMap: newKeywordMap,
                    crawledUrls: newCrawledUrls
                }, null, 2));
                console.log(`Cache updated. Now ${newCrawledUrls.length}/${urls.length} URLs fully indexed.`);
            } catch (cacheErr: any) {
                console.error("Failed to write sitemap cache:", cacheErr.message);
            }

            // Return updated map for this hit
            return NextResponse.json({ keywordMap: { ...finalMap, ...metadataMatches } });
        }

        return NextResponse.json({ keywordMap: finalMap });

    } catch (error: any) {
        console.error("Hybrid Sitemap Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
