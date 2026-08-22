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
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Please conduct a strategic intelligence investigation.
      
Organization: ${organization}
Technology/Research Area: ${technology}
Competitors: ${competitors.join(", ")}
Time Range: ${timeRange}
Strategic Question: ${strategicQuestion}

Execute your search strategy, collect and evaluate evidence.
Only when you have gathered enough correlated evidence, output your final report matching the required schema.
Do NOT output the final report until you have used tools to gather real evidence.`,
    },
  ];

  const emit = (msg: string) => {
    if (onEvent) onEvent(msg);
  };

  emit("Understanding investigation objective...");
  
  // Prepare OpenAI tools array from our defined tools
  const tools: OpenAI.Chat.ChatCompletionTool[] = Object.entries(allTools).map(
    ([name, tool]) => {
      // Need a simple JSON schema representation for the function parameters
      // We manually build it here for simplicity or could use zod-to-json-schema
      let parameters = {};
      if (name === "search_research" || name === "search_patents" || name === "search_web_news") {
        parameters = {
          type: "object",
          properties: {
            query: { type: "string", description: tool.schema.shape.query.description },
            limit: { type: "number", description: tool.schema.shape.limit.unwrap().description },
          },
          required: ["query"],
        };
      }

      return {
        type: "function",
        function: {
          name,
          description: tool.description,
          parameters,
        },
      };
    }
  );

  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;
    emit(iterations === 1 ? "Building research plan..." : "Evaluating evidence and continuing investigation...");
    
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages,
        tools,
        // We do not force the final schema yet. The agent uses tools, 
        // then when done, it will output a final JSON. But the easiest way 
        // in one loop is to just let it call a final "submit_report" tool 
        // OR force the response format. We will add a tool for "submit_report" to cleanly end.
      });
    } catch (e: unknown) {
      // If we don't have a real API key or there's an error, we will mock the loop execution.
      console.warn("OpenAI API call failed, running in mock mode.", e);
      return generateMockReport(technology);
    }

    const responseMessage = response.choices[0].message;
    messages.push(responseMessage);

    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== "function") continue;
        
        const name = toolCall.function.name;
        const argsStr = toolCall.function.arguments;
        
        let args;
        try {
          args = JSON.parse(argsStr);
        } catch {
          args = {};
        }

        if (name === "submit_report") {
           // We'll handle this case if we define a submit_report tool.
           // However, if we just want it to output JSON as the final message, we handle that outside tool calls.
        }

        emit(`Executing tool: ${name}...`);
        
        const toolDef = allTools[name as keyof typeof allTools];
        let result = "";
        
        if (toolDef) {
          try {
            const parsedArgs = toolDef.schema.parse(args);
            const toolOutput = await toolDef.execute(parsedArgs as any); // Type assertion needed due to union
            result = JSON.stringify(toolOutput);
            emit(`Observed results from ${name}`);
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            result = JSON.stringify({ error: errorMessage });
            emit(`Tool ${name} failed: ${errorMessage}`);
          }
        } else {
          result = JSON.stringify({ error: `Unknown tool: ${name}` });
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: result,
        });
      }
    } else {
      // If the agent doesn't call a tool, it means it's ready to output the final answer.
      // But we need to ensure it's structured. We can make a final call to enforce structured output.
      emit("Prioritizing findings and generating recommendations...");
      
      try {
        messages.push({
          role: "user",
          content: "Please output the final report as a JSON object matching this exact structure: { \"executiveSummary\": string, \"signals\": [ { \"title\": string, \"classification\": \"threat\"|\"opportunity\"|\"neutral\", \"impact\": \"high\"|\"medium\"|\"low\", \"confidence\": number, \"summary\": string, \"whyItMatters\": string, \"evidence\": [ { \"source\": string, \"title\": string, \"url\": string, \"date\": string, \"summary\": string, \"relevance\": number, \"entity\": string, \"evidenceType\": \"research\"|\"patent\"|\"news\"|\"competitor\"|\"web\" } ], \"recommendedActions\": [string] } ], \"threats\": [], \"opportunities\": [], \"emergingTrends\": [string], \"recommendations\": [string], \"evidence\": [], \"sources\": [string], \"confidence\": number }"
        });

        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4o-2024-08-06",
          messages,
          response_format: { type: "json_object" },
        });
        
        if (finalResponse.choices[0].message.content) {
          emit("Final report generated.");
          return JSON.parse(finalResponse.choices[0].message.content);
        }
      } catch (e: unknown) {
         console.warn("Failed to generate final report structured output", e);
         return generateMockReport(technology);
      }
      
      break;
    }
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
