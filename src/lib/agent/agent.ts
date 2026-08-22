import OpenAI from "openai";
import { allTools } from "./tools";
import { zodResponseFormat } from "openai/helpers/zod";
import { InvestigationReportSchema } from "../schemas";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const openai = new OpenAI({
  apiKey: GEMINI_API_KEY || "dummy",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

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

  console.log("[Pipeline Debug] -> Agent started for organization:", organization);
  emit("Understanding investigation objective...");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Conduct a strategic intelligence investigation.\nOrganization: ${organization}\nTechnology: ${technology}\nCompetitors: ${competitors.join(", ")}\nTime Range: ${timeRange}\nQuestion: ${strategicQuestion}`
    }
  ];

  const tools: OpenAI.Chat.ChatCompletionTool[] = Object.entries(allTools).map(([name, tool]) => ({
    type: "function",
    function: {
      name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Limit" }
        },
        required: ["query"]
      }
    }
  }));

  let iteration = 0;
  const maxIterations = 5;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`[Pipeline Debug] -> LLM Loop Iteration ${iteration}`);

    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash",
      messages,
      tools,
      tool_choice: "auto",
    });

    const msg = response.choices[0].message;
    messages.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        
        console.log(`[Pipeline Debug] -> Tool selected: ${tc.function.name} with args: ${tc.function.arguments}`);
        emit(`Executing tool: ${tc.function.name}...`);
        
        try {
          const args = JSON.parse(tc.function.arguments);
          const toolHandler = allTools[tc.function.name as keyof typeof allTools];
          if (toolHandler) {
            const result = await toolHandler.execute(args);
            console.log(`[Pipeline Debug] -> Tool result received from ${tc.function.name}. Items count: ${Array.isArray(result) ? result.length : 1}`);
            
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result)
            });
          } else {
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ error: "Tool not found" })
            });
          }
        } catch (e) {
          console.error(`[Pipeline Debug] -> Error in tool ${tc.function.name}:`, e);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: String(e) })
          });
        }
      }
    } else {
      console.log("[Pipeline Debug] -> No more tool calls. Analysis started.");
      break;
    }
  }

  // Explicit instruction for JSON generation
  console.log("[Pipeline Debug] -> Requesting final structured report JSON.");
  emit("Correlating evidence and generating final report...");

  messages.push({
    role: "user",
    content: `You have completed your research. Synthesize the tool results into the final Strategic Radar report.
You MUST output ONLY a valid JSON object matching this structure EXACTLY (do not wrap in markdown):
{
  "executiveSummary": "...",
  "signals": [
    {
      "title": "...", "classification": "threat"|"opportunity"|"neutral", "impact": "high"|"medium"|"low", 
      "confidence": 0-100, "summary": "...", "whyItMatters": "...", 
      "evidence": [{"source": "...", "title": "...", "url": "...", "date": "...", "summary": "...", "relevance": 0-1, "entity": "...", "evidenceType": "research"|"patent"|"news"|"competitor"|"web"}], 
      "recommendedActions": ["..."]
    }
  ],
  "threats": [],
  "opportunities": [],
  "emergingTrends": [],
  "recommendations": [],
  "evidence": [],
  "sources": [],
  "confidence": 0-100
}`
  });

  const finalResponse = await openai.chat.completions.create({
    model: "gemini-1.5-flash",
    messages,
    response_format: { type: "json_object" }
  });

  const content = finalResponse.choices[0].message.content || "";
  console.log("[Pipeline Debug] -> Final report generated. Attempting to parse JSON.");

  try {
    const report = JSON.parse(content);
    console.log("[Pipeline Debug] -> JSON successfully parsed.");
    return report;
  } catch (e) {
    console.error("[Pipeline Debug] -> CRITICAL ERROR: Model returned malformed structured output.");
    console.error("[Pipeline Debug] -> Raw LLM Response:", content);
    throw new Error("Failed to parse the final structured report JSON.");
  }
}
