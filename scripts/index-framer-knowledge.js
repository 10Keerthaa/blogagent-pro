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

// We use the same sitemap logic as the API
const SITEMAP_URL = "https://www.10xds.ai/sitemap.xml";

async function getLocs(url) {
    try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!resp.ok) return [];
        const text = await resp.text();
        const locMatch = /<loc>(.*?)<\/loc>/g;
        let match, locs = [];
        while ((match = locMatch.exec(text))) locs.push(match[1]);
        if (text.includes("<sitemapindex")) {
            const subLocs = await Promise.all(locs.map(l => getLocs(l)));
            return subLocs.flat();
        }
        return locs;
    } catch (e) { return []; }
}

async function scrapePage(url) {
    try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
    } catch (e) { return ''; }
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
    - Focus on specialized technical value.`;

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
        // Remove markdown JSON code blocks if present
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (err) {
        console.error(`Gemini Signature Error for ${url}:`, err.message);
        return null;
    }
}

async function run() {
    console.log("Fetching sitemap URLs...");
    const allUrls = await getLocs(SITEMAP_URL);
    const urls = [...new Set(allUrls)].filter(l => l.includes("10xds.ai") && !l.endsWith(".xml"));
    console.log(`Found ${urls.length} candidate URLs for 10xds.ai`);

    for (const url of urls) {
        console.log(`Processing ${url}...`);
        const content = await scrapePage(url);
        if (!content) continue;

        const signature = await getGeminiSignature(url, content);
        if (signature) {
            const docId = Buffer.from(url).toString('base64').replace(/\//g, '_');
            // Save to the NEW framer-specific database
            await db.collection('page_knowledge_framer').doc(docId).set({
                url,
                ...signature,
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`  Signature saved for ${url} (Tech Level: ${signature.tech_level})`);
        }
        // Delay to avoid hitting API rate limits
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log("Indexing complete for page_knowledge_framer.");
}

run().catch(console.error);
