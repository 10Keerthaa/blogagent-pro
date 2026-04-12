import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { getGoogleAuth } from '@/lib/googleAuth';
import { db } from '@/lib/firebaseAdmin';

const CACHE_FILE = path.join(process.cwd(), 'logs', 'sitemap-cache.json');
const STOP_WORDS = new Set([
    // Basic fillers
    'and', 'the', 'into', 'of', 'in', 'to', 'a', 'for', 'with', 'is', 'on', 'at', 'by', 'an', 'be', 'as', 'about', 'from', 'this', 'that', 'we', 'our', 'it', 'its', 'their', 'they', 'you', 'your',
    // Generic action/filler words to ignore in slugs
    'successfully', 'implementing', 'implementation', 'guide', 'essential', 'ways', 'tips', 'best', 'practices', 'top', 'complete', 'overview', 'explaining', 'understanding', 'using', 'towards', 'highly', 'actually', 'really', 'getting', 'started', 'assessing', 'challenges', 'benefits', 'importance', 'role', 'impact', 'future', 'expert', 'professional', 'leading', 'modern', 'new', 'latest', 'how', 'why', 'can', 'will', 'must', 'should', 'could', 'would', 'shall', 'may', 'might', 'must', 'done', 'doing', 'does', 'did', 'being', 'been', 'having', 'had', 'has', 'have', 'very', 'quite', 'just', 'only'
]);

