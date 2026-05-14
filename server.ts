import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini
  const getAi = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set.");
    return new GoogleGenAI({ apiKey: key });
  };

  // Phase 2: Clean Suggest
  app.post("/api/clean-suggest", async (req, res) => {
    try {
      const { metadata, sampleData } = req.body;
      const ai = getAi();
      
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
The "danfoCode" should be a single executable JavaScript statement assuming the dataframe is named "df" and it should return the modified dataframe. Example: "df.fillna({ columns: ['age'], values: [0] })" or "df.dropNa({ axis: 1 })". Do NOT use reassignment like "df = df.fillna(...)". Just return the expression. Make sure the danfo params are correct.

Metadata:
${JSON.stringify(metadata, null, 2)}

Sample Data:
${JSON.stringify(sampleData, null, 2)}`
              }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Phase 3: Vibe Search (Conversational EDA)
  app.post("/api/vibe-search", async (req, res) => {
    try {
      const { query, schema } = req.body;
      const ai = getAi();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a data visualization assistant. You have access to a Danfo.js DataFrame schema. Based on the user's natural language query, return a JSON object containing:
- "filterCode": A string of Danfo.js code to subset/transform the data (e.g., 'df.query(df["price"].gt(100))'). If no filtering needed, return simply 'df'. Do NOT use assignment.
- "chartType": The Plotly chart type (e.g., 'scatter', 'bar', 'pie').
- "plotlyConfig": The 'data' and 'layout' objects for Plotly.js. Use placeholders like "{{xData}}" or "{{yData}}" for arrays that we will inject in the client, or suggest the column names to use. Actually, just provide the column names to map: { xColumn: 'col_name', yColumn: 'col_name', zColumn: 'col_name', colorColumn: 'col_name' }.
- "insight": A 1-sentence explanation of what the user is looking at.

Return schema:
{
  "filterCode": "string",
  "chartType": "string",
  "mappings": { "xColumn": "string|null", "yColumn": "string|null", "valuesColumn": "string|null", "labelsColumn": "string|null" },
  "plotlyConfigLayout": {},
  "insight": "string"
}

User Query: "${query}"

DataFrame Schema (Columns and Types):
${JSON.stringify(schema, null, 2)}`
              }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process search query" });
    }
  });

  // Phase 4: Narrative Insights
  app.post("/api/narrative", async (req, res) => {
    try {
      const { dataSummary, chartDetails } = req.body;
      const ai = getAi();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyze the following data summary and the current chart configuration. Write exactly 3 bullet points in a professional yet conversational tone:
1. **The Vibe**: A high-level summary of the trend.
2. **The Outlier**: Identify one interesting anomaly or peak.
3. **The Action**: Suggest one business or personal decision based on this data.

Also determine if there is an urgent/warning recommendation (e.g., downward trend, high missing values).

Return JSON schema:
{
  "vibe": "string",
  "outlier": "string",
  "action": "string",
  "recommendationOverlay": {
    "show": boolean,
    "type": "warning" | "success" | "info",
    "message": "string"
  }
}

Data Summary:
${JSON.stringify(dataSummary, null, 2)}

Chart Details:
${JSON.stringify(chartDetails, null, 2)}`
              }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
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
