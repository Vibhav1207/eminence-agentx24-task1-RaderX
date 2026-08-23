import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import {
  TaskModel,
  AgentType,
  AgentResultModel,
  EvidenceModel,
  ContradictionModel,
  InvestigationModel,
  MissionModel,
  MissionEventModel,
  ClaimModel,
  ProviderExecutionModel,
  TraceEventType,
  TraceEventModel,
  TraceModel,
} from "@/lib/types";
import { dbRepository } from "@/lib/db/repository";
import { defaultAgentRegistry } from "./agentRegistry";
import { defaultContextBuilderService } from "./contextBuilderService";
import { defaultSignalEngine } from "../intelligence/signalEngine";
import { defaultRelationshipDiscoveryEngine } from "../graph/relationshipDiscoveryEngine";
import { defaultSynthesisEngine } from "../intelligence/synthesisEngine";
import { defaultExecutiveBriefVersioner } from "../intelligence/executiveBriefVersioner";
import { defaultWebProvider } from "../providers/webProvider";
import { defaultEvidenceNormalizer } from "../normalization/evidenceNormalizer";
import { defaultLLMProvider } from "./llmProvider";
import { defaultClaimExtractionEngine } from "../intelligence/claimExtractionEngine";
import { defaultContradictionDetectionEngine } from "../intelligence/contradictionDetectionEngine";
import { defaultConflictResolutionEngine } from "../intelligence/conflictResolutionEngine";
import { defaultSelfEvaluationEngine } from "../intelligence/selfEvaluationEngine";
import { defaultHypothesisEngine } from "../intelligence/hypothesisEngine";
import { defaultAutonomousCorrectionEngine } from "../intelligence/autonomousCorrectionEngine";
import {
  HypothesisModel,
  SelfEvaluationResult,
  ConclusionVersion,
} from "../types";
import { traceService, createTraceEvent, sanitizeTraceData } from "@/lib/tracing/traceService";
import { AgentStatusTrace } from "@/lib/types";

