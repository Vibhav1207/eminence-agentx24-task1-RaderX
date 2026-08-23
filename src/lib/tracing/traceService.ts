import {
  TraceEventModel,
  TraceModel,
  TraceEventType,
  TraceDiagnosisModel,
  TraceComparisonModel,
  AgentStatusTrace,
  FailureInjectionConfig,
  AgentType,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { traceDiagnosisEngine } from './diagnosisEngine';

/**
 * Trace Service - Centralized tracing for RadarX LangGraph orchestration
 * Provides end-to-end observability for investigation executions
 */

// In-memory trace store for real-time access
class TraceStore {
  traces: Map<string, TraceModel> = new Map();
  traceEvents: Map<string, TraceEventModel[]> = new Map(); // traceId -> events[]
  diagnoses: Map<string, TraceDiagnosisModel> = new Map();
  comparisons: Map<string, TraceComparisonModel> = new Map();
  activeFailureInjection: FailureInjectionConfig | null = null;

  // Trace lifecycle
  createTrace(runId: string, investigationId: string): TraceModel {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const trace: TraceModel = {
      traceId,
      runId,
      investigationId,
      startedAt: new Date().toISOString(),
      status: 'RUNNING',
      agentRuns: [],
      totalToolCalls: 0,
      totalErrors: 0,
      totalRetries: 0,
    };
    this.traces.set(traceId, trace);
    this.traceEvents.set(traceId, []);
    return trace;
  }

  getTrace(traceId: string): TraceModel | undefined {
    return this.traces.get(traceId);
  }

  getTraceByRunId(runId: string): TraceModel | undefined {
    for (const trace of this.traces.values()) {
      if (trace.runId === runId) return trace;
    }
    return undefined;
  }

  updateTrace(traceId: string, updates: Partial<TraceModel>): TraceModel | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;
    const updated = { ...trace, ...updates };
    this.traces.set(traceId, updated);
    return updated;
  }

  completeTrace(traceId: string, status: 'COMPLETED' | 'FAILED' | 'PARTIAL'): TraceModel | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;
    const completedAt = new Date().toISOString();
    const totalDurationMs = new Date(completedAt).getTime() - new Date(trace.startedAt).getTime();

    // Calculate latency percentages
    const breakdown = trace.latencyBreakdown;
    let latencyPercentages: TraceModel['latencyPercentages'] = undefined;
    if (breakdown && totalDurationMs > 0) {
      latencyPercentages = {
        planning: Math.round((breakdown.planningMs / totalDurationMs) * 10000) / 100,
        agent: Math.round((breakdown.agentMs / totalDurationMs) * 10000) / 100,
        tool: Math.round((breakdown.toolMs / totalDurationMs) * 10000) / 100,
        verification: Math.round((breakdown.verificationMs / totalDurationMs) * 10000) / 100,
        synthesis: Math.round((breakdown.synthesisMs / totalDurationMs) * 10000) / 100,
        retry: Math.round((breakdown.retryMs / totalDurationMs) * 10000) / 100,
        recovery: Math.round((breakdown.recoveryMs / totalDurationMs) * 10000) / 100,
      };
    }

    const updated: TraceModel = {
      ...trace,
      status,
      completedAt,
      totalDurationMs,
      latencyPercentages,
    };
    this.traces.set(traceId, updated);
    return updated;
  }

  // Trace events
  addEvent(event: TraceEventModel): TraceEventModel {
    const events = this.traceEvents.get(event.traceId) || [];
    events.unshift(event);
    this.traceEvents.set(event.traceId, events);
    return event;
  }

  getEvents(traceId: string): TraceEventModel[] {
    return this.traceEvents.get(traceId) || [];
  }

  // Metrics aggregation
  updateTraceMetrics(traceId: string): void {
    const trace = this.traces.get(traceId);
    const events = this.traceEvents.get(traceId);
    if (!trace || !events) return;

    const completedEvents = events.filter(e => e.status !== 'PENDING' && e.status !== 'RUNNING');
    const toolEvents = events.filter(e => e.eventType.startsWith('TOOL_CALL'));
    const errorEvents = events.filter(e => e.status === 'FAILED');
    const retryEvents = events.filter(e => e.eventType === 'AGENT_RETRYING' || e.eventType === 'TOOL_CALL_FAILED');

    // Calculate latency breakdown by event type
    let planningMs = 0, agentMs = 0, toolMs = 0, verificationMs = 0, synthesisMs = 0, retryMs = 0, recoveryMs = 0;

    for (const event of events) {
      const duration = event.durationMs || 0;
      if (event.eventType.includes('PLANNER') || event.eventType.includes('REPLANNING')) planningMs += duration;
      else if (event.eventType.includes('AGENT')) agentMs += duration;
      else if (event.eventType.includes('TOOL_CALL')) toolMs += duration;
      else if (event.eventType.includes('VALIDATOR') || event.eventType.includes('CONTRADICTION') || event.eventType.includes('CONFLICT') || event.eventType.includes('CRITIC') || event.eventType.includes('SELF_EVALUATION')) verificationMs += duration;
      else if (event.eventType.includes('SYNTHESIS')) synthesisMs += duration;
      else if (event.eventType.includes('RETRY')) retryMs += duration;
      else if (event.eventType.includes('FALLBACK') || event.eventType.includes('RECOVER')) recoveryMs += duration;
    }

    // Token usage aggregation
    let totalInputTokens = 0, totalOutputTokens = 0, totalTokens = 0;
    for (const event of events) {
      if (event.tokenUsage?.available) {
        totalInputTokens += event.tokenUsage.inputTokens || 0;
        totalOutputTokens += event.tokenUsage.outputTokens || 0;
        totalTokens += event.tokenUsage.totalTokens || 0;
      }
    }

    trace.totalToolCalls = toolEvents.length;
    trace.totalErrors = errorEvents.length;
    trace.totalRetries = retryEvents.length;
    trace.latencyBreakdown = {
      planningMs,
      agentMs,
      toolMs,
      verificationMs,
      synthesisMs,
      retryMs,
      recoveryMs,
    };
    trace.totalTokens = {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalTokens,
    };
  }

  // Diagnoses
  addDiagnosis(diagnosis: TraceDiagnosisModel): TraceDiagnosisModel {
    this.diagnoses.set(diagnosis.diagnosisId, diagnosis);
    return diagnosis;
  }

  getDiagnosis(traceId: string): TraceDiagnosisModel | undefined {
    for (const d of this.diagnoses.values()) {
      if (d.traceId === traceId) return d;
    }
    return undefined;
  }

  getDiagnosisByTraceId(traceId: string): TraceDiagnosisModel | undefined {
    for (const d of this.diagnoses.values()) {
      if (d.traceId === traceId) return d;
    }
    return undefined;
  }

  // Comparisons
  addComparison(comparison: TraceComparisonModel): TraceComparisonModel {
    this.comparisons.set(comparison.comparisonId, comparison);
    return comparison;
  }

  getComparisons(runId: string): TraceComparisonModel[] {
    return Array.from(this.comparisons.values()).filter(c => c.runId === runId);
  }

  getAllComparisons(): TraceComparisonModel[] {
    return Array.from(this.comparisons.values());
  }

  getComparison(comparisonId: string): TraceComparisonModel | undefined {
    return this.comparisons.get(comparisonId);
  }

  // Failure Injection
  setFailureInjection(config: FailureInjectionConfig): void {
    this.activeFailureInjection = config;
  }

  getFailureInjection(): FailureInjectionConfig | null {
    return this.activeFailureInjection;
  }

  clearFailureInjection(): void {
    this.activeFailureInjection = null;
  }

  // Check if failure should be injected for a specific agent/tool
  shouldInjectFailure(agentType?: AgentType, toolName?: string): FailureInjectionConfig | null {
    const config = this.activeFailureInjection;
    if (!config || !config.enabled) return null;
    if (config.targetAgent && config.targetAgent !== agentType) return null;
    if (config.targetTool && config.targetTool !== toolName) return null;
    return config;
  }

  // Persistence - delegates to dbRepository
  async persistTrace(traceId: string): Promise<void> {
    const trace = this.traces.get(traceId);
    const events = this.traceEvents.get(traceId);
    if (!trace) return;

    // Non-blocking persistence - fire and forget
    this.persistTraceAsync(traceId, trace, events);
  }

  /**
   * Non-blocking async persistence - runs in background without blocking the investigation
   */
  private async persistTraceAsync(traceId: string, trace: TraceModel, events: TraceEventModel[] | undefined): Promise<void> {
    try {
      await dbRepository.saveTrace(trace);
      
      if (events && events.length > 0) {
        await dbRepository.saveTraceEvents(traceId, events);
      }
    } catch (error) {
      console.error(`[TraceService] Failed to persist trace ${traceId}:`, error);
      // Don't throw - persistence failure should not block investigation
    }
  }

  /**
   * Synchronous persistence for critical moments (e.g., investigation completion)
   */
  async persistTraceSync(traceId: string): Promise<void> {
    const trace = this.traces.get(traceId);
    const events = this.traceEvents.get(traceId);
    if (!trace) return;

    try {
      await dbRepository.saveTrace(trace);
      
      if (events && events.length > 0) {
        await dbRepository.saveTraceEvents(traceId, events);
      }
    } catch (error) {
      console.error(`[TraceService] Failed to persist trace ${traceId}:`, error);
      throw error;
    }
  }

  async loadTrace(traceId: string): Promise<TraceModel | undefined> {
    const trace = await dbRepository.getTraceById(traceId);
    if (trace) {
      this.traces.set(traceId, trace);
      const events = await dbRepository.getTraceEvents(traceId);
      this.traceEvents.set(traceId, events);
      return trace;
    }
    return undefined;
  }

  async persistDiagnosis(diagnosis: TraceDiagnosisModel): Promise<void> {
    await dbRepository.saveTraceDiagnosis(diagnosis);
  }

  async persistComparison(comparison: TraceComparisonModel): Promise<void> {
    await dbRepository.saveTraceComparison(comparison);
  }

  // Get all traces for an investigation
  async getTracesByInvestigation(investigationId: string): Promise<TraceModel[]> {
    return dbRepository.getTracesByInvestigationId(investigationId);
  }
}

