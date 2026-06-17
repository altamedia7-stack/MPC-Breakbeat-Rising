import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add broad CORS and body parsing
  app.use(express.json({ limit: '10mb' }));

  const DATA_FILE = path.join(process.cwd(), 'appData.json');

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

  const loadData = () => {
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

  const saveData = (data: any) => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error("Error writing data file", e);
      return false;
    }
  };

  // API Route: Get data
  app.get("/api/data", (req, res) => {
    res.json(loadData());
  });

  // API Route: Save data
  app.post("/api/data", (req, res) => {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: "Missing body" });
    }
    const success = saveData(data);
    if (success) {
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
