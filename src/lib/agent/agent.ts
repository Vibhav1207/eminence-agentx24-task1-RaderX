import { GoogleGenAI, Type } from "@google/genai";
import { allTools } from "./tools";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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

const tools = [{
  functionDeclarations: Object.entries(allTools).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
        limit: { type: Type.NUMBER, description: "Limit" }
      },
      required: ["query"]
    }
  }))
}];

import { emitAgentEvent } from "./events";

export async function runInvestigationAgent(
  investigationId: string,
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
  emitAgentEvent({
    investigationId,
    eventType: "AGENT_STARTED",
    status: "info",
    message: `Agent started for organization: ${organization}`,
  });
  
  emitAgentEvent({
    investigationId,
    eventType: "GOAL_RECEIVED",
    status: "info",
    message: `Goal received: Investigate ${technology} competitive landscape.`,
  });

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const chat = ai.chats.create({
    model: 'gemini-3.6-flash',
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: tools as any,
    }
  });

  const prompt = `Conduct a strategic intelligence investigation.\nOrganization: ${organization}\nTechnology: ${technology}\nCompetitors: ${competitors.join(", ")}\nTime Range: ${timeRange}\nQuestion: ${strategicQuestion}`;

  let iteration = 0;
  const maxIterations = 5;
  let response = await chat.sendMessage({ message: prompt });

  while (iteration < maxIterations && response.functionCalls && response.functionCalls.length > 0) {
    iteration++;
    console.log(`[Pipeline Debug] -> LLM Loop Iteration ${iteration}`);
    if (iteration > 1) {
      emitAgentEvent({
        investigationId,
        eventType: "NEXT_ACTION_SELECTED",
        status: "info",
        message: `Agent determined another action is necessary (Iteration ${iteration})`
      });
    }
    
    const functionResponses = [];

    for (const call of response.functionCalls) {
      const toolName = call.name || "unknown_tool";
      console.log(`[Pipeline Debug] -> Tool selected: ${toolName}`);
      
      try {
        const args = call.args as any;
        const toolHandler = allTools[toolName as keyof typeof allTools];
        
        emitAgentEvent({
          investigationId,
          eventType: "TOOL_SELECTED",
          toolName,
          status: "info",
          message: `Agent selected ${toolName}`
        });

        // Show the user exactly what is being searched
        if (args.query) {
          emit(`Searching ${toolName.replace('search_', '')} for: "${args.query}"...`);
        } else {
          emit(`Executing tool: ${toolName}...`);
        }

        if (toolHandler) {
          const startTime = Date.now();
          emitAgentEvent({
            investigationId,
            eventType: "TOOL_STARTED",
            toolName,
            status: "info",
            message: `Executing ${toolName} with query: ${args.query || 'none'}`
          });

          const result = await toolHandler.execute(args);
          const durationMs = Date.now() - startTime;
          const itemsCount = Array.isArray(result) ? result.length : 1;
          
          emitAgentEvent({
            investigationId,
            eventType: "TOOL_COMPLETED",
            toolName,
            status: "success",
            durationMs,
            message: `${toolName} completed successfully`,
            resultMetadata: { count: itemsCount }
          });
          
          emitAgentEvent({
            investigationId,
            eventType: "EVIDENCE_RECEIVED",
            toolName,
            status: "info",
            message: `Agent received ${itemsCount} items of evidence`
          });

          console.log(`[Pipeline Debug] -> Tool result received from ${toolName}. Items count: ${itemsCount}`);
          
          functionResponses.push({
            functionResponse: { name: toolName, response: { items: result } }
          });
          
          emitAgentEvent({
            investigationId,
            eventType: "EVIDENCE_EVALUATED",
            status: "info",
            message: `Agent evaluating evidence from ${toolName}`
          });
        } else {
          emitAgentEvent({
            investigationId,
            eventType: "TOOL_FAILED",
            toolName,
            status: "error",
            message: `Tool ${toolName} is not registered`
          });
          functionResponses.push({
            functionResponse: { name: toolName, response: { error: "Tool not found" } }
          });
        }
      } catch (e) {
        console.error(`[Pipeline Debug] -> Error in tool ${toolName}:`, e);
        emitAgentEvent({
          investigationId,
          eventType: "TOOL_FAILED",
          toolName,
          status: "error",
          message: `Tool execution failed: ${String(e)}`
        });
        functionResponses.push({
          functionResponse: { name: toolName, response: { error: String(e) } }
        });
      }
    }
    
    try {
      response = await chat.sendMessage({ message: functionResponses as any });
    } catch (e) {
      console.error(`[Pipeline Debug] -> API Error during tool loop iteration ${iteration}:`, e);
      throw e; // Throw to fail the pipeline and let route.ts catch it
    }
  }

  console.log("[Pipeline Debug] -> No more tool calls. Analysis started.");
  console.log("[Pipeline Debug] -> Requesting final structured report JSON.");
  emit("Correlating evidence and generating final report...");

  const history = await chat.getHistory();
  
  const finalPrompt = `You have completed your research. Synthesize the tool results into the final Strategic Radar report.
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
}`;

  let finalResponse;
  try {
    finalResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: finalPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });
  } catch (e) {
    console.error(`[Pipeline Debug] -> API Error during final report generation:`, e);
    throw e;
  }

  const content = finalResponse.text || "";
  console.log("[Pipeline Debug] -> Final report generated. Attempting to parse JSON.");

  try {
    const report = JSON.parse(content);
    console.log("[Pipeline Debug] -> JSON successfully parsed.");
    
    emitAgentEvent({
      investigationId,
      eventType: "INVESTIGATION_COMPLETED",
      status: "success",
      message: "Investigation successfully completed and final report generated"
    });
    
    return report;
  } catch (e) {
    console.error("[Pipeline Debug] -> CRITICAL ERROR: Model returned malformed structured output.");
    console.error("[Pipeline Debug] -> Raw LLM Response:", content);
    
    emitAgentEvent({
      investigationId,
      eventType: "INVESTIGATION_FAILED",
      status: "error",
      message: "Investigation failed: model returned malformed JSON"
    });
    
    throw new Error("Failed to parse the final structured report JSON.");
  }
}
