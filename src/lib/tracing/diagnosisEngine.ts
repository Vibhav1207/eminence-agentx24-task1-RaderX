import {
  TraceEventModel,
  TraceModel,
  TraceDiagnosisModel,
  TraceEventType,
  TraceComparisonModel,
  AgentStatusTrace,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';
import { traceService } from '@/lib/tracing/traceService';

/**
 * Automatic Trace Diagnosis Engine (Task 7)
 * Analyzes traces to identify root causes, impacts, and recovery actions
 */

export class TraceDiagnosisEngine {
 
  /**
   * Analyze a completed or failed trace and generate diagnosis
   */
  async analyzeTrace(traceId: string): Promise<TraceDiagnosisModel> {
    // First check in-memory trace service (for cases where MongoDB is not available)
    const trace = traceService.getTrace(traceId) || await dbRepository.getTraceById(traceId);
    const events = traceService.getEvents(traceId) || await dbRepository.getTraceEventsByTraceId(traceId);
    
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    const failedEvents = events.filter(e => e.status === 'FAILED');
    const errorEvents = events.filter(e => e.error);
    const slowEvents = events.filter(e => e.durationMs && e.durationMs > 5000);
    const retryEvents = events.filter(e => 
      e.toolCall?.retryCount && e.toolCall.retryCount > 0
    );
    const recoveredEvents = events.filter(e => 
      e.error?.recoveryAction && e.error.finalStatus === 'RECOVERED'
    );

    // Determine if trace has failures
    const hasFailures = failedEvents.length > 0 || errorEvents.length > 0;
    const hasDegradedPerformance = slowEvents.length > 0 || retryEvents.length > 0;

    let rootCause: TraceDiagnosisModel['rootCause'] | undefined;
    let affectedComponent: string | undefined;
    let impact: TraceDiagnosisModel['impact'];
    let recoveryAction: string | undefined;
    let finalResult: TraceDiagnosisModel['finalResult'];

    if (hasFailures) {
      // Find the first failure in the chain
      const firstFailure = errorEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )[0];

      if (firstFailure) {
        // Follow parent/child chain to find root cause
        const rootCauseEvent = this.findRootCause(firstFailure, events);
        
        rootCause = this.classifyRootCause(rootCauseEvent);
        affectedComponent = rootCauseEvent.agentName || rootCauseEvent.toolCall?.toolName || 'UNKNOWN';
        impact = this.calculateImpact(rootCauseEvent, events);
        recoveryAction = rootCauseEvent.error?.recoveryAction || 'No recovery action recorded';
        finalResult = trace.status === 'COMPLETED' ? 'RECOVERED' : 'FAILED';
      } else {
        rootCause = {
          component: 'UNKNOWN',
          type: 'UNKNOWN',
          description: 'Error detected but no failure event found',
          traceEvidence: [],
        };
        affectedComponent = 'UNKNOWN';
        impact = { latencyIncreaseMs: 0, retries: 0, extraRetries: 0, failedToolCalls: 0, extraToolCalls: 0, errors: [] };
        recoveryAction = 'No recovery action recorded';
        finalResult = 'FAILED';
      }
    } else if (hasDegradedPerformance) {
      // Performance degradation diagnosis
      const slowestEvent = slowEvents.sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))[0];
      const mostRetriedEvent = retryEvents.sort((a, b) => 
        (b.toolCall?.retryCount || 0) - (a.toolCall?.retryCount || 0)
      )[0];

      rootCause = {
        component: slowestEvent.agentName || slowestEvent.toolCall?.toolName || 'UNKNOWN',
        type: 'LATENCY',
        description: slowestEvent.durationMs 
          ? `High latency detected: ${slowestEvent.durationMs}ms` 
          : 'Multiple retries detected',
        traceEvidence: [
          `Event ${slowestEvent.eventId} took ${slowestEvent.durationMs}ms`,
          mostRetriedEvent ? `${mostRetriedEvent.toolCall?.retryCount} retries on ${mostRetriedEvent.toolCall?.toolName}` : '',
        ].filter(Boolean),
      };

      affectedComponent = slowestEvent.agentName || slowestEvent.toolCall?.toolName || 'UNKNOWN';
      impact = {
        latencyIncreaseMs: slowestEvent.durationMs || 0,
        retries: retryEvents.length,
        extraRetries: retryEvents.reduce((sum, e) => sum + (e.toolCall?.retryCount || 0), 0),
        failedToolCalls: retryEvents.length,
        extraToolCalls: retryEvents.length,
        errors: [],
      };
      recoveryAction = 'Consider timeout tuning, parallelization, or fallback providers';
      finalResult = 'DEGRADED';
    } else {
      // Success case
      rootCause = {
        component: 'NONE',
        type: 'NONE',
        description: 'No failures or significant degradation detected',
        traceEvidence: ['All events completed successfully'],
      };
      affectedComponent = 'NONE';
      impact = { latencyIncreaseMs: 0, retries: 0, extraRetries: 0, failedToolCalls: 0, extraToolCalls: 0, errors: [] };
      recoveryAction = 'No recovery needed';
      finalResult = 'SUCCESS';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(rootCause, events, trace);

    return {
      diagnosisId: `diag-${traceId}-${Date.now()}`,
      traceId,
      investigationId: trace.investigationId,
      runId: trace.runId,
      createdAt: new Date().toISOString(),
      rootCause,
      affectedComponent: affectedComponent || 'UNKNOWN',
      impact: impact || { latencyIncreaseMs: 0, retries: 0, extraRetries: 0, failedToolCalls: 0, extraToolCalls: 0, errors: [] },
      evidenceFromTrace: [],
      recoveryAction: recoveryAction || 'N/A',
      finalResult: finalResult || 'UNKNOWN',
      recommendations,
    };
  }

  /**
   * Follow parent/child chain to find the true root cause
   */
  private findRootCause(startEvent: TraceEventModel, allEvents: TraceEventModel[]): TraceEventModel {
    let current = startEvent;
    const visited = new Set<string>();
    
    while (current.parentEventId && !visited.has(current.parentEventId)) {
      visited.add(current.parentEventId);
      const parent = allEvents.find(e => e.eventId === current.parentEventId);
      if (!parent) break;
      if (parent.error) {
        current = parent;
      } else {
        break;
      }
    }
    
    return current;
  }

  /**
   * Classify the root cause based on error type and context
   */
  private classifyRootCause(event: TraceEventModel): TraceDiagnosisModel['rootCause'] {
    if (!event.error) {
      return {
        component: event.agentName || event.toolCall?.toolName || 'UNKNOWN',
        type: 'UNKNOWN',
        description: 'Error detected but type unclear',
        traceEvidence: [`Event ${event.eventId}: Unknown error`],
      };
    }

    const errorType = event.error.type;
    const component = event.agentName || event.toolCall?.toolName || 'UNKNOWN';
    
    type RootCauseType = 'TOOL_TIMEOUT' | 'TOOL_HTTP_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'MODEL_ERROR' | 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'GRAPH_ERROR' | 'UNKNOWN';
    const typeMap: Record<string, RootCauseType> = {
      'TOOL_TIMEOUT': 'TOOL_TIMEOUT',
      'TOOL_HTTP_ERROR': 'TOOL_HTTP_ERROR',
      'AUTH_ERROR': 'AUTH_ERROR',
      'RATE_LIMIT': 'RATE_LIMIT',
      'MODEL_ERROR': 'MODEL_ERROR',
      'VALIDATION_ERROR': 'VALIDATION_ERROR',
      'DATABASE_ERROR': 'DATABASE_ERROR',
      'GRAPH_ERROR': 'GRAPH_ERROR',
      'UNKNOWN': 'UNKNOWN',
    };

    return {
      component,
      type: typeMap[errorType] || 'UNKNOWN',
      description: `${errorType}: ${event.error.message}`,
      traceEvidence: [
        `Event ${event.eventId}: ${event.error.message}`,
        `Component: ${component}`,
        `Retry count: ${event.error.retryCount}`,
        `Recovery action: ${event.error.recoveryAction || 'None'}`,
      ],
    };
  }

  /**
   * Calculate impact of the failure on the overall trace
   */
  private calculateImpact(rootEvent: TraceEventModel, allEvents: TraceEventModel[]): TraceDiagnosisModel['impact'] {
    const rootTime = new Date(rootEvent.timestamp).getTime();
    
    // Find all descendant events (events that happened after root cause)
    const descendants = allEvents.filter(e => 
      new Date(e.timestamp).getTime() > rootTime &&
      e.eventId !== rootEvent.eventId
    );

    // Count retries caused by this failure
    const relatedRetries = descendants.filter(e => 
      e.toolCall?.retryCount && e.toolCall.retryCount > 0
    );

    // Calculate latency increase
    const expectedDuration = 2000; // baseline expectation per agent
    const actualDuration = rootEvent.durationMs || 0;
    const latencyIncrease = Math.max(0, actualDuration - expectedDuration);

    return {
      latencyIncreaseMs: latencyIncrease,
      retries: relatedRetries.length,
      extraRetries: relatedRetries.reduce((sum, e) => sum + (e.toolCall?.retryCount || 0), 0),
      failedToolCalls: relatedRetries.length,
      extraToolCalls: relatedRetries.length,
      errors: descendants.filter(e => e.error).map(e => e.error?.message || 'Unknown error'),
    };
  }

  /**
   * Generate actionable recommendations based on diagnosis
   */
  private generateRecommendations(
    rootCause: TraceDiagnosisModel['rootCause'] | undefined,
    events: TraceEventModel[],
    trace: TraceModel
  ): string[] {
    const recommendations: string[] = [];

    if (!rootCause) {
      return ['System performing within normal parameters'];
    }

    // Handle both string and object forms of rootCause
    const rootCauseType = typeof rootCause === 'object' && rootCause !== null ? rootCause.type : rootCause;
    
    if (rootCauseType === 'NONE') {
          return ['System performing within normal parameters'];
        }

        switch (rootCauseType) {
      case 'TOOL_TIMEOUT':
        recommendations.push('Increase tool timeout threshold');
        recommendations.push('Enable parallel execution for independent tool calls');
        recommendations.push('Add fallback provider for this tool category');
        break;
      case 'TOOL_HTTP_ERROR':
        recommendations.push('Implement circuit breaker pattern for failing provider');
        recommendations.push('Add automatic fallback routing on HTTP 5xx errors');
        break;
      case 'RATE_LIMIT':
        recommendations.push('Implement exponential backoff with jitter');
        recommendations.push('Add request queuing to respect rate limits');
        break;
      case 'MODEL_ERROR':
        recommendations.push('Add model fallback (e.g., gpt-4o → gpt-4o-mini)');
        recommendations.push('Implement request retry with different parameters');
        break;
      case 'VALIDATION_ERROR':
        recommendations.push('Add request validation before tool invocation');
        recommendations.push('Improve prompt engineering to reduce malformed responses');
        break;
      case 'AGENT_EXECUTION_FAILURE':
        recommendations.push('Add agent-level retry with state reset');
        recommendations.push('Implement checkpoint-based recovery');
        break;
      default:
        recommendations.push('Review error logs for pattern identification');
    }

    // Check for duplicate tool calls
    const toolCalls = events.filter(e => e.toolCall);
    const toolCounts: Record<string, number> = {};
    toolCalls.forEach(e => {
      const tool = e.toolCall?.toolName || 'unknown';
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    });
    Object.entries(toolCounts).forEach(([tool, count]) => {
      if (count > 3) {
        recommendations.push(`Duplicate ${tool} calls detected (${count}x) - consider caching or deduplication`);
      }
    });

    // Check for slow tools
    const slowTools = toolCalls.filter(e => e.durationMs && e.durationMs > 5000);
    if (slowTools.length > 0) {
      const avgLatency = slowTools.reduce((sum, e) => sum + (e.durationMs || 0), 0) / slowTools.length;
      recommendations.push(`Tool latency high (avg ${Math.round(avgLatency)}ms) - consider timeout tuning or async execution`);
    }

    return recommendations;
  }

  /**
   * Detect repeated failure patterns across multiple traces
   */
  async detectPatterns(investigationId?: string): Promise<TraceDiagnosisModel[]> {
    const traces = investigationId 
      ? await dbRepository.getTracesByInvestigationId(investigationId)
      : await dbRepository.getRecentTraces(50);
    
    const diagnoses: TraceDiagnosisModel[] = [];
    
    for (const trace of traces) {
      if (trace.status === 'FAILED' || trace.status === 'PARTIAL') {
        try {
          const diagnosis = await this.analyzeTrace(trace.traceId);
          diagnoses.push(diagnosis);
        } catch (err) {
          console.error(`Failed to diagnose trace ${trace.traceId}:`, err);
        }
      }
    }

    return diagnoses;
  }

  /**
   * Generate optimization recommendations from pattern analysis
   */
  async generateOptimizations(diagnoses: TraceDiagnosisModel[]): Promise<string[]> {
    const recommendations = new Set<string>();
    const typeCounts: Record<string, number> = {};
    const componentCounts: Record<string, number> = {};

    diagnoses.forEach(d => {
      const rootCauseType = typeof d.rootCause === 'object' && d.rootCause !== null ? d.rootCause.type : d.rootCause;
      if (rootCauseType) {
        typeCounts[rootCauseType] = (typeCounts[rootCauseType] || 0) + 1;
      }
      if (d.affectedComponent) {
        componentCounts[d.affectedComponent] = (componentCounts[d.affectedComponent] || 0) + 1;
      }
      d.recommendations.forEach(r => recommendations.add(r));
    });

    const patternRecommendations: string[] = [];

    // High frequency failure types
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count >= 3) {
        switch (type) {
          case 'TOOL_TIMEOUT':
            patternRecommendations.push(`TOOL_TIMEOUT occurred ${count}x - increase timeout or add async fallback`);
            break;
          case 'RATE_LIMIT':
            patternRecommendations.push(`RATE_LIMIT occurred ${count}x - implement request queuing/backoff`);
            break;
          case 'TOOL_HTTP_ERROR':
            patternRecommendations.push(`TOOL_HTTP_ERROR occurred ${count}x - add circuit breaker + fallback`);
            break;
        }
      }
    });

    // High frequency failing components
    Object.entries(componentCounts).forEach(([component, count]) => {
      if (count >= 3) {
        patternRecommendations.push(`${component} failed ${count}x - investigate provider reliability`);
      }
    });

    return [...recommendations, ...patternRecommendations];
  }

  /**
   * Detect performance bottlenecks in a trace
   * Returns the top contributors to latency with recommendations
   */
  async detectBottlenecks(traceId: string): Promise<{
    bottlenecks: Array<{
      component: string;
      type: 'agent' | 'tool' | 'llm' | 'database';
      latencyMs: number;
      percentage: number;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      recommendation: string;
      evidence: string[];
    }>;
    totalLatency: number;
    summary: string;
  }> {
    // First check in-memory trace service
    const trace = traceService.getTrace(traceId) || await dbRepository.getTraceById(traceId);
    const events = traceService.getEvents(traceId) || await dbRepository.getTraceEventsByTraceId(traceId);
    
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    const totalLatency = trace.totalDurationMs || 0;
    
    // Analyze agent execution events
    const agentEvents = events.filter(e => e.agentExecution);
    const toolEvents = events.filter(e => e.toolCall);
    const llmEvents = events.filter(e => e.tokenUsage && e.tokenUsage.available);

    const componentLatencies: Record<string, { 
      latency: number; 
      count: number; 
      type: 'agent' | 'tool' | 'llm' | 'database';
      evidence: string[];
    }> = {};

    // Process agent events
    agentEvents.forEach(e => {
      const agentName = e.agentName || e.agentExecution?.agentType || 'UNKNOWN';
      const latency = e.agentExecution?.durationMs || e.durationMs || 0;
      if (!componentLatencies[agentName]) {
        componentLatencies[agentName] = { latency: 0, count: 0, type: 'agent', evidence: [] };
      }
      componentLatencies[agentName].latency += latency;
      componentLatencies[agentName].count += 1;
      componentLatencies[agentName].evidence.push(
        `Agent ${agentName} execution: ${latency}ms (${e.eventType})`
      );
    });

    // Process tool events
    toolEvents.forEach(e => {
      const toolName = e.toolCall?.toolName || e.agentName || 'UNKNOWN';
      const latency = e.durationMs || 0;
      if (!componentLatencies[toolName]) {
        componentLatencies[toolName] = { latency: 0, count: 0, type: 'tool', evidence: [] };
      }
      componentLatencies[toolName].latency += latency;
      componentLatencies[toolName].count += 1;
      componentLatencies[toolName].evidence.push(
        `Tool ${toolName}: ${latency}ms (${e.toolCall?.provider || 'unknown'} provider, ${e.toolCall?.retryCount || 0} retries)`
      );
    });

    // Sort by latency descending
    const sortedComponents = Object.entries(componentLatencies)
      .map(([component, data]) => ({
        component,
        type: data.type,
        latencyMs: data.latency,
        count: data.count,
        percentage: totalLatency > 0 ? Math.round((data.latency / totalLatency) * 10000) / 100 : 0,
        evidence: data.evidence,
      }))
      .sort((a, b) => b.latencyMs - a.latencyMs);

    // Determine impact level
    const bottlenecks = sortedComponents.map(c => ({
      ...c,
      impact: (c.percentage > 30 ? 'HIGH' : c.percentage > 15 ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
      recommendation: this.getBottleneckRecommendation(c, totalLatency),
    }));

    const topBottleneck = bottlenecks[0];
    const summary = topBottleneck 
      ? `BOTTLENECK DETECTED: ${topBottleneck.component} (${topBottleneck.type}) - ${topBottleneck.latencyMs}ms (${topBottleneck.percentage}% of total). Impact: ${topBottleneck.impact}. ${topBottleneck.recommendation}`
      : 'No significant bottlenecks detected.';

    return {
      bottlenecks,
      totalLatency,
      summary,
    };
  }

  /**
   * Get recommendation for a specific bottleneck
   */
  private getBottleneckRecommendation(bottleneck: {
    component: string;
    type: string;
    latencyMs: number;
    percentage: number;
    evidence: string[];
  }, totalLatency: number): string {
    if (bottleneck.type === 'tool' && bottleneck.latencyMs > 10000) {
      return `Use fallback provider after first timeout. Current latency: ${bottleneck.latencyMs}ms.`;
    }
    if (bottleneck.type === 'tool' && bottleneck.percentage > 30) {
      return `Enable parallel execution for independent ${bottleneck.component} calls.`;
    }
    if (bottleneck.type === 'agent' && bottleneck.latencyMs > 30000) {
      return `Consider agent-level timeout and checkpoint-based recovery.`;
    }
    if (bottleneck.type === 'llm' && bottleneck.latencyMs > 15000) {
      return `Reduce prompt size or switch to faster model.`;
    }
    if (bottleneck.percentage > 25) {
      return `Investigate ${bottleneck.component} - accounts for ${bottleneck.percentage}% of total latency.`;
    }
    return `Monitor ${bottleneck.component} for performance patterns.`;
  }

  /**
   * Compare two traces and generate before/after metrics
   */
  async compareTraces(baselineTraceId: string, optimizedTraceId: string): Promise<TraceComparisonModel> {
    // First check in-memory trace service
    const baseline = traceService.getTrace(baselineTraceId) || await dbRepository.getTraceById(baselineTraceId);
    const optimized = traceService.getTrace(optimizedTraceId) || await dbRepository.getTraceById(optimizedTraceId);
    
    if (!baseline || !optimized) {
      throw new Error('One or both traces not found');
    }

    // Get diagnosis for both to understand what changed
    const baselineDiag = await this.analyzeTrace(baselineTraceId);
    const optimizedDiag = await this.analyzeTrace(optimizedTraceId);

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

    // Determine what optimization was applied
    const optimizations: string[] = [];
    if (improvement.latencyPct > 10) optimizations.push('Parallel execution');
    if (improvement.retriesPct > 10) optimizations.push('Timeout tuning');
    if (improvement.errorsPct > 10) optimizations.push('Fallback routing');
    if (improvement.toolCallsPct > 10) optimizations.push('Deduplication');

    return {
      comparisonId: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      baselineTraceId,
      optimizedTraceId,
      runId: baseline.runId,
      investigationId: baseline.investigationId,
      createdAt: new Date().toISOString(),
      before,
      after,
      improvement,
      optimizationApplied: optimizations.join(', ') || 'Manual optimization',
    };
  }
}

export const traceDiagnosisEngine = new TraceDiagnosisEngine();