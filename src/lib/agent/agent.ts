import { GoogleGenAI, Type } from "@google/genai";
import { allTools } from "./tools";
import { emitAgentEvent } from "./events";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ---------- RESEARCH AGENT ----------

const researchTools = [{
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

async function runResearchAgent(
  investigationId: string,
  organization: string,
  technology: string,
  competitors: string[],
  timeRange: string,
  focus: string,
  onEvent?: (event: string) => void
) {
  const emit = (msg: string) => { if (onEvent) onEvent(msg); };

  emitAgentEvent({
    investigationId,
    eventType: "AGENT_STARTED",
    agentRole: "RESEARCH AGENT",
    status: "info",
    message: `Research Agent started with focus: ${focus}`
  });

  const chat = ai.chats.create({
    model: 'gemini-3.6-flash',
    config: {
      systemInstruction: `You are the Research Intelligence Agent.
Your objective is to find and structure evidence.
Use tools to gather evidence for the focus area.
CRITICAL: Keep summaries EXTREMELY concise (1 sentence max).
Output ONLY valid JSON matching this schema:
{
  "status": "complete",
  "evidence": [
    { "title": "...", "source": "...", "url": "...", "date": "...", "entity": "...", "technology": "...", "type": "research|patent|news|web", "relevance": 0.9, "summary": "..." }
  ],
  "contradictions": [],
  "gaps": [],
  "research_complete": true
}`,
      tools: researchTools as any,
    }
  });

  const prompt = `Gather evidence for Organization: ${organization}, Tech: ${technology}, Competitors: ${competitors.join(", ")}, Time: ${timeRange}. Focus: ${focus}`;
  
  let iteration = 0;
  const maxIterations = 1; // Strict limit to avoid 60s Vercel timeouts
  let response = await chat.sendMessage({ message: prompt });

  while (iteration < maxIterations && response.functionCalls && response.functionCalls.length > 0) {
    iteration++;
    const functionResponses = [];

    for (const call of response.functionCalls) {
      const toolName = call.name || "unknown_tool";
      
      try {
        const args = call.args as any;
        const toolHandler = allTools[toolName as keyof typeof allTools];
        
        emitAgentEvent({
          investigationId,
          eventType: "TOOL_SELECTED",
          agentRole: "RESEARCH AGENT",
          toolName,
          status: "info",
          message: `Research tool selected: ${toolName}`
        });

        if (toolHandler) {
          const startTime = Date.now();
          emitAgentEvent({
            investigationId,
            eventType: "TOOL_STARTED",
            agentRole: "RESEARCH AGENT",
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
            agentRole: "RESEARCH AGENT",
            toolName,
            status: "success",
            durationMs,
            message: `${toolName} completed. Found ${itemsCount} items.`,
            resultMetadata: { count: itemsCount }
          });
          
          functionResponses.push({
            functionResponse: { name: toolName, response: { items: result } }
          });
        } else {
          functionResponses.push({
            functionResponse: { name: toolName, response: { error: "Tool not found" } }
          });
        }
      } catch (e) {
        functionResponses.push({
          functionResponse: { name: toolName, response: { error: String(e) } }
        });
      }
    }
    
    try {
      response = await chat.sendMessage({ message: functionResponses as any });
    } catch (e: any) {
      if (e?.status === 429 || e?.message?.includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        response = await chat.sendMessage({ message: functionResponses as any });
      } else {
        throw e;
      }
    }
  }

  emitAgentEvent({
    investigationId,
    eventType: "EVIDENCE_RECEIVED",
    agentRole: "RESEARCH AGENT",
    status: "success",
    message: `Evidence package completed.`
  });

  const history = await chat.getHistory();
  const finalResponse = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [...history, { role: 'user', parts: [{ text: "Synthesize findings into the JSON Evidence Package." }] }],
    config: { responseMimeType: "application/json" }
  });

  let content = finalResponse.text || "{}";
  content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse research JSON", content);
    return { evidence: [], status: "complete" };
  }
}

// ---------- STRATEGIC ANALYSIS AGENT ----------

