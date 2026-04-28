import { connect } from 'framer-api';
import fs from 'fs';

async function checkFramerFields() {
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
      const items = await blogsCol.getItems();
      if (items.length > 0) {
          const firstItem = items[0];
          console.log('FIELD KEYS HEX CODES:');
          Object.keys(firstItem.fieldData).forEach(key => {
              const hex = Buffer.from(key).toString('hex');
              console.log(`"${key}" -> ${hex}`);
          });
      }
    }
    await framer.disconnect();
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkFramerFields();