export async function GET() {
    const startTime = Date.now();
    const isProd = process.env.VERCEL === '1';
    const MAX_DURATION = isProd ? 8500 : 25000; // 8.5s for Vercel, 25s for Local
    const META_BATCH_SIZE = isProd ? 5 : 10;
    const AI_BATCH_SIZE = isProd ? 2 : 5;

    try {
        const sitemapUrl = "https://10xds.com/sitemap.xml";

        // 1. Internal Helper: Fast Slug-based Map (Baseline Fallback)
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

        // 2. Load Firestore Cache first (to see if we can skip sitemap discovery)
        const docRef = db.collection('config').doc('sitemap-cache');
        let cachedData: any = {
            timestamp: 0,
            keywordMap: {},
            crawledUrls: [],
            anchorMap: {},
            aiCrawledUrls: [],
            discoveredUrls: [],
            lastDiscovery: 0
        };

        try {
            const doc = await docRef.get();
            if (doc.exists) {
                cachedData = { ...cachedData, ...doc.data() };
            } else if (fs.existsSync(CACHE_FILE)) {
                try {
                    const localData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
                    cachedData = { ...cachedData, ...localData };
                    console.log("Migrating local sitemap cache to Firestore...");
                } catch (e) { }
            }
        } catch (dbErr: any) {
            console.error("Firestore cache load failed:", dbErr.message);
        }

        // 3. Sitemap Discovery (with 24h caching)
        let urls: string[] = cachedData.discoveredUrls || [];
        const isDiscoveryStale = (Date.now() - (cachedData.lastDiscovery || 0)) > 24 * 60 * 60 * 1000;

        if (urls.length === 0 || isDiscoveryStale) {
            console.log("Refreshing sitemap discovery list...");
            async function getLocs(url: string, depth = 0): Promise<string[]> {
                if (depth > 5) return []; // Safety guard
                try {
                    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
                    if (!resp.ok) return [];
                    const text = await resp.text();
                    const locMatch = /<loc>(.*?)<\/loc>/g;
                    let match, locs: string[] = [];
                    while ((match = locMatch.exec(text))) locs.push(match[1]);
                    if (text.includes("<sitemapindex")) {
                        const subLocs = await Promise.all(locs.map(l => getLocs(l, depth + 1)));
                        return subLocs.flat();
                    }
                    return locs;
                } catch (e) { return []; }
            }

            try {
                const allLocs = await getLocs(sitemapUrl);
                urls = [...new Set(allLocs)].filter(l => l.includes("10xds.com") && !l.endsWith(".xml"));
                cachedData.discoveredUrls = urls;
                cachedData.lastDiscovery = Date.now();
            } catch (err: any) {
                console.error("Discovery failed:", err.message);
            }
        }

        // 4. Processing logic (Early exit if timeout approaching)
        if (Date.now() - startTime > MAX_DURATION - 2000) {
            console.log("Skipping incremental crawl: timeout approaching.");
            return NextResponse.json({ keywordMap: { ...generateSlugMap(urls), ...cachedData.keywordMap }, anchorMap: cachedData.anchorMap || {} });
        }

        // Start with the Fast Slug Map as baseline fallback
        const slugMap = generateSlugMap(urls);
        const finalMap = { ...slugMap, ...cachedData.keywordMap };

        // 4b. Incremental Metadata Crawl
        const alreadyCrawled = new Set(cachedData.crawledUrls || []);
        const toCrawl = urls.filter(u => !alreadyCrawled.has(u)).slice(0, META_BATCH_SIZE);

        const metadataMatches: Record<string, string> = {};
        if (toCrawl.length > 0) {
            await Promise.all(toCrawl.map(async (url) => {
                if (Date.now() - startTime > MAX_DURATION - 2000) return;
                try {
                    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
                    if (!resp.ok) return;
                    const html = await resp.text();
                    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
                    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
                    const combined = `${titleMatch ? titleMatch[1] : ''} ${descMatch ? descMatch[1] : ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
                    const segments = combined.split(/\s+/).filter(s => s.length >= 3);
                    for (let i = 0; i < segments.length; i++) {
                        for (let len = 2; len <= 4; len++) {
                            if (i + len <= segments.length) {
                                const words = segments.slice(i, i + len);
                                // CRITICAL: If any word in the phrase is a stop word, discard the whole phrase
                                const hasStopWord = words.some(w => STOP_WORDS.has(w));
                                if (!hasStopWord) {
                                    const phrase = words.join(" ");
                                    if (phrase.length >= 6) metadataMatches[phrase] = url;
                                }
                            }
                        }
                    }
                } catch (e) { }
            }));
        }

        // 5. AI-Powered Anchor Extraction
        const aiCrawledUrls = new Set(cachedData.aiCrawledUrls || []);
        const toAiCrawl = urls.filter(u => !aiCrawledUrls.has(u)).slice(0, AI_BATCH_SIZE);
        const newAnchorMap: Record<string, string[]> = { ...(cachedData.anchorMap || {}) };

        if (toAiCrawl.length > 0 && (Date.now() - startTime < MAX_DURATION - 3000)) {
            try {
                const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
                const client = await auth.getClient();
                const projectId = await auth.getProjectId();
                const geminiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;

                await Promise.all(toAiCrawl.map(async (url) => {
                    if (Date.now() - startTime > MAX_DURATION - 1500) return;
                    try {
                        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
                        if (!resp.ok) return;
                        const html = await resp.text();

                        const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
                        const articleMatch = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
                        const bodyHtml = (mainMatch?.[1] || articleMatch?.[1] || html);
                        const bodyText = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2500);

                        if (bodyText.length < 100) return;

                        const aiPrompt = `You are an SEO specialist. Extract exactly 3 technical phrases (2-4 words) and 2 abbreviations from this content for internal linking. URL: ${url}. Content: ${bodyText}. Return ONLY JSON: {"phrases": [], "abbreviations": []}`;

                        const geminiResp = await client.request({
                            url: geminiUrl,
                            method: 'POST',
                            data: { contents: [{ role: 'user', parts: [{ text: aiPrompt }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }
                        });

                        const parsed = JSON.parse((geminiResp.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
                        const anchors = [...(parsed.phrases || []), ...(parsed.abbreviations || [])].filter(Boolean);
                        if (anchors.length > 0) newAnchorMap[url] = anchors;
                    } catch (e) { }
                }));
            } catch (e) { }
        }

        // 6. Final Save & Responses
        const newKeywordMap = { ...cachedData.keywordMap, ...metadataMatches };
        const updatedCrawledUrls = Array.from(new Set([...alreadyCrawled, ...toCrawl]));
        const updatedAiCrawledUrls = Array.from(new Set([...aiCrawledUrls, ...toAiCrawl]));

        await docRef.set({
            ...cachedData,
            timestamp: Date.now(),
            keywordMap: newKeywordMap,
            crawledUrls: updatedCrawledUrls,
            anchorMap: newAnchorMap,
            aiCrawledUrls: updatedAiCrawledUrls,
            lastDiscovery: cachedData.lastDiscovery,
            discoveredUrls: urls
        });

        const anchorPhraseMap: Record<string, string> = {};
        for (const [u, anchors] of Object.entries(newAnchorMap)) {
            for (const a of anchors) if (!anchorPhraseMap[a]) anchorPhraseMap[a] = u;
        }

        return NextResponse.json({
            keywordMap: { ...finalMap, ...metadataMatches, ...anchorPhraseMap },
            anchorMap: newAnchorMap
        });

    } catch (error: any) {
        console.error("Critical Sitemap Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