export const traceService = new TraceStore();

/**
 * Helper to create a trace event with consistent structure
 */
export function createTraceEvent(params: {
  traceId: string;
  runId: string;
  investigationId: string;
  eventType: TraceEventType;
  agentId?: string;
  agentName?: string;
  status: TraceEventModel['status'];
  durationMs?: number;
  inputMetadata?: Record<string, unknown>;
  outputMetadata?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: TraceEventModel['error'];
  parentEventId?: string;
  tokenUsage?: TraceEventModel['tokenUsage'];
  toolCall?: TraceEventModel['toolCall'];
  decision?: TraceEventModel['decision'];
  agentExecution?: TraceEventModel['agentExecution'];
}): TraceEventModel {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...params,
  };
}

/**
 * Sanitize sensitive data from trace metadata
 */
export function sanitizeTraceData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  const sensitiveKeys = ['apiKey', 'api_key', 'token', 'password', 'secret', 'authorization', 'auth', 'credential'];

  function sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(s => lowerKey.includes(s))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitize(value);
      }
    }
    return result;
  }

  return sanitize(sanitized);
}

/**
 * Get all traces from memory and DB
 */
export async function getAllTraces(): Promise<TraceModel[]> {
  const traces: TraceModel[] = [];
  for (const trace of traceService.traces.values()) {
    traces.push(trace);
  }
  const dbTraces = await dbRepository.getAllTraces();
  for (const trace of dbTraces) {
    if (!traces.some(t => t.traceId === trace.traceId)) {
      traces.push(trace);
    }
  }
  return traces.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

/**
 * Get all comparisons
 */
export function getAllComparisons(): TraceComparisonModel[] {
  return traceService.getAllComparisons();
}

/**
 * Get diagnosis by trace ID
 */
export function getDiagnosisByTraceId(traceId: string): TraceDiagnosisModel | undefined {
  return traceService.getDiagnosisByTraceId(traceId);
}

/**
 * Get comparison by ID
 */
export function getComparison(comparisonId: string): TraceComparisonModel | undefined {
  return traceService.getComparison(comparisonId);
}

/**
 * Persist trace events to DB
 */
export async function persistTraceEvents(traceId: string): Promise<void> {
  await traceService.persistTrace(traceId);
}

/**
 * Automatically diagnose a trace using the Trace Diagnosis Engine.
 * Loads the trace from DB if not found in memory (e.g. after a serverless restart).
 */
export async function diagnoseTrace(traceId: string): Promise<TraceDiagnosisModel | null> {
  // Try in-memory first (live trace)
  let trace = traceService.getTrace(traceId);
  if (!trace) {
    // Load from DB for completed/persisted traces
    trace = await dbRepository.getTraceById(traceId);
    if (trace) {
      // Cache it in memory for the diagnosis engine to use
      traceService.updateTrace(trace.traceId, trace);
      const events = await dbRepository.getTraceEvents(traceId);
      events.forEach(e => traceService.addEvent(e));
    }
  }
  if (!trace) return null;

  // Use the new diagnosis engine for comprehensive analysis
  return traceDiagnosisEngine.analyzeTrace(traceId);
}

/**
 * Create before/after comparison
 */
export function createComparison(
  baselineTraceId: string,
  optimizedTraceId: string,
  runId: string,
  investigationId: string,
  optimizationApplied: string
): TraceComparisonModel | null {
  const baseline = traceService.getTrace(baselineTraceId);
  const optimized = traceService.getTrace(optimizedTraceId);
  
  if (!baseline || !optimized) return null;

  const before = {
    latencyMs: baseline.totalDurationMs || 0,
    toolCalls: baseline.totalToolCalls,
    errors: baseline.totalErrors,
    retries: baseline.totalRetries,
    successRate: baseline.status === 'COMPLETED' ? 100 : baseline.status === 'PARTIAL' ? 50 : 0,
    tokens: baseline.totalTokens?.total || 0,
  };

  const after = {
    latencyMs: optimized.totalDurationMs || 0,
    toolCalls: optimized.totalToolCalls,
    errors: optimized.totalErrors,
    retries: optimized.totalRetries,
    successRate: optimized.status === 'COMPLETED' ? 100 : optimized.status === 'PARTIAL' ? 50 : 0,
    tokens: optimized.totalTokens?.total || 0,
  };

  const improvement = {
    latencyPct: before.latencyMs > 0 ? Math.round(((before.latencyMs - after.latencyMs) / before.latencyMs) * 10000) / 100 : 0,
    toolCallsPct: before.toolCalls > 0 ? Math.round(((before.toolCalls - after.toolCalls) / before.toolCalls) * 10000) / 100 : 0,
    errorsPct: before.errors > 0 ? Math.round(((before.errors - after.errors) / before.errors) * 10000) / 100 : 0,
    retriesPct: before.retries > 0 ? Math.round(((before.retries - after.retries) / before.retries) * 10000) / 100 : 0,
    successRatePct: Math.round((after.successRate - before.successRate) * 100) / 100,
  };

  const comparison: TraceComparisonModel = {
    comparisonId: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    baselineTraceId,
    optimizedTraceId,
    runId,
    investigationId,
    createdAt: new Date().toISOString(),
    before,
    after,
    improvement,
    optimizationApplied,
  };

  traceService.addComparison(comparison);
  return comparison;
}