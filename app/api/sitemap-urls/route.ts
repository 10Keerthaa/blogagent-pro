import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { getGoogleAuth } from '@/lib/googleAuth';

const CACHE_FILE = path.join(process.cwd(), 'logs', 'sitemap-cache.json');

const STOP_WORDS = new Set(['and', 'the', 'into', 'of', 'in', 'to', 'a', 'for', 'with', 'is', 'on', 'at', 'by', 'an', 'be', 'as', 'about', 'from', 'this', 'that', 'we', 'our', 'it', 'its', 'their', 'they', 'you', 'your']);

export async function GET() {
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

        // 3. Load Cache
        let cachedData: {
            timestamp: number;
            keywordMap: Record<string, string>;
            crawledUrls?: string[];
            anchorMap?: Record<string, string[]>;
            aiCrawledUrls?: string[];
        } = {
            timestamp: 0,
            keywordMap: {},
            crawledUrls: [],
            anchorMap: {},
            aiCrawledUrls: []
        };

        if (fs.existsSync(CACHE_FILE)) {
            try { cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) { }
        }

        // Start with the Fast Slug Map as baseline fallback
        const slugMap = generateSlugMap(urls);
        const finalMap = { ...slugMap, ...cachedData.keywordMap };

        // 4. Incremental Metadata Crawl (legacy, kept for backward compat)
        const alreadyCrawled = new Set(cachedData.crawledUrls || []);
        const toCrawl = urls.filter(u => !alreadyCrawled.has(u)).slice(0, 10);

        const metadataMatches: Record<string, string> = {};
        if (toCrawl.length > 0) {
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
        }

        // 5. NEW: AI-Powered Anchor Extraction (Gemini body content analysis)
        const aiCrawledUrls = new Set(cachedData.aiCrawledUrls || []);
        const toAiCrawl = urls.filter(u => !aiCrawledUrls.has(u)).slice(0, 5); // 5 per hit to stay within timeout

        const newAnchorMap: Record<string, string[]> = { ...(cachedData.anchorMap || {}) };

        if (toAiCrawl.length > 0) {
            console.log(`AI anchor extraction starting for ${toAiCrawl.length} new URLs...`);

            try {
                const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
                const client = await auth.getClient();
                const projectId = await auth.getProjectId();
                const geminiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;

                await Promise.all(toAiCrawl.map(async (url) => {
                    try {
                        // Sub-step A: Scrape body content
                        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
                        if (!resp.ok) return;
                        const html = await resp.text();

                        // Extract <main>, <article>, or <div id="content"> body text
                        let bodyHtml = '';
                        const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
                        const articleMatch = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
                        const contentMatch = html.match(/<div[^>]+id=["']content["'][^>]*>([\s\S]*?)<\/div>/i);
                        bodyHtml = (mainMatch?.[1] || articleMatch?.[1] || contentMatch?.[1] || html);

                        // Strip tags and clean
                        const bodyText = bodyHtml
                            .replace(/<script[\s\S]*?<\/script>/gi, '')
                            .replace(/<style[\s\S]*?<\/style>/gi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .slice(0, 3000);

                        if (bodyText.length < 100) return; // Skip near-empty pages

                        // Sub-step B: Gemini extraction — 3 phrases + 2 abbreviations
                        const aiPrompt = `You are an SEO specialist. Read the following web page body content and extract the most important linkable terms.

Page URL: ${url}
Body Content: ${bodyText}

TASK: Return a JSON object with exactly these two fields:
1. "phrases": An array of exactly 3 technical noun phrases (2-4 words each) that precisely define the core topic of this page. Must be specific, not generic.
2. "abbreviations": An array of exactly 2 common industry abbreviations or short-form terms used for this topic (e.g. "IDP", "RPA", "AI"). If fewer than 2 exist, use the most relevant short keyword instead.

RULES:
- Phrases must come from the actual page content, not the URL.
- No generic phrases like "learn more", "click here", "our services".
- Return ONLY valid JSON. No explanation, no markdown.

EXAMPLE OUTPUT:
{"phrases": ["intelligent document processing", "document capture automation", "unstructured data extraction"], "abbreviations": ["IDP", "OCR"]}`;

                        const geminiResp = await client.request({
                            url: geminiUrl,
                            method: 'POST',
                            data: {
                                contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
                                generationConfig: {
                                    temperature: 0.1,
                                    responseMimeType: 'application/json'
                                }
                            }
                        });

                        const data = geminiResp.data as any;
                        const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                        const parsed = JSON.parse(rawText);
                        const phrases: string[] = Array.isArray(parsed.phrases) ? parsed.phrases.slice(0, 3).map((p: string) => p.toLowerCase().trim()) : [];
                        const abbreviations: string[] = Array.isArray(parsed.abbreviations) ? parsed.abbreviations.slice(0, 2).map((a: string) => a.trim()) : [];
                        const anchors = [...phrases, ...abbreviations].filter(Boolean);

                        if (anchors.length > 0) {
                            newAnchorMap[url] = anchors;
                            console.log(`AI anchors for ${url}:`, anchors);
                        }
                    } catch (e: any) {
                        console.error(`AI crawl failed for ${url}:`, e.message);
                    }
                }));
            } catch (authErr: any) {
                console.error("Gemini auth failed for AI anchor extraction:", authErr.message);
            }
        }

        // 6. Save updated cache
        const newKeywordMap = { ...cachedData.keywordMap, ...metadataMatches };
        const newCrawledUrls = [...alreadyCrawled, ...toCrawl];
        const newAiCrawledUrls = [...aiCrawledUrls, ...toAiCrawl];

        try {
            if (!fs.existsSync(path.dirname(CACHE_FILE))) fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
            fs.writeFileSync(CACHE_FILE, JSON.stringify({
                timestamp: Date.now(),
                keywordMap: newKeywordMap,
                crawledUrls: newCrawledUrls,
                anchorMap: newAnchorMap,
                aiCrawledUrls: newAiCrawledUrls
            }, null, 2));
            console.log(`Cache updated. Legacy: ${newCrawledUrls.length}/${urls.length}, AI-anchored: ${newAiCrawledUrls.length}/${urls.length} URLs.`);
        } catch (cacheErr: any) {
            console.error("Failed to write sitemap cache:", cacheErr.message);
        }

        // 7. Build flat anchor phrase → URL map from anchorMap for the response
        const anchorPhraseMap: Record<string, string> = {};
        for (const [url, anchors] of Object.entries(newAnchorMap)) {
            for (const anchor of anchors) {
                if (!anchorPhraseMap[anchor]) anchorPhraseMap[anchor] = url;
            }
        }

        // Merge: AI anchors (high confidence) override slug map; legacy metadata fills any gaps
        const mergedMap = { ...finalMap, ...metadataMatches, ...anchorPhraseMap };

        return NextResponse.json({
            keywordMap: mergedMap,
            anchorMap: newAnchorMap
        });

    } catch (error: any) {
        console.error("Hybrid Sitemap Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
