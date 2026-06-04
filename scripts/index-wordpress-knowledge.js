const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const credentialsPath = path.join(process.cwd(), 'credentials.json');
const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
db.settings({ databaseId: 'blog-creation' });

// WordPress sitemap — only 10xds.com URLs
const SITEMAP_URL = "https://10xds.com/sitemap.xml";
const TARGET_DOMAIN = "10xds.com";

async function getLocs(url, depth = 0) {
    if (depth > 5) return [];
    try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!resp.ok) return [];
        const text = await resp.text();
        const locMatch = /<loc>(.*?)<\/loc>/g;
        let match, locs = [];
        while ((match = locMatch.exec(text))) locs.push(match[1]);
        if (text.includes("<sitemapindex")) {
            const subLocs = await Promise.all(locs.map(l => getLocs(l, depth + 1)));
            return subLocs.flat();
        }
        return locs;
    } catch (e) {
        console.warn(`  Could not fetch sitemap: ${url} — ${e.message}`);
        return [];
    }
}

async function scrapePage(url) {
    try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return '';
        const html = await resp.text();
        const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
        const articleMatch = html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
        const contentMatch = html.match(/<div[^>]+id=["']content["'][^>]*>([\s\S]*?)<\/div>/i);
        const bodyHtml = mainMatch?.[1] || articleMatch?.[1] || contentMatch?.[1] || html;

        return bodyHtml
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000);
    } catch (e) {
        return '';
    }
}

async function getGeminiSignature(url, content) {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`;

    const aiPrompt = `Analyze the following webpage content and generate a Semantic Intent Signature.
    URL: ${url}
    Content: ${content}

    TASK: Return a JSON object with:
    1. "intent": A 1-sentence summary of the page's core purpose.
    2. "tech_level": A score 1-10 (1=Overview, 10=Technical Deep-Dive).
    3. "primary_anchors": A list of the 5 most important technical noun phrases from the text.

    RULES:
    - Output ONLY valid JSON.
    - Focus on specialized technical value.
    - primary_anchors should be 2-4 word technical phrases suitable as hyperlink anchor text.`;

    try {
        const response = await client.request({
            url: endpoint,
            method: 'POST',
            data: {
                contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
                generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            }
        });
        const data = response.data;
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (err) {
        console.error(`  Gemini Signature Error for ${url}:`, err.message);
        return null;
    }
}

async function run() {
    console.log("Fetching WordPress sitemap URLs from", SITEMAP_URL, "...");
    const allUrls = await getLocs(SITEMAP_URL);
    const urls = [...new Set(allUrls)].filter(l => l.includes(TARGET_DOMAIN) && !l.endsWith('.xml'));
    console.log(`Found ${urls.length} candidate URLs for ${TARGET_DOMAIN}`);

    if (urls.length === 0) {
        console.log("No URLs found. Check if the sitemap is accessible.");
        process.exit(1);
    }

    let saved = 0;
    let skipped = 0;

    for (const url of urls) {
        console.log(`Processing ${url}...`);
        const content = await scrapePage(url);
        if (!content || content.length < 100) {
            console.log(`  Skipped — no content`);
            skipped++;
            continue;
        }

        const signature = await getGeminiSignature(url, content);
        if (signature) {
            const docId = Buffer.from(url).toString('base64').replace(/\//g, '_');
            // Save to the WordPress-specific collection (page_knowledge)
            await db.collection('page_knowledge').doc(docId).set({
                url,
                ...signature,
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  ✓ Saved: Tech Level ${signature.tech_level} | Anchors: ${(signature.primary_anchors || []).join(', ')}`);
            saved++;
        } else {
            console.log(`  Skipped — Gemini returned no signature`);
            skipped++;
        }

        // 1 second delay to avoid API rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n========================================`);
    console.log(`WordPress indexing complete!`);
    console.log(`  Saved:   ${saved} URLs`);
    console.log(`  Skipped: ${skipped} URLs`);
    console.log(`  Total:   ${urls.length} URLs`);
    console.log(`  Collection: page_knowledge`);
    console.log(`========================================`);
}

run().catch(console.error);
