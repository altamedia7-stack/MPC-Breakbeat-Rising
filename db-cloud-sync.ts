import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const API_KEY = firebaseConfig.apiKey;
const PASSWORD = "BackupSecureStreamGuard123!";

// Helper to perform a REST API POST to Firebase Auth Identity Toolkit
async function authPost(endpoint: string, payload: any) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Auth REST Error (${endpoint}): ${res.status} - ${JSON.stringify(errorData)}`);
    }
    return res.json();
}

// Signs in, or registers first if user not found, returning the idToken
async function getAuthToken(email: string): Promise<string> {
    try {
        // Try sign in
        const data = await authPost('signInWithPassword', {
            email,
            password: PASSWORD,
            returnSecureToken: true
        });
        return data.idToken;
    } catch (e: any) {
        // If user not found (or invalid credentials on some projects pre-signup), sign up
        if (e.message.includes('EMAIL_NOT_FOUND') || e.message.includes('INVALID_LOGIN_CREDENTIALS')) {
            const data = await authPost('signUp', {
                email,
                password: PASSWORD,
                returnSecureToken: true
            });
            return data.idToken;
        }
        throw e;
    }
}

// Update the user displayName
async function updateProfileDisplayName(idToken: string, displayName: string) {
    await authPost('update', {
        idToken,
        displayName,
        returnSecureToken: true
    });
}

// --- PUBLIC CLOUD SYNC EXPORTS ---

export async function saveAppDataToCloud(data: any): Promise<boolean> {
    try {
        const fullJson = JSON.stringify(data);
        console.log(`[CloudSync] Saving full data to cloud (${fullJson.length} chars)...`);

        const CHUNK_SIZE = 180; // Safe size to keep within Firebase's 256 char limit for displayName
        const chunks: string[] = [];
        for (let i = 0; i < fullJson.length; i += CHUNK_SIZE) {
            chunks.push(fullJson.substring(i, i + CHUNK_SIZE));
        }

        // Save meta (number of chunks)
        const metaEmail = `_app_data_meta_@streamguard.local`;
        const metaIdToken = await getAuthToken(metaEmail);
        const metaObj = {
            chunkCount: chunks.length,
            updatedAt: new Date().toISOString(),
            length: fullJson.length
        };
        await updateProfileDisplayName(metaIdToken, JSON.stringify(metaObj));

        // Save chunk accounts
        for (let idx = 0; idx < chunks.length; idx++) {
            const chunkEmail = `_app_data_chunk_${idx}_@streamguard.local`;
            const chunkIdToken = await getAuthToken(chunkEmail);
            await updateProfileDisplayName(chunkIdToken, chunks[idx]);
        }

        console.log(`[CloudSync] Save completed successfully with ${chunks.length} chunks.`);
        return true;
    } catch (err) {
        console.error("[CloudSync] Save to cloud failed:", err);
        return false;
    }
}

export async function loadAppDataFromCloud(): Promise<any | null> {
    try {
        console.log("[CloudSync] Loading data from cloud series...");
        const metaEmail = `_app_data_meta_@streamguard.local`;
        const metaIdToken = await getAuthToken(metaEmail);
        
        // Retrieve meta from update response or standard profile look up
        // To do a profile lookup from ID token:
        const lookUpData = await authPost('lookup', {
            idToken: metaIdToken
        });
        
        const userObj = lookUpData.users?.[0];
        if (!userObj || !userObj.displayName) {
            console.log("[CloudSync] No cloud meta found. Returning empty.");
            return null;
        }

        const metaObj = JSON.parse(userObj.displayName);
        const chunkCount = metaObj.chunkCount;
        console.log(`[CloudSync] Meta found. Expecting ${chunkCount} chunks.`);

        let fullJson = "";
        for (let idx = 0; idx < chunkCount; idx++) {
            const chunkEmail = `_app_data_chunk_${idx}_@streamguard.local`;
            const chunkIdToken = await getAuthToken(chunkEmail);
            const chunkLookUp = await authPost('lookup', {
                idToken: chunkIdToken
            });
            const chunkUser = chunkLookUp.users?.[0];
            if (chunkUser && chunkUser.displayName) {
                fullJson += chunkUser.displayName;
            } else {
                throw new Error(`Failed to find database chunk ${idx}`);
            }
        }

        console.log(`[CloudSync] Cloud read completed of ${fullJson.length} chars.`);
        return JSON.parse(fullJson);
    } catch (err) {
        console.error("[CloudSync] Load from cloud failed:", err);
        return null;
    }
}
