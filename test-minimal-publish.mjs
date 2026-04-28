import { connect } from 'framer-api';
import fs from 'fs';

async function testGuesIDs() {
  let framerProjectId, framerApiKey;
  
  try {
    const env = fs.readFileSync('c:/Users/KeerthanaJossy/ai-blog-platform/.env.local', 'utf8');
    framerProjectId = env.match(/FRAMER_PROJECT_ID=(.*)/)?.[1]?.trim();
    framerApiKey = env.match(/FRAMER_API_KEY=(.*)/)?.[1]?.trim();
  } catch (e) {
    console.error('❌ Could not read .env.local');
    return;
  }

  try {
    const framer = await connect(
      `https://framer.com/projects/${framerProjectId}`,
      framerApiKey
    );

    const collections = await framer.getCollections();
    const blogsCol = collections.find((c) => c.name === 'Blogs');

    if (blogsCol) {
      const guesses = ["Blog_Head", "blog-head", "title", "name", "Blog_head"];
      for (const guess of guesses) {
          console.log(`Testing guess: "${guess}"...`);
          try {
            await blogsCol.addItems([{
              slug: 'guess-' + guess + '-' + Date.now(),
              fieldData: {
                [guess]: { type: "string", value: "Test Title" }
              }
            }]);
            console.log(`✅ Success with "${guess}"!`);
            break;
          } catch (err) {
            console.log(`❌ Failed with "${guess}": ${err.message}`);
          }
      }
    }
    await framer.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testGuesIDs();
