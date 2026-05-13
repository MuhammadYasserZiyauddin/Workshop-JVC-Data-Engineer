import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/clean-suggest", async (req, res) => {
    try {
      const { metadata, sampleData } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a data cleaning expert. Based on this metadata, identify issues (missing values, duplicates, wrong types, outliers). Suggest specific Danfo.js operations to fix them. 
Return the response in a structured JSON format matching this schema: 
{ "suggestions": [{ "id": "string", "label": "string", "description": "string", "danfoCode": "string" }] }
The "danfoCode" should be a single executable JavaScript statement assuming the dataframe is named "df" and it should return the modified dataframe. Example: "df.fillna({ columns: ['age'], values: [0] })" or "df.dropNa({ axis: 1 })". Do NOT use reassignment like "df = df.fillna(...)". Just return the expression. Make sure the danfo params are correct (e.g. dropNa uses { axis: 1 } instead of inplace, fillna takes an object, etc.).

Metadata:
${JSON.stringify(metadata, null, 2)}

Sample Data (first 3 rows):
${JSON.stringify(sampleData, null, 2)}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      
      if (!response.text) {
        throw new Error("No response from Gemini");
      }
      
      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate suggestions" });
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
