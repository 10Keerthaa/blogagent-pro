/**
 * migrate-firestore.mjs
 * Copies all documents from the default Firestore DB to the 'blog-creation' named DB.
 * Run once with: node scripts/migrate-firestore.mjs
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const __dirname = dirname(fileURLToPath(import.meta.url));
const credPath = join(__dirname, '..', 'credentials.json');

if (!existsSync(credPath)) {
    console.error('❌  credentials.json not found');
    process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

// ── Source: default database ───────────────────────────────────────────────
const sourceApp = admin.initializeApp(
    { credential: admin.credential.cert(serviceAccount) },
    'source'
);
const sourceDb = admin.firestore(sourceApp);

// ── Destination: blog-creation database ───────────────────────────────────
const destApp = admin.initializeApp(
    { credential: admin.credential.cert(serviceAccount) },
    'dest'
);
const destDb = admin.firestore(destApp);
destDb.settings({ databaseId: 'blog-creation' });

// ── Collections to migrate ─────────────────────────────────────────────────
const COLLECTIONS = ['drafts'];

async function migrateCollection(collectionName) {
    console.log(`\n📦  Migrating collection: ${collectionName}`);
    const snapshot = await sourceDb.collection(collectionName).get();

    if (snapshot.empty) {
        console.log(`   ℹ️  No documents found in '${collectionName}'. Skipping.`);
        return 0;
    }

    let count = 0;
    const BATCH_SIZE = 400; // Firestore limit is 500 per batch
    let batch = destDb.batch();

    for (const doc of snapshot.docs) {
        const destRef = destDb.collection(collectionName).doc(doc.id);
        batch.set(destRef, doc.data());
        count++;

        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            console.log(`   ✅  Committed ${count} documents so far…`);
            batch = destDb.batch();
        }
    }

    // Commit remaining docs
    if (count % BATCH_SIZE !== 0) {
        await batch.commit();
    }

    console.log(`   ✅  Migrated ${count} document(s) from '${collectionName}'.`);
    return count;
}

async function run() {
    console.log('🚀  Starting Firestore migration → blog-creation');
    let total = 0;

    for (const col of COLLECTIONS) {
        total += await migrateCollection(col);
    }

    console.log(`\n🎉  Migration complete! ${total} document(s) copied to 'blog-creation'.`);
    process.exit(0);
}

run().catch((err) => {
    console.error('❌  Migration failed:', err);
    process.exit(1);
});
