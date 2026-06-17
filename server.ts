import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { saveAppDataToCloud, loadAppDataFromCloud } from "./db-cloud-sync.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add broad CORS and body parsing
  app.use(express.json({ limit: '10mb' }));

  const DATA_FILE = path.join(process.cwd(), 'appData.json');
  let isCloudLoaded = false;

  // Load / Initialize data file
  const getInitialData = () => {
    return {
      users: [],
      tracks: [
        { id: '1', artist: 'NewJeans', title: 'Super Shy' },
        { id: '2', artist: 'The Weeknd', title: 'Blinding Lights' },
        { id: '3', artist: 'Arctic Monkeys', title: 'Do I Wanna Know?' }
      ],
      spotifyPlaylistId: '37i9dQZF1DXcBWIGoYBM5M',
      weeklySchedule: {},
      adminPin: '1234',
      dailyUsedLastFmAccounts: {}
    };
  };

  const loadDataLocal = () => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error("Error reading data file", e);
    }
    return getInitialData();
  };

  const saveDataLocal = (data: any) => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error("Error writing data file", e);
      return false;
    }
  };

  // API Route: Get data
  app.get("/api/data", async (req, res) => {
    if (!isCloudLoaded) {
      console.log("[Server] First request: Fetching newest data from Cloud Auth sync storage...");
      try {
        const cloudData = await loadAppDataFromCloud();
        if (cloudData) {
          console.log("[Server] Cloud data found! Hydrating local appData.json...");
          saveDataLocal(cloudData);
        } else {
          console.log("[Server] No cloud backup found (or new project). Using local initial state.");
        }
      } catch (e) {
        console.error("[Server] Error loading from cloud backup:", e);
      }
      isCloudLoaded = true;
    }
    res.json(loadDataLocal());
  });

  // API Route: Save data
  app.post("/api/data", async (req, res) => {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: "Missing body" });
    }
    const success = saveDataLocal(data);
    if (success) {
      // Background upload to Cloud
      saveAppDataToCloud(data).then(syncSuccess => {
        if (syncSuccess) {
          console.log("[Server] Successfully backed up active state to Cloud Auth Sync.");
        } else {
          console.warn("[Server] Cloud Sync warning: Update failed to backup.");
        }
      }).catch(err => {
        console.error("[Server] Cloud Sync threw exception:", err);
      });

      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to write data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
