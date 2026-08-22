import { getDb } from "../mongodb";

export type AgentEventType = 
  | "AGENT_STARTED"
  | "GOAL_RECEIVED"
  | "TOOL_SELECTED"
  | "TOOL_STARTED"
  | "TOOL_COMPLETED"
  | "TOOL_FAILED"
  | "EVIDENCE_RECEIVED"
  | "EVIDENCE_EVALUATED"
  | "NEXT_ACTION_SELECTED"
  | "INVESTIGATION_COMPLETED"
  | "INVESTIGATION_FAILED"
  | "MEMORY";

export interface AgentEvent {
  investigationId: string;
  timestamp: string;
  eventType: AgentEventType;
  agentRole?: string;
  toolName?: string;
  status: "success" | "info" | "error";
  message: string;
  durationMs?: number;
  resultMetadata?: Record<string, any>;
}

export async function emitAgentEvent(event: Omit<AgentEvent, "timestamp">) {
  try {
    const db = await getDb();
    const collection = db.collection("agent_events");
    
    const fullEvent: AgentEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    
    // Non-blocking insert so it doesn't slow down the main pipeline
    collection.insertOne(fullEvent).catch((err) => {
      console.error("[AgentEventService] Failed to persist event:", err);
    });
    
    console.log(`[Agent Event] [${fullEvent.eventType}] ${fullEvent.message}`);
  } catch (err) {
    console.error("[AgentEventService] Failed to get db connection for event:", err);
  }
}
