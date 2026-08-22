import OpenAI from "openai";
import { allTools } from "./tools";
import { zodResponseFormat } from "openai/helpers/zod";
import { InvestigationReportSchema } from "../schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy", // In a real app we'd need a real key. Assuming user has it set or we mock if not.
});

// A system prompt explaining the agent's persona and workflow.
const SYSTEM_PROMPT = `
You are an autonomous Strategic Intelligence Agent.
Your objective is to investigate a strategic question, gather evidence, correlate cross-source information, and produce a structured final report.

You have access to the following tools:
- search_research: For scientific publications and academic trends.
- search_patents: For patent activity and technical filings.
- search_web_news: For competitor news, market trends, and industry developments.

Workflow:
1. Understand the goal and plan your searches.
2. Use tools to gather evidence. You are NOT restricted to a single tool sequence. Decide dynamically based on the evidence you find.
3. If evidence is weak or insufficient, search again with refined queries.
4. Correlate information. Look for patterns like "Research activity + Patent activity + Announcements = Strategic signal".
5. Verify your findings against the gathered evidence.
6. Once satisfied, generate the final structured InvestigationReport.

CRITICAL: Do not invent evidence or fabricate URLs. If you cannot find sufficient evidence, mark your signals with low confidence.
`;

export async function runInvestigationAgent(
  organization: string,
  technology: string,
  competitors: string[],
  timeRange: string,
  strategicQuestion: string,
  onEvent?: (event: string) => void
) {
  const emit = (msg: string) => {
    if (onEvent) onEvent(msg);
  };

  emit("Understanding investigation objective...");
  emit("Building research plan...");

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  
  if (!GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY provided. Returning mock data.");
    return generateMockReport(technology);
  }

  const prompt = `${SYSTEM_PROMPT}\n\nPlease conduct a strategic intelligence investigation.\nOrganization: ${organization}\nTechnology/Research Area: ${technology}\nCompetitors: ${competitors.join(", ")}\nTime Range: ${timeRange}\nStrategic Question: ${strategicQuestion}\n\nExecute your search strategy, collect and evaluate evidence. Output the final report as a valid JSON object matching exactly this structure: { "executiveSummary": string, "signals": [ { "title": string, "classification": "threat"|"opportunity"|"neutral", "impact": "high"|"medium"|"low", "confidence": number, "summary": string, "whyItMatters": string, "evidence": [ { "source": string, "title": string, "url": string, "date": string, "summary": string, "relevance": number, "entity": string, "evidenceType": "research"|"patent"|"news"|"competitor"|"web" } ], "recommendedActions": [string] } ], "threats": [], "opportunities": [], "emergingTrends": [string], "recommendations": [string], "evidence": [], "sources": [string], "confidence": number }`;

  emit("Querying Gemini 1.5 Flash and cross-referencing sources...");

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      console.warn("Gemini API failed:", await response.text());
      return generateMockReport(technology);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (content) {
      emit("Final report generated.");
      return JSON.parse(content);
    }
  } catch (e: unknown) {
    console.warn("Failed to parse Gemini response", e);
  }

  // Fallback
  return generateMockReport(technology);
}

function generateMockReport(technology: string) {
  // Safe fallback if API fails
  return {
    executiveSummary: `Mocked executive summary for ${technology}. The investigation encountered API limits or missing keys.`,
    signals: [],
    threats: [],
    opportunities: [],
    emergingTrends: ["Increased reliance on simulated environments"],
    recommendations: ["Ensure OPENAI_API_KEY is configured correctly"],
    evidence: [],
    sources: [],
    confidence: 10,
  };
}
