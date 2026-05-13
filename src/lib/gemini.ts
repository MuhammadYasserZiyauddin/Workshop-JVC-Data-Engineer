import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion, DataFrameMetadata, VisualizationInsight, NarrativeInsight } from "../types";

export async function getCleaningSuggestions(metadata: DataFrameMetadata, apiKey: string): Promise<AISuggestion[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are a data cleaning expert. Based on the provided metadata, identify issues (missing values, duplicates, wrong types, outliers). 
  Suggest specific Danfo.js operations to fix them. 
  
  Return ONLY the response in a structured JSON format: { "suggestions": [{ "id", "label", "description", "danfoCode" }] }.
  
  CRITICAL: The 'danfoCode' MUST be a single line of valid Danfo.js code that operates on a variable named 'df'.
  Example: 'df.fillna({ columns: ["age"], values: [0], inplace: false })' or 'df.dropDuplicates({ inplace: false })'.
  
  Metadata Summary:
  - Columns: ${metadata.columns.join(', ')}
  - Dtypes: ${JSON.stringify(metadata.dtypes)}
  - Null Counts: ${JSON.stringify(metadata.nullCounts)}
  - Description: ${metadata.description}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Analyze this data and provide cleaning suggestions.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  danfoCode: { type: Type.STRING },
                },
                required: ["id", "label", "description", "danfoCode"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const result = JSON.parse(response.text || '{ "suggestions": [] }');
    return result.suggestions;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateVisualization(query: string, metadata: DataFrameMetadata, apiKey: string): Promise<VisualizationInsight> {
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are a data visualization assistant. You have access to a Danfo.js DataFrame schema. 
  Based on the user's natural language query, return a JSON object containing:
  - filterCode: A string of Danfo.js code to subset or transform the data, returning a new DataFrame. (Use 'df' as the input variable. e.g. 'df.query(df["price"].gt(100))' or 'df.groupby(["category"]).sum()'). 
    If no filtering/grouping is needed, return null. The result of this code will be assigned to 'plotDf'.
  - chartType: The Plotly chart type to use (e.g., 'scatter', 'bar', 'pie', 'line').
  - plotlyConfig: The 'data' and 'layout' objects for Plotly.js. 
    Specifically, provide:
    plotlyConfig: {
      xColumn?: string; // column name for x axis
      yColumn?: string; // column name for y axis
      labelColumn?: string; // column name for pie chart labels
      valueColumn?: string; // column name for pie chart values
      layout: any; // plotly layout object
    }
  - insight: A 1-sentence explanation of what the user is looking at.
  
  Metadata Summary:
  - Columns: ${metadata.columns.join(', ')}
  - Dtypes: ${JSON.stringify(metadata.dtypes)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filterCode: { type: Type.STRING, nullable: true },
            chartType: { type: Type.STRING },
            plotlyConfig: {
              type: Type.OBJECT,
              properties: {
                xColumn: { type: Type.STRING, nullable: true },
                yColumn: { type: Type.STRING, nullable: true },
                labelColumn: { type: Type.STRING, nullable: true },
                valueColumn: { type: Type.STRING, nullable: true },
                layout: { type: Type.OBJECT }
              }
            },
            insight: { type: Type.STRING }
          },
          required: ["chartType", "plotlyConfig", "insight"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as VisualizationInsight;
  } catch (error) {
    console.error("Gemini Vibe Search Error:", error);
    throw error;
  }
}

export async function generateNarrative(metadata: DataFrameMetadata, apiKey: string, chartContext?: any): Promise<NarrativeInsight> {
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are a Senior Data Analyst. Analyze the following data summary and the current chart configuration. Write 3 bullet points:
1. The Vibe: A high-level summary of the trend.
2. The Outlier: Identify one interesting anomaly or peak.
3. The Action: Suggest one business or personal decision based on this data.
4. isWarning: A boolean indicating if this requires urgent attention (e.g. downward trend, excessive nulls).

The narrative should be written in a professional yet conversational tone (e.g., "It looks like your weekends are driving 60% of your revenue...").
Return as JSON.

Data Summary:
- Columns: ${metadata.columns.join(', ')}
- Description: ${metadata.description}
${chartContext ? `- Chart Context: ${JSON.stringify(chartContext)}` : ''}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate a data story.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vibe: { type: Type.STRING },
            outlier: { type: Type.STRING },
            action: { type: Type.STRING },
            isWarning: { type: Type.BOOLEAN }
          },
          required: ["vibe", "outlier", "action", "isWarning"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as NarrativeInsight;
  } catch (error) {
    console.error("Gemini Narrative Error:", error);
    throw error;
  }
}
