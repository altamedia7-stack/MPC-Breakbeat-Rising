console.log("Keys of process.env:", Object.keys(process.env).filter(x => !x.includes("KEY") && !x.includes("SECRET") && !x.includes("PASSWORD")));
console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
