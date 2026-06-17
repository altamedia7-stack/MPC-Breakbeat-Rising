import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testFirebase() {
    try {
        console.log("Testing read...");
        const docRef = doc(db, 'appData', 'main');
        const snap = await getDoc(docRef);
        console.log("Read success, exists:", snap.exists());
        if (snap.exists()) {
            console.log("Data user count:", snap.data().users?.length);
        }
        
        console.log("Testing write...");
        await setDoc(docRef, { test: "hello", users: [] });
        console.log("Write success!");
        process.exit(0);
    } catch(e) {
        console.error("FIREBASE ERROR:");
        console.error(e);
        process.exit(1);
    }
}

testFirebase();
