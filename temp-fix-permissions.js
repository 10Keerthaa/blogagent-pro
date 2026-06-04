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

async function fixPermissions() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    const targetEmail = 'keerthana.jossy@pp.tenxds.in';
    const targetUid = 'oRFh3WofUpPqBg8CaqF2ALpmdd42';
    const keeperEmail = 'keerthanajossy@gmail.com';

    console.log("--- STARTING DATABASE CLEANUP ---");

    // 1. Create/Update the Admin profile for the new email
    console.log(`Setting ${targetEmail} as Admin...`);
    await db.collection('user_profiles').doc(targetUid).set({
        email: targetEmail,
        full_name: 'Keerthana Jossy',
        role: 'admin',
        created_at: new Date().toISOString()
    });

    // 2. Delete the used invite
    console.log(`Deleting invite for ${targetEmail}...`);
    await db.collection('invited_users').doc(targetEmail).delete();

    // 3. Remove other non-essential admins/editors (except the keeper)
    console.log(`Removing other profiles except ${keeperEmail}...`);
    const profiles = await db.collection('user_profiles').get();
    for (const doc of profiles.docs) {
        const data = doc.data();
        if (data.email !== targetEmail && data.email !== keeperEmail) {
            console.log(`- Removing old profile: ${data.email || doc.id}`);
            await doc.ref.delete();
        }
    }

    console.log("--- CLEANUP COMPLETE ---");
}

fixPermissions().catch(console.error);
