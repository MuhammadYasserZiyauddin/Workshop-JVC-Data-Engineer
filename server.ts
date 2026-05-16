import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Phase 2: Clean Suggest (Mocked)
  app.post("/api/clean-suggest", async (req, res) => {
    try {
      res.json({ suggestions: [{ id: '1', label: 'AI Disabled', description: 'AI backend features are disabled to run without an API key.', danfoCode: 'df' }] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Phase 3: Vibe Search (Mocked)
  app.post("/api/vibe-search", async (req, res) => {
    try {
      res.json({
        filterCode: 'df',
        chartType: 'scatter',
        mappings: {},
        plotlyConfigLayout: {},
        insight: 'AI search functionalities are currently turned off.'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process search query" });
    }
  });

  // Phase 4: Narrative Insights (Mocked)
  app.post("/api/narrative", async (req, res) => {
    try {
      res.json({
        vibe: "AI Disabled Mode",
        outlier: "AI backend has been removed.",
        action: "Deploy the app seamlessly without needing API keys.",
        recommendationOverlay: {
          show: true,
          type: "info",
          message: "AI capabilities have been disabled on the backend. This component continues to function smoothly with default data."
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate narrative" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
