import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

// Manually parse .env.local for testing
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
    }
  });
}

async function testTavily() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("❌ TAVILY_API_KEY is not set in .env.local");
    return;
  }

  console.log(`🔑 Found API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`🔍 Simulating Agent Tavily Search Tool...`);

  const query = "AI in healthcare market size 2026 report statistics";
  console.log(`❓ Query: "${query}"`);

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        include_answer: true,
        max_results: 3,
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errText = await response.text();
      console.error(`❌ Error Details: ${errText}`);
      return;
    }

    const data = await response.json();
    console.log(`\n✅ Tavily API Success! Agent received data.`);
    console.log(`📝 Answer provided to Agent:`, data.answer || "No direct answer generated.");
    console.log(`\n🔗 Top 3 Sources the Agent would inject as red links:`);
    if (data.results && data.results.length > 0) {
      data.results.forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.title}] - ${r.url}`);
      });
    } else {
      console.log("  No results found.");
    }

  } catch (error) {
    console.error("❌ Network or Execution Error:", error);
  }
}

testTavily();
