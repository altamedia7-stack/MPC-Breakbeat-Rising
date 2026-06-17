async function testPerm() {
    try {
        const url = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0040460417/databases/remixed-firestore-database-id/documents/appData/main';
        console.log("Fetching GET:", url);
        const res = await fetch(url);
        console.log("Status:", res.status);
        const json = await res.json();
        console.log("Body:", JSON.stringify(json, null, 2));
    } catch(e) {
        console.error("Error fetching", e);
    }
}
testPerm();
