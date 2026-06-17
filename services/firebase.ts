import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const storage = getStorage(app);
