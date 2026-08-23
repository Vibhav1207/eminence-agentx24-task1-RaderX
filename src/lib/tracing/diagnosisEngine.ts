import {
  TraceEventModel,
  TraceModel,
  TraceDiagnosisModel,
  TraceEventType,
  TraceComparisonModel,
  AgentStatusTrace,
} from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

/**
 * Automatic Trace Diagnosis Engine (Task 7)
 * Analyzes traces to identify root causes, impacts, and recovery actions
 */

export class TraceDiagnosisEngine {
  
  /**
   * Analyze a completed or failed trace and generate diagnosis
   */
  async analyzeTrace(traceId: string): Promise<TraceDiagnosisModel> {
    const trace = await dbRepository.getTraceById(traceId);
    const events = await dbRepository.getTraceEventsByTraceId(traceId);
    
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
      timestamp: new Date().toISOString(),
      rootCause,
      affectedComponent: affectedComponent || 'UNKNOWN',
      impact: impact || { latencyIncreaseMs: 0, extraRetries: 0, extraToolCalls: 0 },
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
        traceEvidence: [`Event ${event.eventId}: ${event.error?.message || 'Unknown error'}`],
      };
    }

    const errorType = event.error.type;
    const component = event.agentName || event.toolCall?.toolName || 'UNKNOWN';
    
    const typeMap: Record<string, TraceDiagnosisModel['rootCause']['type']> = {
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

    if (!rootCause || rootCause.type === 'NONE') {
      return ['System performing within normal parameters'];
    }

    switch (rootCause.type) {
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
      if (d.rootCause?.type) {
        typeCounts[d.rootCause.type] = (typeCounts[d.rootCause.type] || 0) + 1;
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
}

export const traceDiagnosisEngine = new TraceDiagnosisEngine();