// Define the state annotation using LangGraph's Annotation
export const InvestigationState = Annotation.Root({
  investigationId: Annotation<string>(),
  userObjective: Annotation<string>(),
  targetEntity: Annotation<string>(),
  topic: Annotation<string>(),
  constraints: Annotation<string[]>(),
  plan: Annotation<TaskModel[]>({
    reducer: (prev, next) => {
      const map = new Map<string, TaskModel>();
      prev.forEach(t => map.set(t.id, t));
      next.forEach(t => {
        const existing = map.get(t.id);
        if (existing) {
          map.set(t.id, { ...existing, ...t });
        } else {
          map.set(t.id, t);
        }
      });
      return Array.from(map.values());
    },
    default: () => [],
  }),
  currentTask: Annotation<TaskModel | null>({
    reducer: (prev, next) => next,
    default: () => null,
  }),
  completedTasks: Annotation<TaskModel[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  pendingTasks: Annotation<TaskModel[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  activeAgents: Annotation<AgentType[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  agentResults: Annotation<AgentResultModel[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  evidence: Annotation<EvidenceModel[]>({
    reducer: (prev, next) => {
      // Deduplicate evidence items by ID
      const map = new Map<string, EvidenceModel>();
      prev.forEach((e) => map.set(e.id, e));
      next.forEach((e) => map.set(e.id, e));
      return Array.from(map.values());
    },
    default: () => [],
  }),
  hypotheses: Annotation<string[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  verifiedHypotheses: Annotation<Record<string, 'SUPPORTED' | 'PARTIALLY SUPPORTED' | 'REFUTED' | 'INSUFFICIENT EVIDENCE'>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  conflictingEvidence: Annotation<ContradictionModel[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  toolHistory: Annotation<string[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  toolFailures: Annotation<any[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  retryCounts: Annotation<Record<string, number>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  resourceBudget: Annotation<{
    maxIterations: number;
    iterationCount: number;
    maxToolCalls: number;
    toolCallCount: number;
    maxRetries: number;
    totalRetries: number;
    executionTimeMs: number;
    maxConcurrentAgents: number;
  }>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({
      maxIterations: 5,
      iterationCount: 0,
      maxToolCalls: 15,
      toolCallCount: 0,
      maxRetries: 2,
      totalRetries: 0,
      executionTimeMs: 0,
      maxConcurrentAgents: 3,
    }),
  }),
  confidence: Annotation<number>({
    reducer: (prev, next) => next,
    default: () => 50,
  }),
  uncertainty: Annotation<string>({
    reducer: (prev, next) => next,
    default: () => 'Low',
  }),
  finalFindings: Annotation<string[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  recommendations: Annotation<any[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  openQuestions: Annotation<string[]>({
    reducer: (prev, next) => next,
    default: () => [],
  }),
  // Stage 5F: Extracted normalized claims
  claims: Annotation<ClaimModel[]>({
    reducer: (prev, next) => {
      const map = new Map<string, ClaimModel>();
      prev.forEach((c) => map.set(c.id, c));
      next.forEach((c) => map.set(c.id, c));
      return Array.from(map.values());
    },
    default: () => [],
  }),
  // Stage 5F: Preserved uncertainty texts for the final brief
  preservedUncertainties: Annotation<string[]>({
    reducer: (prev, next) => [...new Set([...prev, ...next])],
    default: () => [],
  }),
  // Stage 5G: Self-Evaluation & Hypothesis state
  evaluationIteration: Annotation<number>({
    reducer: (prev, next) => next,
    default: () => 0,
  }),
  hypothesisModels: Annotation<HypothesisModel[]>({
    reducer: (prev, next) => {
      const map = new Map<string, HypothesisModel>();
      prev.forEach((h) => map.set(h.id, h));
      next.forEach((h) => map.set(h.id, h));
      return Array.from(map.values());
    },
    default: () => [],
  }),
  selfEvaluation: Annotation<SelfEvaluationResult | null>({
    reducer: (prev, next) => next,
    default: () => null,
  }),
  latestConclusion: Annotation<string>({
    reducer: (prev, next) => next,
    default: () => '',
  }),
  executionStatus: Annotation<'PLANNING' | 'RUNNING' | 'CRITIC' | 'RESOLVING_CONFLICTS' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED'>({
    reducer: (prev, next) => next,
    default: () => 'PLANNING',
  }),
  startedAt: Annotation<string>(),
});

export type InvestigationStateType = typeof InvestigationState.State;

export const graphEventEmitter = {
  emit: (missionId: string, investigationId: string, type: any, message: string, agentType?: any, taskId?: string) => {},
  isPaused: (missionId: string) => false,
  isCancelled: (missionId: string) => false
};

// Helpers to log events to DB for the UI Trace Panel
async function logTraceEvent(
  investigationId: string,
  missionId: string,
  type: MissionEventModel['type'],
  message: string,
  agentType?: AgentType,
  taskId?: string
) {
  // Forward to orchestratorService listener (which will persist to MongoDB)
  graphEventEmitter.emit(missionId, investigationId, type, message, agentType, taskId);
  // NOTE: do NOT also call dbRepository.createMissionEvent() here — that creates a double-write.
  // The emitter path in OrchestratorService.emitEvent() handles persistence.
  console.log(`[LANGGRAPH EVENT]: [${type}] ${message}`);
}

/**
 * Enhanced trace event logging for Task 7 observability
 * Creates detailed TraceEventModel entries alongside MissionEventModel
 */
async function logTraceEventDetailed(
  traceId: string,
  runId: string,
  investigationId: string,
  missionId: string,
  eventType: TraceEventType,
  params: {
    agentId?: string;
    agentName?: string;
    status?: TraceEventModel['status'];
    durationMs?: number;
    inputMetadata?: Record<string, unknown>;
    outputMetadata?: Record<string, unknown>;
    error?: TraceEventModel['error'];
    parentEventId?: string;
    tokenUsage?: TraceEventModel['tokenUsage'];
    toolCall?: TraceEventModel['toolCall'];
    decision?: TraceEventModel['decision'];
    agentExecution?: TraceEventModel['agentExecution'];
  }
): Promise<TraceEventModel> {
  const event = createTraceEvent({
    traceId,
    runId,
    investigationId,
    eventType,
    agentId: params.agentId,
    agentName: params.agentName,
    status: params.status || 'PENDING',
    durationMs: params.durationMs,
    inputMetadata: params.inputMetadata ? sanitizeTraceData(params.inputMetadata) : undefined,
    outputMetadata: params.outputMetadata ? sanitizeTraceData(params.outputMetadata) : undefined,
    error: params.error,
    parentEventId: params.parentEventId,
    tokenUsage: params.tokenUsage,
    toolCall: params.toolCall,
    decision: params.decision,
    agentExecution: params.agentExecution,
  });
  
  traceService.addEvent(event);
  return event;
}

/**
 * Get or create trace for an investigation run
 */
async function getOrCreateTrace(runId: string, investigationId: string): Promise<TraceModel> {
  let trace = traceService.getTraceByRunId(runId);
  if (!trace) {
    trace = traceService.createTrace(runId, investigationId);
    // Log investigation started event
    await logTraceEventDetailed(
      trace.traceId,
      runId,
      investigationId,
      `mission-${investigationId}`,
      'INVESTIGATION_STARTED',
      { status: 'RUNNING' }
    );
  }
  return trace;
}

export const graphStateSync = {
  sync: (missionId: string, plan: TaskModel[]) => {}
};

// Checkpoint writer to serialize graph state to MongoDB checkpoints collection
async function saveGraphCheckpoint(investigationId: string, state: Partial<InvestigationStateType>) {
  try {
    const inv = await dbRepository.getInvestigationById(investigationId);
    if (!inv) return;

    const missionId = `mission-${investigationId}`;
    if (state.plan) {
      graphStateSync.sync(missionId, state.plan);
    }

    const { createCheckpoint, getValidCheckpoint } = require('./checkpointManager');
    
    // Retrieve the previous checkpoint to perform a state merge (avoiding partial state gaps)
    let mergedState = { investigationId, ...state };
    try {
      const prevCp = await getValidCheckpoint(investigationId);
      if (prevCp && prevCp.state) {
        mergedState = {
          investigationId,
          ...prevCp.state,
          ...state,
          resourceBudget: {
            ...(prevCp.state.resourceBudget || {}),
            ...(state.resourceBudget || {}),
          },
          plan: state.plan !== undefined ? state.plan : prevCp.state.plan,
          completedTasks: state.completedTasks !== undefined ? state.completedTasks : prevCp.state.completedTasks,
          pendingTasks: state.pendingTasks !== undefined ? state.pendingTasks : prevCp.state.pendingTasks,
          agentResults: state.agentResults !== undefined ? state.agentResults : prevCp.state.agentResults,
          evidence: state.evidence !== undefined ? state.evidence : prevCp.state.evidence,
          conflictingEvidence: state.conflictingEvidence !== undefined ? state.conflictingEvidence : prevCp.state.conflictingEvidence,
          errors: state.errors !== undefined ? state.errors : prevCp.state.errors,
        };
      }
    } catch (mergeErr) {
      console.warn("[LANGGRAPH CHECKPOINT] Could not retrieve previous checkpoint for state merge:", mergeErr);
    }

    const checkpoint = await createCheckpoint(investigationId, state.executionStatus || 'nodeTransition', mergedState);

    // Save to metadata for backwards compatibility/sync
    const metadata = {
      ...(inv.metadata || {}),
      langGraph: checkpoint.state,
      lastCheckpointId: checkpoint.id,
      lastCheckpointNode: checkpoint.currentNode,
      lastCheckpointTimestamp: checkpoint.timestamp,
    };

    const completedCount = mergedState.plan?.filter(t => t.status === 'COMPLETED' || t.status === 'PARTIAL').length ?? 0;
    const progressVal = mergedState.executionStatus === 'COMPLETED' ? 100 : Math.min(99, completedCount * 10 + 15);

    const updates: Partial<InvestigationModel> = {
      metadata,
      confidence: mergedState.confidence,
      progress: progressVal,
      orchestratorStatus: `● ${mergedState.executionStatus}`,
      orchestratorAction: `Checkpoint saved: ${checkpoint.id} (${mergedState.executionStatus})`,
    };

    if (mergedState.executionStatus === 'COMPLETED') {
      updates.status = 'COMPLETED';
    }

    await dbRepository.updateInvestigation(investigationId, updates);
  } catch (err) {
    console.error("[LANGGRAPH CHECKPOINT] Failed to save checkpoint:", err);
  }
}

/**
 * Non-blocking checkpoint for agent nodes — fires and forgets so it doesn't
 * add MongoDB round-trip latency to the critical execution path.
 */
function saveGraphCheckpointAsync(investigationId: string, state: Partial<InvestigationStateType>): void {
  saveGraphCheckpoint(investigationId, state).catch((err) => {
    console.warn('[LANGGRAPH CHECKPOINT] Background checkpoint failed (non-critical):', err?.message);
  });
}

const PLANNER_SYSTEM_PROMPT = `
You are the RADARX Master Intelligence Orchestrator.
Analyze the user research objective, the target entities, collected evidence, tool failures, and open questions to generate an optimized investigation plan.
Output a strict JSON object matching this schema:
{
  "hypotheses": ["String hypothesis context"],
  "openQuestions": ["String open question/knowledge gap"],
  "plan": [
    {
      "id": "TASK-01",
      "title": "RESEARCH: Academic preprints for target",
      "description": "Search arXiv and preprints for target technology developments",
      "agentType": "RESEARCH",
      "priority": "HIGH",
      "dependencies": [],
      "input": {
        "topic": "topic details to search"
      },
      "whyThisTask": "Generated because...",
      "infoGain": "Expected information gain explanation",
      "verificationRequired": false
    }
  ]
}

Rules:
1. AgentType must be one of: 'RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB'.
2. Do not plan system nodes like 'ORCHESTRATOR', 'SIGNAL', or 'SYNTHESIS'.
3. Set clear task dependencies. If a task requires previous outputs (e.g. competitor check requires research output), list parent task IDs in dependencies.
4. Prioritize tasks based on expected information gain.
5. If evidence conflicts are flagged or tools failed, schedule tasks to resolve them.
`;

export function validatePlan(plan: TaskModel[], objective: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validAgentTypes = new Set(['RESEARCH', 'PATENT', 'NEWS', 'COMPETITOR', 'WEB', 'SIGNAL', 'SYNTHESIS']);
  const taskIds = new Set(plan.map(t => t.id));

  // 1. Valid Agent types & dependencies existence
  for (const task of plan) {
    if (!validAgentTypes.has(task.agentType)) {
      errors.push(`Task ${task.id} has invalid agent type: ${task.agentType}`);
    }
    for (const depId of task.dependencies) {
      if (!taskIds.has(depId)) {
        errors.push(`Task ${task.id} depends on non-existent task ${depId}`);
      }
    }
  }

  // 2. Circular dependency check (using DFS)
  const adj: Record<string, string[]> = {};
  for (const task of plan) {
    adj[task.id] = task.dependencies;
  }

  const visited: Record<string, 'VISITING' | 'VISITED' | 'UNVISITED'> = {};
  for (const task of plan) {
    visited[task.id] = 'UNVISITED';
  }

  function hasCycle(id: string): boolean {
    visited[id] = 'VISITING';
    const deps = adj[id] || [];
    for (const depId of deps) {
      if (visited[depId] === 'VISITING') return true;
      if (visited[depId] === 'UNVISITED') {
        if (hasCycle(depId)) return true;
      }
    }
    visited[id] = 'VISITED';
    return false;
  }

  for (const task of plan) {
    if (visited[task.id] === 'UNVISITED') {
      if (hasCycle(task.id)) {
        errors.push(`Circular dependency detected involving task ${task.id}`);
        break;
      }
    }
  }

  // 3. Relevance check
  if (plan.length === 0) {
    errors.push(`Plan cannot be empty.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 1. Planner Node
async function plannerNode(state: InvestigationStateType): Promise<Partial<InvestigationStateType>> {
  const invId = state.investigationId;
  const inv = await dbRepository.getInvestigationById(invId);
  if (!inv) throw new Error(`Investigation ${invId} not found`);

  const missionId = `mission-${invId}`;
  const iteration = state.resourceBudget.iterationCount + 1;
  
  // Get or create trace for this run
  const runId = `run-${invId}-${Date.now()}`;
  const trace = await getOrCreateTrace(runId, invId);
  const traceId = trace.traceId;
  const graphRunId = `gr-${traceId}`;
  
  // Update trace with graph run info
  traceService.updateTrace(traceId, { graphRunId });
  
  // Log planner started
  await logTraceEvent(invId, missionId, 'PLAN_CREATED', `Planner analyzing goals for iteration ${iteration}.`, 'ORCHESTRATOR');
  const traceEvents = traceService.getEvents(traceId);
  await logTraceEventDetailed(
    traceId, runId, invId, missionId,
    'PLANNER_STARTED',
    { agentId: 'planner', agentName: 'Planner', status: 'RUNNING', parentEventId: traceEvents[0]?.eventId }
  );

  const plannerStartTime = Date.now();

  // Loop/Deadlock Detection
  const repeatedTasks = state.plan.filter(t => t.status === 'RUNNING' || t.status === 'FAILED');
  if (repeatedTasks.length > 3 && iteration > 3) {
    await logTraceEvent(invId, missionId, 'LOOP_DETECTED', `Infinite task loop detected. Activating deadlock avoidance strategy.`, 'ORCHESTRATOR');
    state.plan.forEach(t => {
      if (t.status === 'FAILED' || t.status === 'RUNNING') {
        t.status = 'COMPLETED';
      }
    });
  }

  // Check resource budget limits
  const isBudgetExhausted = iteration >= state.resourceBudget.maxIterations || state.plan.length >= 15;
  if (isBudgetExhausted) {
    await logTraceEvent(invId, missionId, 'MISSION_PAUSED', `Resource budget reached. Skipping remaining tasks.`, 'ORCHESTRATOR');
    return {
      executionStatus: 'SYNTHESIZING',
      resourceBudget: { ...state.resourceBudget, iterationCount: iteration },
    };
  }

  let updatedPlan = [...state.plan];
  let hypotheses = [...state.hypotheses];
  let openQuestions = [...state.openQuestions];

  // Early Completion / Optional Task Cancellation (Requirement 19 & 20)
  const isEarlyComplete = state.confidence >= 85 && state.evidence.length >= 4 && state.conflictingEvidence.every(c => c.status === 'RESOLVED');
  if (isEarlyComplete) {
    await logTraceEvent(invId, missionId, 'PLAN_CREATED', `Sufficient high-confidence evidence collected. Cancelling optional pending tasks.`, 'ORCHESTRATOR');
    updatedPlan.forEach(t => {
      if ((t.status === 'PENDING' || t.status === 'QUEUED' || t.status === 'BLOCKED') && t.priority !== 'CRITICAL' && t.priority !== 'HIGH') {
        t.status = 'CANCELLED';
        t.whyThisTask = "Cancelled: Sufficient high-confidence evidence exists to fulfill objective.";
      }
    });
  }

  const pendingOrQueued = updatedPlan.filter(t => t.status === 'PENDING' || t.status === 'QUEUED' || t.status === 'RUNNING');
  if (pendingOrQueued.length === 0 || iteration > 1) {
    let retries = 0;
    let success = false;
    let validationErrors: string[] = [];

    while (retries < 3 && !success) {
      try {
        const prompt = `
User Objective: "${inv.objective}"
Primary Entities: ${JSON.stringify(inv.primaryEntities)}
Technology Context: "${inv.technology || ''}"

Current Plan Status:
${JSON.stringify(updatedPlan.map(t => ({ id: t.id, title: t.title, agentType: t.agentType, status: t.status, dependencies: t.dependencies })), null, 2)}

Evidence Gathered:
${JSON.stringify(state.evidence.map(e => ({ title: e.title, summary: e.summary, source: e.source })), null, 2)}

Open Questions:
${JSON.stringify(openQuestions, null, 2)}

Hypotheses:
${JSON.stringify(hypotheses, null, 2)}

${validationErrors.length > 0 ? `Your previous response failed validation with errors: \n- ${validationErrors.join('\n- ')}\n\nCorrect these errors and regenerate.` : ''}

Output the updated JSON plan according to the schema.
`;
        const resText = await defaultLLMProvider.complete({
          prompt,
          systemPrompt: PLANNER_SYSTEM_PROMPT,
          temperature: 0.1
        });

        const cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.plan && Array.isArray(parsed.plan)) {
          const generatedTasks: TaskModel[] = parsed.plan.map((t: any) => {
            const existing = updatedPlan.find(ep => ep.id === t.id);
            if (existing) return existing;

            return {
              id: t.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              missionId,
              investigationId: invId,
              agentType: t.agentType,
              title: t.title || `${t.agentType} Investigation`,
              description: t.description || '',
              status: 'PENDING',
              priority: t.priority || 'MEDIUM',
              dependencies: t.dependencies || [],
              input: t.input || {},
              evidenceIds: [],
              createdAt: new Date().toISOString(),
              retryCount: 0,
              maxRetries: 1,   // bounded retries: 1 retry + fallback, not 2
              whyThisTask: t.whyThisTask,
              infoGain: t.infoGain,
              verificationRequired: t.verificationRequired || false,
            };
          });

          // Duplicate Task Detection (Requirement 15)
          const mergedPlan = [...updatedPlan];
          for (const gt of generatedTasks) {
            if (!mergedPlan.some(t => t.id === gt.id)) {
              mergedPlan.push(gt);
            }
          }

          // Validate (Requirement 2)
          const val = validatePlan(mergedPlan, inv.objective);
          if (val.valid) {
            updatedPlan = mergedPlan;
            hypotheses = parsed.hypotheses || hypotheses;
            openQuestions = parsed.openQuestions || openQuestions;
            success = true;
          } else {
            validationErrors = val.errors;
            retries++;
            await logTraceEvent(invId, missionId, 'PLAN_CREATED', `Plan validation failed (attempt ${retries}/3): ${val.errors[0]}`, 'ORCHESTRATOR');
          }
        } else {
          throw new Error("Invalid output format: plan array missing");
        }
      } catch (err: any) {
        retries++;
        validationErrors = [err.message || "Unknown error"];
        await logTraceEvent(invId, missionId, 'PLAN_CREATED', `Planner generation error (attempt ${retries}/3): ${err.message}`, 'ORCHESTRATOR');
      }
    }

    if (!success && updatedPlan.length === 0) {
      await logTraceEvent(invId, missionId, 'PLAN_CREATED', `LLM Planner failed repeatedly. Falling back to default baseline tasks.`, 'ORCHESTRATOR');
      const baselineTasks: TaskModel[] = [
        {
          id: `task-res-${Date.now()}`,
          missionId,
          investigationId: invId,
          agentType: 'RESEARCH',
          title: `RESEARCH: Baseline Search`,
          description: `Analyze academic preprints for ${inv.title}`,
          status: 'PENDING',
          priority: 'HIGH',
          dependencies: [],
          input: { topic: inv.objective },
          evidenceIds: [],
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 1,
        }
      ];
      updatedPlan.push(...baselineTasks);
    }
  }

  // Resource-Aware Routing (Requirement 13)
  const isResourceConstrained = state.resourceBudget.toolCallCount >= 8 || iteration >= 3;
  if (isResourceConstrained) {
    await logTraceEvent(invId, missionId, 'PLAN_CREATED', `Resource limits near. Prioritizing critical paths and skipping enrichment tasks.`, 'ORCHESTRATOR');
    updatedPlan.forEach(t => {
      if (t.status === 'PENDING' && t.priority !== 'HIGH' && t.priority !== 'CRITICAL') {
        t.status = 'CANCELLED';
      }
    });
  }

  // Early Task Cancellation based on confidence & evidence (Requirement 15)
  const hasHighConfidence = (state.confidence && state.confidence >= 80) || (state.evidence && state.evidence.length >= 3);
  if (hasHighConfidence) {
    await logTraceEvent(invId, missionId, 'PLAN_CREATED', `Sufficient confidence (${state.confidence}%) and evidence gathered. Skipping low-priority optional tasks.`, 'ORCHESTRATOR');
    updatedPlan.forEach(t => {
      if ((t.status === 'PENDING' || t.status === 'QUEUED' || t.status === 'BLOCKED') && t.priority === 'LOW') {
        t.status = 'CANCELLED';
      }
    });
  }

  // Update tasks statuses to QUEUED if they are ready (all dependencies met)
  const completedTaskIds = new Set(updatedPlan.filter(t => t.status === 'COMPLETED' || t.status === 'PARTIAL' || t.status === 'VERIFYING').map(t => t.id));
  updatedPlan.forEach(t => {
    if (t.status === 'PENDING') {
      const depsMet = t.dependencies.every(depId => completedTaskIds.has(depId));
      if (depsMet) {
        t.status = 'QUEUED';
      } else {
        t.status = 'BLOCKED';
      }
    } else if (t.status === 'BLOCKED') {
      const depsMet = t.dependencies.every(depId => completedTaskIds.has(depId));
      if (depsMet) {
        t.status = 'QUEUED';
      }
    }
  });

  const updatedState = {
    plan: updatedPlan,
    hypotheses,
    openQuestions,
    executionStatus: 'RUNNING' as const,
    resourceBudget: { ...state.resourceBudget, iterationCount: iteration },
  };

  // Emit planner duration for trace timing (Fix I)
  const plannerDurationMs = Date.now() - plannerStartTime;
  const plannerTrace = await traceService.getTracesByInvestigation(invId);
  const pt = plannerTrace[0];
  if (pt) {
    await logTraceEventDetailed(
      pt.traceId, pt.runId, invId, missionId,
      'PLANNER_COMPLETED',
      {
        agentId: 'planner',
        agentName: 'Planner',
        status: 'SUCCESS',
        durationMs: plannerDurationMs,
        outputMetadata: { tasksGenerated: updatedPlan.length, iteration },
      }
    );
    traceService.updateTraceMetrics(pt.traceId);
  }

  // Non-blocking checkpoint for planner (allows graph to proceed immediately)
  saveGraphCheckpointAsync(invId, updatedState);
  return updatedState;
}

// Generic runner node for agents implementing Retry, Fallback, and Failure Recovery
async function runAgentNode(agentType: AgentType, state: InvestigationStateType): Promise<Partial<InvestigationStateType>> {
  const invId = state.investigationId;
  const missionId = `mission-${invId}`;
  
  // Get trace for this run (assuming trace was created in planner)
  const traces = await traceService.getTracesByInvestigation(invId);
  const trace = traces[0];
  const traceId = trace?.traceId;
  const runId = trace?.runId;
  
  // Pause & Cancel check loop
  while (graphEventEmitter.isPaused(missionId)) {
    if (graphEventEmitter.isCancelled(missionId)) {
      return { executionStatus: 'FAILED' as any };
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (graphEventEmitter.isCancelled(missionId)) {
    return { executionStatus: 'FAILED' as any };
  }

  // Find current task in the plan for this agent type
  const task = state.plan.find((t) => t.agentType === agentType && t.status === 'QUEUED');
  if (!task) {
    return {}; // No pending task for this agent
  }

  // Get adversarial flags from database metadata
  const inv = await dbRepository.getInvestigationById(invId);
  const metadata = inv?.metadata || {};
  const forceResearchFail = metadata.forceResearchFail === true;
  const forcePatentTimeout = metadata.forcePatentTimeout === true;

  task.status = 'RUNNING';
  task.startedAt = new Date().toISOString();
  await logTraceEvent(invId, missionId, 'TASK_STARTED', `Agent [${agentType}] starting execution.`, agentType, task.id);
  
  // Detailed trace: agent execution started
  if (traceId && runId) {
    const traceEvents = traceService.getEvents(traceId);
    await logTraceEventDetailed(
      traceId, runId, invId, missionId,
      'AGENT_STARTED',
      { 
        agentId: task.id, 
        agentName: agentType, 
        status: 'RUNNING', 
        parentEventId: traceEvents[0]?.eventId,
        agentExecution: {
          agentType,
          role: agentType,
          agentRole: agentType,
          startTime: new Date().toISOString(),
          status: 'RUNNING' as AgentStatusTrace,
          retryCount: 0,
          toolsUsed: [],
          errors: [],
          inputContextMetadata: { task: task.title, input: task.input },
        }
      }
    );
  }

  let success = false;
  let evidenceItems: EvidenceModel[] = [];
  let errorMsg = '';
  let retries = 0;
  const maxRetries = task.maxRetries || 2;

  const agent = defaultAgentRegistry.getAgent(agentType);
  if (!agent) {
    task.status = 'FAILED';
    return { plan: state.plan };
  }

  const agentContext = await defaultContextBuilderService.buildAgentContext(
    inv!,
    { id: missionId } as MissionModel,
    task,
    agentType
  );

  const agentStartTime = Date.now();

  while (retries <= maxRetries && !success) {
    try {
      // Simulate adversarial failures
      if (agentType === 'RESEARCH' && forceResearchFail) {
        throw new Error("Adversarial injection: Crossref Research Provider connection timeout.");
      }
      if (agentType === 'PATENT' && forcePatentTimeout) {
        throw new Error("Adversarial injection: USPTO Patent search read timeout (timeout after 6000ms).");
      }

      // Execute actual agent logic
      const result = await agent.run(agentContext);
      evidenceItems = result.evidenceItems || [];
      success = true;
    } catch (err: any) {
      retries++;
      errorMsg = err.message || "Unknown tool exception";
      task.retryCount = retries;

      await logTraceEvent(
        invId,
        missionId,
        'TOOL_CALL_FAILED',
        `Tool Failure [${agentType}] - Attempt ${retries}/${maxRetries} failed: ${errorMsg}. Retrying...`,
        agentType,
        task.id
      );
      
      // Detailed trace: retry event
      if (traceId && runId) {
        await logTraceEventDetailed(
          traceId, runId, invId, missionId,
          'TOOL_CALL_FAILED',
          { 
            agentId: task.id, 
            agentName: agentType, 
            status: 'RUNNING', 
            error: { 
              type: 'TOOL_HTTP_ERROR', 
              message: errorMsg, 
              component: agentType, 
              retryCount: retries,
              finalStatus: 'RETRYING' as const
            }
          }
        );
      }

      // Exponential backoff wait
      await new Promise(r => setTimeout(r, 1000 * retries));
    }
  }

  // Implement fallback logic if retries fail
  if (!success) {
    await logTraceEvent(
      invId,
      missionId,
      'FALLBACK_UNAVAILABLE',
      `Tool retries exhausted for agent ${agentType}. Attempting fallback...`,
      agentType,
      task.id
    );

    // Fallback: PATENT agent falls back to searching via Web search
    if (agentType === 'PATENT') {
      try {
        const query = inv?.primaryEntities[0] || inv?.title || 'Patent';
        const fallbackResults = await defaultWebProvider.search(`Patent filings for ${query}`, { limit: 2 });
        if (fallbackResults.length > 0) {
          await logTraceEvent(
            invId,
            missionId,
            'RECOVERED',
            `Fallback success: Patent filing insights retrieved via Web Intelligence search.`,
            agentType,
            task.id
          );

          evidenceItems = fallbackResults
            .map((res: any) => defaultEvidenceNormalizer.normalizeSourceResult(res, invId, 'agent-fallback').evidence)
            .filter((e: EvidenceModel) => e.verificationStatus === 'VERIFIED');

          if (evidenceItems.length > 0) {
            success = true;
          }
          
          // Detailed trace: fallback recovery
          if (traceId && runId && success) {
            await logTraceEventDetailed(
              traceId, runId, invId, missionId,
              'RECOVERY',
              { 
                agentId: task.id, 
                agentName: agentType, 
                status: 'SUCCESS',
                outputMetadata: { fallbackUsed: true, fallbackProvider: 'Web Intelligence', evidenceCount: evidenceItems.length }
              }
            );
          }
        }
      } catch (fallbackErr: any) {
        console.error("Fallback provider failed:", fallbackErr);
      }
    }
  }

  const agentDurationMs = Date.now() - agentStartTime;

  if (success) {
    if (task.verificationRequired) {
      task.status = 'VERIFYING';
    } else if (evidenceItems.length === 1) {
      task.status = 'PARTIAL';
    } else {
      task.status = 'COMPLETED';
    }
    task.completedAt = new Date().toISOString();
    task.evidenceIds = evidenceItems.map((e) => e.id);

    // Save evidence items to DB (Hard Gate: VERIFIED items only)
    for (const item of evidenceItems) {
      if (item.verificationStatus === 'VERIFIED') {
        await dbRepository.saveEvidenceItem(item);
      }
    }

    await logTraceEvent(
      invId,
      missionId,
      'TASK_COMPLETED',
      `Agent [${agentType}] completed successfully. Gathered ${evidenceItems.length} evidence items.`,
      agentType,
      task.id
    );
    
    // Detailed trace: agent completed
    if (traceId && runId) {
      await logTraceEventDetailed(
        traceId, runId, invId, missionId,
        'AGENT_COMPLETED',
        { 
          agentId: task.id, 
          agentName: agentType, 
          status: 'SUCCESS',
          durationMs: agentDurationMs,
          outputMetadata: { evidenceCount: evidenceItems.length, evidenceIds: evidenceItems.map(e => e.id) },
          agentExecution: {
            agentType,
            role: agentType,
            agentRole: agentType,
            startTime: task.startedAt,
            endTime: task.completedAt,
            status: 'SUCCESS' as AgentStatusTrace,
            retryCount: retries,
            toolsUsed: [],
            errors: [],
            outputMetadata: { evidenceCount: evidenceItems.length },
          }
        }
      );
    }
  } else {
    task.status = 'FAILED';
    task.completedAt = new Date().toISOString();
    await logTraceEvent(
      invId,
      missionId,
      'TASK_FAILED',
      `Agent [${agentType}] execution failed: ${errorMsg}. Continuing with reduced confidence.`,
      agentType,
      task.id
    );
    
    // Detailed trace: agent failed
    if (traceId && runId) {
      await logTraceEventDetailed(
        traceId, runId, invId, missionId,
        'AGENT_FAILED',
        { 
          agentId: task.id, 
          agentName: agentType, 
          status: 'FAILED',
          durationMs: agentDurationMs,
          error: { 
            type: 'MODEL_ERROR', 
            message: errorMsg, 
            component: agentType, 
            retryCount: retries,
            finalStatus: 'FAILED' as const
          },
          agentExecution: {
            agentType,
            role: agentType,
            agentRole: agentType,
            startTime: task.startedAt,
            endTime: task.completedAt,
            status: 'FAILED' as AgentStatusTrace,
            retryCount: retries,
            toolsUsed: [],
            errors: [errorMsg],
          }
        }
      );
    }
  }

  // Update confidence in state
  const currentConfidence = Math.max(30, state.confidence - (success ? -5 : 15));

  const updatedState = {
    plan: state.plan,
    evidence: evidenceItems,
    confidence: currentConfidence,
    toolFailures: !success ? [...state.toolFailures, { agent: agentType, error: errorMsg }] : state.toolFailures,
  };

  // Non-blocking checkpoint for agent nodes — keeps graph moving without waiting for DB write
  saveGraphCheckpointAsync(invId, updatedState);
  // Async flush trace events to MongoDB (non-blocking)
  if (traceId) {
    traceService.updateTraceMetrics(traceId);
    traceService.persistTrace(traceId).catch(() => {});
  }
  return updatedState;
}

// 3. Validator Node
async function validatorNode(state: InvestigationStateType): Promise<Partial<InvestigationStateType>> {
  const invId = state.investigationId;
  const missionId = `mission-${invId}`;
  
  await logTraceEvent(invId, missionId, 'CORRELATING', 'Validator checking evidence consistency, duplicates, and age.', 'ORCHESTRATOR');

  const inv = await dbRepository.getInvestigationById(invId);
  const metadata = inv?.metadata || {};
  const injectConflictingEvidence = metadata.injectConflictingEvidence === true;

  const currentEvidence = await dbRepository.getEvidenceByInvestigationId(invId);

  // 1. Duplicate Evidence Filtering (Requirement 11)
  const uniqueEvidenceMap = new Map<string, EvidenceModel>();
  currentEvidence.forEach((e) => {
    const key = `${e.title.toLowerCase().trim()}_${e.url || ''}_${e.summary.toLowerCase().trim()}`;
    if (!uniqueEvidenceMap.has(key)) {
      uniqueEvidenceMap.set(key, e);
    }
  });
  const filteredEvidence = Array.from(uniqueEvidenceMap.values());

  const contradictions: ContradictionModel[] = [];

  // Check for adversarial conflicting evidence
  if (injectConflictingEvidence) {
    contradictions.push({
      id: `contra-${Date.now()}`,
      investigationId: invId,
      claims: [
        `${inv?.primaryEntities[0] || 'Target'} is rapidly scaling foundry capacity.`,
        `${inv?.primaryEntities[0] || 'Target'} is cutting foundry capex by 25%.`
      ],
      evidenceIds: filteredEvidence.slice(0, 2).map(e => e.id),
      severity: 'HIGH',
      status: 'UNRESOLVED',
      createdAt: new Date().toISOString(),
    });

    await dbRepository.createContradiction(contradictions[0]);
    await logTraceEvent(
      invId,
      missionId,
      'CONTRADICTION_DETECTED',
      `Validator detected evidence conflict in market disclosures. Routing to Conflict Resolver.`,
      'ORCHESTRATOR'
    );
  }

  // 2. Outdated & Weak Evidence Detection (Requirement 11)
  const openQuestions = [...state.openQuestions];
  filteredEvidence.forEach((e) => {
    const pubYear = e.discoveredAt ? new Date(e.discoveredAt).getFullYear() : 2026;
    if (pubYear < 2024) {
      const q = `Discovered evidence "${e.title}" is outdated (pre-2024). Can we verify with recent publications?`;
      if (!openQuestions.includes(q)) {
        openQuestions.push(q);
      }
    }
  });

  if (filteredEvidence.length < 2) {
    const q = `Evidence base is weak. We only have ${filteredEvidence.length} items. What additional searches are required?`;
    if (!openQuestions.includes(q)) {
      openQuestions.push(q);
    }
  }

  // Hypothesis Verification
  const verifiedHypotheses: Record<string, any> = {};
  const primaryEntity = inv?.primaryEntities[0] || 'Target';
  const hypothesisKey = `${primaryEntity} inference hardware scaling represent competitive threat`;

  if (filteredEvidence.length > 2) {
    verifiedHypotheses[hypothesisKey] = injectConflictingEvidence ? 'PARTIALLY SUPPORTED' : 'SUPPORTED';
  } else {
    verifiedHypotheses[hypothesisKey] = 'INSUFFICIENT EVIDENCE';
  }

  const nextStatus = contradictions.length > 0 ? 'RESOLVING_CONFLICTS' : 'CRITIC';
  const updatedState = {
    conflictingEvidence: contradictions,
    verifiedHypotheses,
    openQuestions,
    executionStatus: nextStatus as any,
  };

  await saveGraphCheckpoint(invId, updatedState);
  return updatedState;
}

// 4. Conflict Resolution Node — Stage 5F Full Implementation
async function conflictResolverNode(state: InvestigationStateType): Promise<Partial<InvestigationStateType>> {
  const invId = state.investigationId;
  const missionId = `mission-${invId}`;

  await logTraceEvent(invId, missionId, 'CORRELATING',
    `Conflict Resolver starting. Contradictions: ${state.conflictingEvidence.length}. Total evidence: ${state.evidence.length}.`,
    'ORCHESTRATOR');

  const inv = await dbRepository.getInvestigationById(invId);
  const entities = inv?.primaryEntities || [inv?.title || 'Unknown'];

  // ── Phase 1: Extract normalized claims from all evidence items
  await logTraceEvent(invId, missionId, 'CORRELATING', 'Phase 1: Extracting normalized claims from evidence...', 'ORCHESTRATOR');
  const allEvidence = await dbRepository.getEvidenceByInvestigationId(invId);

  // Determine if Gemini is available (real key present)
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'fake-key');
  const extractedClaims = await defaultClaimExtractionEngine.extractClaims(
    invId,
    allEvidence,
    entities,
    hasGeminiKey   // Use LLM extraction when Gemini key available
  );

  await logTraceEvent(invId, missionId, 'CORRELATING',
    `Phase 1 complete: ${extractedClaims.length} claims extracted from ${allEvidence.length} evidence items.`,
    'ORCHESTRATOR');

  // ── Phase 2: Run contradiction detection engine
  await logTraceEvent(invId, missionId, 'CONTRADICTION_DETECTED', 'Phase 2: Running contradiction detection...', 'ORCHESTRATOR');

  const evidenceMap = new Map<string, EvidenceModel>(allEvidence.map((e) => [e.id, e]));
  const detectionResult = await defaultContradictionDetectionEngine.detectConflicts(
    inv!,
    extractedClaims,
    evidenceMap
  );

  const trueContradictions = detectionResult.contradictions;
  const apparentConflicts = detectionResult.apparentConflicts;
  const temporalProgressions = detectionResult.temporalProgressions;

  await logTraceEvent(invId, missionId, 'CONTRADICTION_DETECTED',
    `Phase 2 complete: ${trueContradictions.length} true contradictions, ${apparentConflicts.length} apparent conflicts, ${temporalProgressions.length} temporal progressions detected.`,
    'ORCHESTRATOR');

  // Log temporal progressions (not contradictions — but worth recording)
  for (const tp of temporalProgressions) {
    await logTraceEvent(invId, missionId, 'CORRELATING',
      `Temporal progression (not contradiction): ${tp.explanation}`, 'ORCHESTRATOR');
  }

  // ── Phase 3: Resolve each true contradiction
  const claimsMap = new Map<string, ClaimModel>(extractedClaims.map((c) => [c.id, c]));
  const preservedUncertainties: string[] = [];
  let confidenceDelta = 0;
  const resolvedContradictionModels: ContradictionModel[] = [];

  if (trueContradictions.length > 0) {
    await logTraceEvent(invId, missionId, 'CORRELATING',
      `Phase 3: Resolving ${trueContradictions.length} true contradictions...`, 'ORCHESTRATOR');

    const outcomes = await defaultConflictResolutionEngine.resolveContradictions(
      inv!,
      trueContradictions,
      claimsMap,
      evidenceMap
    );

    for (const outcome of outcomes) {
      confidenceDelta += outcome.confidenceDelta;

      const logMsg = outcome.resolved
        ? `RESOLVED [${outcome.strategy}]: ${outcome.resolution.substring(0, 120)}...`
        : `UNRESOLVED [${outcome.strategy}]: Uncertainty preserved — ${outcome.preservedUncertainty?.substring(0, 100)}...`;
      await logTraceEvent(invId, missionId, 'CORRELATING', logMsg, 'ORCHESTRATOR');

      if (!outcome.resolved && outcome.preservedUncertainty) {
        preservedUncertainties.push(outcome.preservedUncertainty);
      }

      // Reload the updated contradiction from DB
      const updated = (await dbRepository.getContradictionsByInvestigationId(invId))
        .find(c => c.id === outcome.contradictionId);
      if (updated) resolvedContradictionModels.push(updated);
    }
  }

  // ── Phase 4: Adjust overall confidence
  const newConfidence = Math.max(30, Math.min(98, state.confidence + confidenceDelta));

  // ── Phase 5: Determine uncertainty level for final brief
  const unresolvedCount = preservedUncertainties.length;
  const uncertaintyLevel = unresolvedCount === 0 ? 'Low'
    : unresolvedCount === 1 ? 'Medium'
    : 'High';

  await logTraceEvent(invId, missionId, 'CORRELATING',
    `Phase 3 complete. Confidence adjusted ${confidenceDelta > 0 ? '+' : ''}${confidenceDelta}. Uncertainty level: ${uncertaintyLevel}. Preserved uncertainties: ${unresolvedCount}.`,
    'ORCHESTRATOR');

  // ── Phase 6: If corroboration tasks are needed and budget allows, inject them
  const corroborationTasksNeeded = preservedUncertainties.length > 0 &&
    state.resourceBudget.iterationCount < state.resourceBudget.maxIterations - 1;

  let updatedPlan = [...state.plan];
  if (corroborationTasksNeeded) {
    const now = new Date().toISOString();
    const corrobTask: TaskModel = {
      id: `task-corroboration-${Date.now()}`,
      missionId,
      investigationId: invId,
      agentType: 'WEB',
      title: `CORROBORATION SEARCH: Resolve ${preservedUncertainties.length} unresolved conflict(s)`,
      description: `Targeted web search to corroborate one side of ${preservedUncertainties.length} unresolved evidence conflict(s). Topics: ${extractedClaims.slice(0, 2).map(c => c.topic).join(', ')}`,
      status: 'QUEUED',
      priority: 'HIGH',
      dependencies: [],
      input: { topic: inv?.objective, purpose: 'corroboration' },
      evidenceIds: [],
      createdAt: now,
      retryCount: 0,
      maxRetries: 1,
    };
    updatedPlan = [...state.plan, corrobTask];
    await logTraceEvent(invId, missionId, 'REPLANNING',
      `Injecting corroboration search task: ${corrobTask.title}`, 'ORCHESTRATOR');
  }

  const allContradictions = [
    ...resolvedContradictionModels,
    ...apparentConflicts,
    ...(state.conflictingEvidence.filter(c =>
      !resolvedContradictionModels.some(r => r.id === c.id) &&
      !apparentConflicts.some(a => a.id === c.id)
    )),
  ];

  const updatedState: Partial<InvestigationStateType> = {
    claims: extractedClaims,
    conflictingEvidence: allContradictions,
    preservedUncertainties,
    uncertainty: uncertaintyLevel,
    confidence: newConfidence,
    plan: updatedPlan,
    executionStatus: 'CRITIC' as any,
  };

  await saveGraphCheckpoint(invId, updatedState);
  return updatedState;
}

// 5. Critic / Self-Evaluation Node (Stage 5G Upgraded)
async function criticNode(state: InvestigationStateType): Promise<Partial<InvestigationStateType>> {
  const invId = state.investigationId;
  const missionId = `mission-${invId}`;
  
  await logTraceEvent(invId, missionId, 'SELF_EVALUATION_STARTED', 'Self-evaluator inspecting investigation claims, hypothesis support, and evidence coverage.', 'ORCHESTRATOR');

  const inv = await dbRepository.getInvestigationById(invId);
  if (!inv) throw new Error(`Investigation ${invId} not found`);

  const currentEvalIter = (state.evaluationIteration || 0) + 1;

  // 1. Derive and evaluate hypotheses
  await defaultHypothesisEngine.deriveHypotheses(inv, state.evidence, state.claims);
  const evaluatedHypotheses = await defaultHypothesisEngine.evaluateHypotheses(
    invId,
    state.evidence,
    state.claims,
    state.conflictingEvidence
  );

  const supportedHypsCount = evaluatedHypotheses.filter((h) => h.status === 'SUPPORTED').length;
  await logTraceEvent(
    invId,
    missionId,
    'HYPOTHESIS_FORMED',
    `Evaluated ${evaluatedHypotheses.length} hypothesis model(s): ${supportedHypsCount} supported, ${evaluatedHypotheses.length - supportedHypsCount} unverified/contradicted.`,
    'ORCHESTRATOR'
  );

  // 2. Perform comprehensive self-evaluation
  const selfEvalResult = await defaultSelfEvaluationEngine.evaluateInvestigation(
    invId,
    state.evidence,
    state.claims,
    state.conflictingEvidence,
    evaluatedHypotheses,
    currentEvalIter
  );

  await logTraceEvent(
    invId,
    missionId,
    'SELF_EVALUATION_COMPLETE',
    `Self-evaluation complete. Status: ${selfEvalResult.overallStatus} | Coverage: ${selfEvalResult.evidenceCoverage}% | Confidence: ${selfEvalResult.confidence}%. ${selfEvalResult.reasoning}`,
    'ORCHESTRATOR'
  );

  // 3. Autonomously correct conclusion if overclaiming or unverified assumptions exist
  const baseConclusion =
    inv.executiveSummary ||
    state.latestConclusion ||
    `Analysis of ${inv.title} indicates strategic progress in ${inv.technology || 'core technology'}.`;

  const correction = await defaultAutonomousCorrectionEngine.correctConclusion(
    invId,
    baseConclusion,
    selfEvalResult,
    evaluatedHypotheses
  );

  if (correction.changed) {
    await logTraceEvent(
      invId,
      missionId,
      'CONCLUSION_UPDATED',
      `Autonomously revised conclusion (Version ${(correction.version?.version || 2)}): "${correction.revised.slice(0, 100)}...". Reason: ${correction.reason}`,
      'SYNTHESIS'
    );
  }

  // 4. Generate verification requests
  const verificationRequests = await defaultHypothesisEngine.generateVerificationRequests(
    invId,
    evaluatedHypotheses,
    state.evidence,
    currentEvalIter,
    state.resourceBudget.maxIterations
  );

  // 5. Evaluate if replanning is warranted vs loop limits
  const maxEvalRounds = 3;
  const replanDecision = defaultAutonomousCorrectionEngine.shouldReplan(
    selfEvalResult,
    verificationRequests,
    currentEvalIter,
    maxEvalRounds
  );

  if (replanDecision.replan && verificationRequests.length > 0) {
    // Generate concrete tasks for the high-value verification requests
    const newVerificationTasks = defaultAutonomousCorrectionEngine.createVerificationTasks(
      invId,
      missionId,
      verificationRequests,
      state.plan.length
    );

    await logTraceEvent(
      invId,
      missionId,
      'CLAIM_GAP_DETECTED',
      `Self-evaluator identified ${verificationRequests.length} high-value evidence gap(s): ${verificationRequests.map((r) => r.description).join('; ')}`,
      'ORCHESTRATOR'
    );

    await logTraceEvent(
      invId,
      missionId,
      'VERIFICATION_REQUESTED',
      `Generated ${newVerificationTasks.length} verification task(s). Re-routing to Planner for iteration ${currentEvalIter + 1}.`,
      'ORCHESTRATOR'
    );

    await logTraceEvent(
      invId,
      missionId,
      'REPLANNING',
      `Autonomous replan triggered. Reason: ${replanDecision.reason}`,
      'ORCHESTRATOR'
    );

    const updatedState: Partial<InvestigationStateType> = {
      plan: [...state.plan, ...newVerificationTasks],
      evaluationIteration: currentEvalIter,
      hypothesisModels: evaluatedHypotheses,
      selfEvaluation: selfEvalResult,
      latestConclusion: correction.revised,
      confidence: selfEvalResult.confidence,
      executionStatus: 'PLANNING' as any,
    };

    // Save replanning indicators to metadata for UI
    await dbRepository.updateInvestigation(invId, {
      confidence: selfEvalResult.confidence,
      metadata: {
        ...(inv.metadata || {}),
        selfEvaluationStatus: selfEvalResult.overallStatus,
        evidenceCoverage: selfEvalResult.evidenceCoverage,
        replanningReason: replanDecision.reason,
        verificationTasksCount: newVerificationTasks.length,
      },
    });

    await saveGraphCheckpoint(invId, updatedState);
    return updatedState;
  }

  // Reason loop limit reached or evaluation passed -> proceed to final synthesis
  if (currentEvalIter >= maxEvalRounds && selfEvalResult.overallStatus !== 'PASS') {
    await logTraceEvent(
      invId,
      missionId,
      'REASONING_LIMIT_REACHED',
      `Maximum evaluation iterations (${maxEvalRounds}) reached. Proceeding to final synthesis with remaining uncertainty (${selfEvalResult.overallStatus}).`,
      'ORCHESTRATOR'
    );
  } else {
    await logTraceEvent(
      invId,
      missionId,
      'CRITIC',
      `Self-evaluation approved assessment. Status: ${selfEvalResult.overallStatus}. Proceeding to synthesis.`,
      'ORCHESTRATOR'
    );
  }

  const updatedState: Partial<InvestigationStateType> = {
    evaluationIteration: currentEvalIter,
    hypothesisModels: evaluatedHypotheses,
    selfEvaluation: selfEvalResult,
    latestConclusion: correction.revised,
    confidence: selfEvalResult.confidence,
    executionStatus: 'SYNTHESIZING' as any,
  };

  await dbRepository.updateInvestigation(invId, {
    confidence: selfEvalResult.confidence,
    metadata: {
      ...(inv.metadata || {}),
      selfEvaluationStatus: selfEvalResult.overallStatus,
      evidenceCoverage: selfEvalResult.evidenceCoverage,
      reasoningLimitReached: currentEvalIter >= maxEvalRounds,
    },
  });

  await saveGraphCheckpoint(invId, updatedState);
  return updatedState;
}

// 6. Synthesis Node
async function synthesisNode(state: InvestigationStateType): Promise<Partial<InvestigationStateType>> {
  const invId = state.investigationId;
  const missionId = `mission-${invId}`;
  
  await logTraceEvent(invId, missionId, 'SYNTHESIS_STARTED', 'Synthesizing final executive intelligence assessment.', 'SYNTHESIS');

  const inv = await dbRepository.getInvestigationById(invId);
  if (!inv) throw new Error("Investigation not found");

  const finalEvidence = await dbRepository.getEvidenceByInvestigationId(invId);
  const finalSignals = defaultSignalEngine.processInvestigationSignals(
    finalEvidence,
    [],
    [],
    inv
  );

  // Discover graph from evidence
  await defaultRelationshipDiscoveryEngine.discoverGraphFromEvidence(invId, finalEvidence, []);

  // Run AI Synthesis
  const intelligence = await defaultSynthesisEngine.synthesizeIntelligence(
    inv,
    finalSignals,
    finalEvidence,
    [],
    []
  );

  // Collect provider executions from all agent results in the state
  const allProviderExecutions: ProviderExecutionModel[] = [];
  for (const result of state.agentResults) {
    if (result.metadata?.providerExecution) {
      allProviderExecutions.push({
        provider: result.metadata.providerExecution.provider,
        category: result.metadata.providerExecution.category,
        request: result.metadata.providerExecution.request,
        startedAt: result.metadata.providerExecution.startedAt,
        completedAt: result.metadata.providerExecution.completedAt,
        status: result.metadata.providerExecution.status,
        resultCount: result.metadata.providerExecution.resultCount,
        error: result.metadata.providerExecution.error,
        latencyMs: result.metadata.providerExecution.latencyMs,
      });
    }
  }

  // Build brief with provider executions
  await defaultExecutiveBriefVersioner.createOrUpdateBrief(inv, finalEvidence, finalSignals, allProviderExecutions);

  await dbRepository.updateInvestigation(invId, {
    status: 'COMPLETED',
    progress: 100,
    confidence: state.confidence,
    evidenceCount: finalEvidence.length,
    signalsCount: finalSignals.length,
    intelligence,
    orchestratorStatus: '● COMPLETED',
    orchestratorAction: 'Mission complete. Unified intelligence assessment ready.',
    executiveSummary: intelligence.executiveSummary,
    providerExecutions: allProviderExecutions,
  });

  await logTraceEvent(invId, missionId, 'MISSION_COMPLETED', 'LangGraph pipeline execution completed successfully. Assessment saved.');

  const updatedState = {
    executionStatus: 'COMPLETED' as any,
  };

  await saveGraphCheckpoint(invId, updatedState);
  return updatedState;
}

// --------------------------------------------------------------------------
// STATE GRAPH ASSEMBLY & WORKFLOW COMPILATION
// --------------------------------------------------------------------------

// Conditional router function from Planner (Requirement 3 & 4)
function plannerRouter(state: InvestigationStateType) {
  if (state.executionStatus === 'SYNTHESIZING') {
    const decisionMsg = `ROUTER DECISION - Destination: synthesis. Reason: All objective requirements met. Compiling executive assessment.`;
    logTraceEvent(state.investigationId, `mission-${state.investigationId}`, 'ROUTER_DECISION', decisionMsg, 'ORCHESTRATOR');
    return 'synthesis';
  }

  // Determine active agent nodes based on queued tasks in the plan
  const targets: string[] = [];
  const queuedAgents = state.plan
    .filter((t) => t.status === 'QUEUED')
    .map((t) => t.agentType);

  if (queuedAgents.includes('RESEARCH')) targets.push('researchAgent');
  if (queuedAgents.includes('PATENT')) targets.push('patentAgent');
  if (queuedAgents.includes('NEWS')) targets.push('newsAgent');
  if (queuedAgents.includes('COMPETITOR')) targets.push('competitorAgent');
  if (queuedAgents.includes('WEB')) targets.push('webAgent');

  // Concurrency limit check (Requirement 7)
  const maxConcurrency = state.resourceBudget.maxConcurrentAgents || 5;
  const slicedTargets = targets.slice(0, maxConcurrency);

  const destination = slicedTargets.length > 0 ? slicedTargets : ['validator'];
  const decisionMsg = `ROUTER DECISION - Destination: ${JSON.stringify(destination)}. Reason: Executing active queued tasks (concurrency limit: ${maxConcurrency}) or moving to validator.`;
  logTraceEvent(state.investigationId, `mission-${state.investigationId}`, 'ROUTER_DECISION', decisionMsg, 'ORCHESTRATOR');

  if (slicedTargets.length === 0) {
    return 'validator'; // Default to join validator if no tasks queued
  }
  return slicedTargets; // Returns array of nodes to execute in PARALLEL
}

// Conditional router function from Validator (Requirement 3 & 11)
function validatorRouter(state: InvestigationStateType) {
  if (state.conflictingEvidence.some(c => c.status === 'UNRESOLVED')) {
    const decisionMsg = `ROUTER DECISION - Destination: conflictResolver. Reason: Unresolved evidence contradictions detected.`;
    logTraceEvent(state.investigationId, `mission-${state.investigationId}`, 'ROUTER_DECISION', decisionMsg, 'ORCHESTRATOR');
    return 'conflictResolver';
  }
  
  const decisionMsg = `ROUTER DECISION - Destination: critic. Reason: Consistency checks passed. routing to Self-Evaluation Critic.`;
  logTraceEvent(state.investigationId, `mission-${state.investigationId}`, 'ROUTER_DECISION', decisionMsg, 'ORCHESTRATOR');
  return 'critic';
}

// Conditional router function from Critic (Requirement 3 & 12)
function criticRouter(state: InvestigationStateType) {
  if (state.executionStatus === 'PLANNING') {
    const decisionMsg = `ROUTER DECISION - Destination: planner. Reason: Confidence below threshold or validation gaps detected. Replanning...`;
    logTraceEvent(state.investigationId, `mission-${state.investigationId}`, 'ROUTER_DECISION', decisionMsg, 'ORCHESTRATOR');
    return 'planner';
  }
  const decisionMsg = `ROUTER DECISION - Destination: synthesis. Reason: Critic checks passed. Initiating intelligence synthesis.`;
  logTraceEvent(state.investigationId, `mission-${state.investigationId}`, 'ROUTER_DECISION', decisionMsg, 'ORCHESTRATOR');
  return 'synthesis';
}

// Build and compile the workflow graph
const workflow = new StateGraph(InvestigationState)
  .addNode("planner", plannerNode)
  .addNode("researchAgent", (state) => runAgentNode('RESEARCH', state))
  .addNode("patentAgent", (state) => runAgentNode('PATENT', state))
  .addNode("newsAgent", (state) => runAgentNode('NEWS', state))
  .addNode("competitorAgent", (state) => runAgentNode('COMPETITOR', state))
  .addNode("webAgent", (state) => runAgentNode('WEB', state))
  .addNode("validator", validatorNode)
  .addNode("conflictResolver", conflictResolverNode)
  .addNode("critic", criticNode)
  .addNode("synthesis", synthesisNode);

// Add graph flow edges
workflow.addEdge(START, "planner");

// Add conditional routing from Planner (fan-out parallel execution or route to Synthesis)
workflow.addConditionalEdges("planner", plannerRouter, [
  "researchAgent",
  "patentAgent",
  "newsAgent",
  "competitorAgent",
  "webAgent",
  "validator",
  "synthesis"
]);

// Join nodes back to Validator (fan-in parallel execution)
workflow.addEdge("researchAgent", "validator");
workflow.addEdge("patentAgent", "validator");
workflow.addEdge("newsAgent", "validator");
workflow.addEdge("competitorAgent", "validator");
workflow.addEdge("webAgent", "validator");

// Add routing from Validator (conflictResolver vs critic)
workflow.addConditionalEdges("validator", validatorRouter, [
  "conflictResolver",
  "critic"
]);

// Route from Conflict Resolver to Critic
workflow.addEdge("conflictResolver", "critic");

// Add routing from Critic (loops back to planner or synthesis)
workflow.addConditionalEdges("critic", criticRouter, [
  "planner",
  "synthesis"
]);

// Synthesis points to final step
workflow.addEdge("synthesis", END);

// Compile the graph
export const langGraphOrchestrator = workflow.compile();

// Exposed clean backend operations (Requirement 21)
export const graphBackendOperations = {
  createPlan: async (state: InvestigationStateType) => {
    return plannerNode(state);
  },
  validatePlan: (plan: TaskModel[], objective: string) => {
    return validatePlan(plan, objective);
  },
  routeNextStep: (state: InvestigationStateType) => {
    return plannerRouter(state);
  },
  replan: async (state: InvestigationStateType, reason: string) => {
    const invId = state.investigationId;
    const inv = await dbRepository.getInvestigationById(invId);
    if (inv) {
      await dbRepository.updateInvestigation(invId, {
        metadata: {
          ...inv.metadata,
          replanningReason: reason,
        }
      });
    }
    return plannerNode(state);
  },
  createTask: (state: InvestigationStateType, taskData: Partial<TaskModel>): Partial<InvestigationStateType> => {
    const newTask: TaskModel = {
      id: taskData.id || `task-${Date.now()}`,
      missionId: `mission-${state.investigationId}`,
      investigationId: state.investigationId,
      agentType: taskData.agentType || 'RESEARCH',
      title: taskData.title || 'Dynamic Task',
      description: taskData.description || '',
      status: 'PENDING',
      priority: taskData.priority || 'MEDIUM',
      dependencies: taskData.dependencies || [],
      input: taskData.input || {},
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
    };
    return {
      plan: [...state.plan, newTask],
    };
  },
  completeTask: (state: InvestigationStateType, taskId: string, evidenceIds: string[]): Partial<InvestigationStateType> => {
    const updatedPlan = state.plan.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'COMPLETED' as const, completedAt: new Date().toISOString(), evidenceIds };
      }
      return t;
    });
    return { plan: updatedPlan };
  },
  failTask: (state: InvestigationStateType, taskId: string, error: string): Partial<InvestigationStateType> => {
    const updatedPlan = state.plan.map(t => {
      if (t.id === taskId) {
        return { ...t, status: 'FAILED' as const, completedAt: new Date().toISOString() };
      }
      return t;
    });
    return {
      plan: updatedPlan,
      errors: [...state.errors, `Task ${taskId} failed: ${error}`],
    };
  },
  getPendingTasks: (state: InvestigationStateType): TaskModel[] => {
    return state.plan.filter(t => t.status === 'PENDING' || t.status === 'QUEUED');
  },
  getOpenQuestions: (state: InvestigationStateType): string[] => {
    return state.openQuestions || [];
  },
  getPlanningTrace: async (investigationId: string): Promise<MissionEventModel[]> => {
    const missionId = `mission-${investigationId}`;
    try {
      const db = await dbRepository.getInvestigations().then(() => dbRepository.saveEvidenceItem as any).then(() => require("@/lib/mongodb").getDb());
      return await db.collection("mission_events").find({ missionId }).toArray();
    } catch {
      return [];
    }
  }
};
