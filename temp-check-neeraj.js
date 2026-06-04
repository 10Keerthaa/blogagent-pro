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

async function checkNeeraj() {
    const db = admin.firestore();
    try {
        db.settings({ databaseId: 'blog-creation' });
    } catch (e) {}

    const email = 'neeraj.r@10xds.com';

    console.log(`--- Checking for ${email} ---`);

    // 1. Check user_profiles
    console.log("Checking user_profiles...");
    const profiles = await db.collection('user_profiles').where('email', '==', email).get();
    if (!profiles.empty) {
        profiles.forEach(doc => {
            console.log(`Found in user_profiles -> ID: ${doc.id}, Data:`, doc.data());
        });
    } else {
        console.log("Not found in user_profiles.");
    }

    // 2. Check invited_users
    console.log("Checking invited_users...");
    const invite = await db.collection('invited_users').doc(email.toLowerCase()).get();
    if (invite.exists) {
        console.log("Found in invited_users -> Data:", invite.data());
    } else {
        console.log("Not found in invited_users.");
    }

    // 3. Check Firebase Auth
    console.log("Checking Firebase Auth...");
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log("Found in Firebase Auth -> UID:", userRecord.uid);
    } catch (error) {
        console.log("Not found in Firebase Auth.");
    }
}

checkNeeraj();