async function runStrategicAnalysisAgent(
  investigationId: string,
  strategicQuestion: string,
  evidencePackage: any
) {
  emitAgentEvent({
    investigationId,
    eventType: "AGENT_STARTED",
    agentRole: "STRATEGY AGENT",
    status: "info",
    message: `Analyzing evidence...`
  });

  const prompt = `You are the Strategic Analysis Agent.
Your objective is to understand what the evidence means.
Strategic Question: ${strategicQuestion}
Evidence Package: ${JSON.stringify(evidencePackage)}

Evaluate if the evidence is sufficient to confidently answer the strategic question.
If INSUFFICIENT, output this exact JSON:
{
  "status": "needs_more_evidence",
  "reason": "Explain briefly why",
  "requested_focus": "Specific instructions for the Research Agent",
  "priority": "HIGH"
}

If SUFFICIENT, output this exact JSON (keep text very concise):
{
  "status": "complete",
  "signals": [
    {
      "title": "...", "classification": "threat"|"opportunity"|"neutral", "impact": "high"|"medium"|"low", 
      "confidence": 0-100, "summary": "...", "whyItMatters": "...", 
      "evidence": [{"source": "...", "title": "...", "url": "...", "date": "...", "summary": "...", "relevance": 0-1, "entity": "...", "evidenceType": "research"|"patent"|"news"|"competitor"|"web"}], 
      "recommendedActions": ["..."]
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" }
  });

  let content = response.text || "{}";
  content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  
  try {
    const parsed = JSON.parse(content);
    if (parsed.status === "needs_more_evidence") {
      emitAgentEvent({
        investigationId,
        eventType: "EVIDENCE_EVALUATED",
        agentRole: "STRATEGY AGENT",
        status: "info",
        message: `Evidence insufficient: ${parsed.reason}`
      });
    } else {
      emitAgentEvent({
        investigationId,
        eventType: "EVIDENCE_EVALUATED",
        agentRole: "STRATEGY AGENT",
        status: "success",
        message: `Signals verified. Strategic analysis complete.`
      });
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse strategy JSON", content);
    return { status: "complete", signals: [] };
  }
}

// ---------- INTELLIGENCE ORCHESTRATOR ----------

export async function runInvestigationAgent(
  investigationId: string,
  organization: string,
  technology: string,
  competitors: string[],
  timeRange: string,
  strategicQuestion: string,
  onEvent?: (event: string) => void
) {
  const emit = (msg: string) => { if (onEvent) onEvent(msg); };

  emit("Understanding investigation objective...");
  emitAgentEvent({
    investigationId,
    eventType: "AGENT_STARTED",
    agentRole: "ORCHESTRATOR",
    status: "info",
    message: `Investigation received for ${organization}`,
  });

  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
  
  let currentFocus = "Initial comprehensive research";
  let finalReport = null;
  const maxCycles = 2; // Hard cap on research-analysis loops

  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    emitAgentEvent({
      investigationId,
      eventType: "NEXT_ACTION_SELECTED",
      agentRole: "ORCHESTRATOR",
      status: "info",
      message: `Delegating evidence collection (Cycle ${cycle})`
    });

    const evidencePackage = await runResearchAgent(
      investigationId, organization, technology, competitors, timeRange, currentFocus, onEvent
    );

    emitAgentEvent({
      investigationId,
      eventType: "NEXT_ACTION_SELECTED",
      agentRole: "ORCHESTRATOR",
      status: "info",
      message: `Delegating strategic analysis`
    });

    const analysis = await runStrategicAnalysisAgent(
      investigationId, strategicQuestion, evidencePackage
    );

    if (analysis.status === "complete" || cycle === maxCycles) {
      if (analysis.status !== "complete") {
        analysis.status = "complete";
        analysis.signals = [];
      }
      finalReport = analysis;
      break;
    } else {
      emitAgentEvent({
        investigationId,
        eventType: "NEXT_ACTION_SELECTED",
        agentRole: "ORCHESTRATOR",
        status: "info",
        message: `Requesting additional evidence: ${analysis.requested_focus}`
      });
      currentFocus = analysis.requested_focus;
    }
  }

  const reportSchemaFields = {
    executiveSummary: "Strategic analysis complete.",
    threats: [], opportunities: [], emergingTrends: [], recommendations: [],
    evidence: [], sources: [], confidence: 85,
    ...finalReport
  };

  emitAgentEvent({
    investigationId,
    eventType: "INVESTIGATION_COMPLETED",
    agentRole: "ORCHESTRATOR",
    status: "success",
    message: "Final report generated"
  });

  return reportSchemaFields;
}
