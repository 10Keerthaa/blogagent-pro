const https = require('https');

const TEST_URL = 'https://10xds.com/services/intelligent-automation/';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlogAgent/1.0;)' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function testFetchMetadata() {
    console.log(`Fetching: ${TEST_URL}...`);
    try {
        const html = await fetchUrl(TEST_URL);

        // 1. Extract Title
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'No Title';

        // 2. Extract Meta Description
        const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) ||
            html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']/i);
        const description = metaMatch ? metaMatch[1].trim() : 'No Description';

        console.log('--- Extracted Data ---');
        console.log('TITLE:', title);
        console.log('DESCRIPTION:', description);

        // 3. Simple Keyword Generation Test
        const STOP_WORDS = new Set(['and', 'the', 'into', 'for', 'with', 'a', 'in', 'of', 'to', 'is', 'on']);
        const combinedText = `${title} ${description}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const segments = combinedText.split(/\s+/).filter(s => s.length >= 3 && !STOP_WORDS.has(s));

        const combinations = [];
        for (let i = 0; i < segments.length; i++) {
            for (let len = 2; len <= 4; len++) {
                if (i + len <= segments.length) {
                    combinations.push(segments.slice(i, i + len).join(' '));
                }
            }
        }

        console.log('\n--- Sample Keyword Combinations ---');
        console.log(combinations.slice(0, 15).map(c => `[${c}]`).join('\n'));

    } catch (error) {
        console.error('Fetch failed:', error.message);
    }
}

testFetchMetadata();
