import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
    try {
        console.log("Registering a new user via Auth...");
        const email = `test_rest_${Date.now()}@example.com`;
        const cred = await createUserWithEmailAndPassword(auth, email, 'TestPassword123!');
        console.log("Registered! User UID:", cred.user.uid);

        const idToken = await cred.user.getIdToken();
        console.log("Got Auth ID Token!");

        const projectId = firebaseConfig.projectId;
        const databaseId = firebaseConfig.firestoreDatabaseId;
        const apiKey = firebaseConfig.apiKey;

        // Path to document
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/appData/main?key=${apiKey}`;
        
        console.log("Writing to Firestore REST API with ID token...");
        // In Firestore REST API, setting a document is done via PATCH (with query mask or updateMask) or POST
        // Let's do a PATCH request which maps to standard setDoc
        const payload = {
            fields: {
                test_rest: { stringValue: "success_via_auth_rest" },
                timestamp: { stringValue: new Date().toISOString() }
            }
        };

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", res.status);
        const json = await res.json();
        console.log("Response Body:", JSON.stringify(json, null, 2));
        process.exit(0);
    } catch(e) {
        console.error("REST AUTH ERROR:", e);
        process.exit(1);
    }
}
run();
