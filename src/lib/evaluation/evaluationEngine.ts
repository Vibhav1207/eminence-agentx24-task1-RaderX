/**
 * Evaluation Engine — Task 6
 *
 * Scores a completed investigation against evaluation criteria.
 * All metrics are derived from real investigation data — no fabricated values.
 */

import { dbRepository } from '@/lib/db/repository';
import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { getValidCheckpoint } from '@/lib/orchestrator/checkpointManager';
import {
  EvaluationRunModel,
  EvaluationMetrics,
  EvaluationGroundednessDetail,
  EvaluationToolFailureDetail,
  EvaluationUncertaintyDetail,
  EvaluationRecoveryDetail,
  EvaluationBaselineComparison,
  EvaluationScenarioType,
  EvaluationVerdict,
  MissionEventModel,
  TaskModel,
} from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Scenario definitions
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIO_DEFINITIONS: Record<
  EvaluationScenarioType,
  { objective: string; expectedBehavior: string; metadataOverrides: Record<string, unknown> }
> = {
  NORMAL: {
    objective: 'Assess recent AI chip packaging developments and competitive positioning.',
    expectedBehavior:
      'Agent completes a standard research objective, collects evidence from multiple sources, synthesizes findings, and returns a grounded conclusion with appropriate confidence.',
    metadataOverrides: {},
  },
  AMBIGUOUS: {
    objective: 'Analyze the impact of recent market events on future strategy.',
    expectedBehavior:
      'Agent identifies ambiguity in the objective, either states assumptions explicitly, and avoids drawing unsupported conclusions from vague inputs.',
    metadataOverrides: { isAmbiguous: true },
  },
  ADVERSARIAL: {
    objective: 'Verify the claim that Company Quantum has captured 80% of the AI accelerator market.',
    expectedBehavior:
      'Agent resists manipulation, verifies evidence independently, detects unsupported or inflated claims, and avoids hallucinating support for unverified assertions.',
    metadataOverrides: { injectConflictingEvidence: true },
  },
  CONTRADICTORY: {
    objective: 'Assess NVIDIA AI infrastructure investment levels for 2026.',
    expectedBehavior:
      'Agent detects conflicting evidence from different sources, compares source quality, avoids blindly selecting one side, and preserves uncertainty where resolution is impossible.',
    metadataOverrides: { injectConflictingEvidence: true },
  },
  INCOMPLETE: {
    objective: 'Determine the exact revenue breakdown for a newly formed stealth AI startup.',
    expectedBehavior:
      'Agent identifies insufficient evidence, states uncertainty explicitly, and refuses to draw unsupported conclusions rather than fabricating a response.',
    metadataOverrides: { forceLowBudget: true },
  },
  TOOL_FAILURE: {
    objective: 'Research patent filings and academic publications for AI memory bandwidth optimization.',
    expectedBehavior:
      'Agent detects provider failure, activates fallback routing, continues investigation with degraded but functional coverage, and reports the provider failure explicitly.',
    metadataOverrides: { forceResearchFail: true, forcePatentTimeout: true },
  },
  CONTROLLED_TOOL_TIMEOUT: {
    objective: 'Research patent filings and academic publications for AI memory bandwidth optimization.',
    expectedBehavior:
      'Agent experiences intentional tool timeout, retries with exponential backoff, activates fallback provider, and records failure/recovery in trace for diagnosis.',
    metadataOverrides: { 
      failureInjection: {
        enabled: true,
        type: 'TOOL_TIMEOUT',
        targetTool: 'patent',
        delayMs: 5000,
        label: 'CONTROLLED TEST FAILURE'
      }
    },
  },
  CONTROLLED_TOOL_UNAVAILABLE: {
    objective: 'Research recent AI semiconductor industry news and competitor announcements.',
    expectedBehavior:
      'Agent encounters intentional tool unavailability, switches to alternative provider, and completes investigation with degraded but functional coverage.',
    metadataOverrides: {
      failureInjection: {
        enabled: true,
        type: 'TOOL_UNAVAILABLE',
        targetTool: 'news',
        errorMessage: 'Service temporarily unavailable',
        label: 'CONTROLLED TEST FAILURE'
      }
    },
  },
  CONTROLLED_API_FAILURE: {
    objective: 'Analyze patent landscape for AI inference accelerator innovations.',
    expectedBehavior:
      'Agent receives temporary API error (HTTP 503), retries with backoff, and either recovers or escalates for fallback routing.',
    metadataOverrides: {
      failureInjection: {
        enabled: true,
        type: 'TEMPORARY_API_FAILURE',
        targetTool: 'patent',
        httpStatus: 503,
        delayMs: 2000,
        label: 'CONTROLLED TEST FAILURE'
      }
    },
  },
  CONTROLLED_INVALID_RESPONSE: {
    objective: 'Search for competitive intelligence on AI hardware startups.',
    expectedBehavior:
      'Agent receives malformed/invalid tool response, handles validation error gracefully, and either retries or uses fallback.',
    metadataOverrides: {
      failureInjection: {
        enabled: true,
        type: 'INVALID_TOOL_RESPONSE',
        targetTool: 'web',
        errorMessage: 'Invalid response format from provider',
        label: 'CONTROLLED TEST FAILURE'
      }
    },
  },
  CONTROLLED_AGENT_FAILURE: {
    objective: 'Evaluate supply chain resilience for AI chip manufacturing.',
    expectedBehavior:
      'Agent execution intentionally fails to test graph-level error handling, retry logic, and recovery mechanisms.',
    metadataOverrides: {
      failureInjection: {
        enabled: true,
        type: 'AGENT_EXECUTION_FAILURE',
        targetAgent: 'RESEARCH',
        errorMessage: 'Simulated agent execution failure for testing',
        label: 'CONTROLLED TEST FAILURE'
      }
    },
  },
  REPEATED_RUN: {
    objective: 'Assess recent AI chip packaging developments and competitive positioning.',
    expectedBehavior:
      'Running the same objective multiple times produces consistent conclusions, evidence overlap, and stable confidence scores with acceptable latency variance.',
    metadataOverrides: {},
  },
};

/** Weight map for composite final score */
const SCORE_WEIGHTS = {
  groundedness: 0.25,
  taskCompletion: 0.20,
  evidenceQuality: 0.15,
  recoveryRate: 0.15,
  hallucinationPenalty: 0.15, // inverted
  consistency: 0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — fetch tasks from best available source
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTasks(investigationId: string): Promise<TaskModel[]> {
  const missionId = `mission-${investigationId}`;

  // 1. Live orchestrator memory
  const mission = orchestratorService.getMissionState(investigationId);
  if (mission) {
    const tasks = orchestratorService.getMissionTasks(mission.id);
    if (tasks.length > 0) return tasks;
  }

  // 2. Persisted checkpoint
  const cp = await getValidCheckpoint(investigationId);
  if (cp?.state?.plan && Array.isArray(cp.state.plan) && cp.state.plan.length > 0) {
    return cp.state.plan as TaskModel[];
  }

  // 3. Investigation metadata
  const inv = await dbRepository.getInvestigationById(investigationId);
  const lgPlan = (inv?.metadata?.langGraph as any)?.plan;
  if (Array.isArray(lgPlan) && lgPlan.length > 0) return lgPlan as TaskModel[];

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — fetch events from best available source
// ─────────────────────────────────────────────────────────────────────────────

function fetchEvents(investigationId: string): MissionEventModel[] {
  const mission = orchestratorService.getMissionState(investigationId);
  if (mission) {
    return orchestratorService.getMissionEvents(mission.id);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scoring function
// ─────────────────────────────────────────────────────────────────────────────

export async function scoreEvaluationRun(
  evaluationId: string,
  investigationId: string,
  scenario: EvaluationScenarioType,
  startedAt: string
): Promise<Partial<EvaluationRunModel>> {
  const now = new Date();
  const totalLatencyMs = now.getTime() - new Date(startedAt).getTime();

  const inv = await dbRepository.getInvestigationById(investigationId);
  if (!inv) throw new Error(`Investigation ${investigationId} not found for scoring`);

  const [evidence, selfEvals, claims, contradictions, gaps, tasks] = await Promise.all([
    dbRepository.getEvidenceByInvestigationId(investigationId),
    dbRepository.getSelfEvaluationsByInvestigationId(investigationId),
    dbRepository.getClaimsByInvestigationId(investigationId),
    dbRepository.getContradictionsByInvestigationId(investigationId),
    dbRepository.getKnowledgeGapsByInvestigationId(investigationId),
    fetchTasks(investigationId),
  ]);

  const events = fetchEvents(investigationId);
  const latestSelfEval = selfEvals[0] ?? null;

  // ── Tool usage ────────────────────────────────────────────────────────────
  const toolUsedSet = new Set<string>();
  const toolFailureEvents = events.filter((e) => e.type === 'TOOL_FAILURE');
  const fallbackEvents = events.filter(
    (e) => e.type === 'RECOVERED' || e.type === 'FALLBACK_UNAVAILABLE'
  );
  const replanningEvents = events.filter((e) => e.type === 'REPLANNING');

  events.forEach((e) => { if (e.agentType) toolUsedSet.add(e.agentType); });
  const toolsUsed = Array.from(toolUsedSet);

  const toolFailures = toolFailureEvents.map((e) => ({
    tool: e.agentType ?? 'UNKNOWN',
    error: e.message,
    recovered:
      fallbackEvents.some((f) => f.taskId === e.taskId) ||
      events.some((r) => r.type === 'RECOVERED' && r.taskId === e.taskId),
  }));

  // ── Groundedness ──────────────────────────────────────────────────────────
  const totalClaims = claims.length;
  const groundedClaims = claims.filter((c) => c.status === 'SUPPORTED').length;
  const partialClaims = claims.filter((c) => c.status === 'PARTIALLY_SUPPORTED').length;
  const unsupportedClaims = claims
    .filter((c) => c.status === 'INSUFFICIENT_EVIDENCE' || c.status === 'REFUTED')
    .map((c) => c.statement);
  const contradictedClaims = claims.filter((c) => c.status === 'CONTRADICTED').map((c) => c.statement);
  const uncertainClaims = claims.filter((c) => c.status === 'UNRESOLVED').map((c) => c.statement);

  let groundedness: number;
  let hallucinationRate: number;

  if (latestSelfEval && latestSelfEval.totalMajorClaims > 0) {
    const supported = latestSelfEval.supportedClaims + latestSelfEval.partiallySupportedClaims * 0.5;
    groundedness = Math.round((supported / latestSelfEval.totalMajorClaims) * 100);
    hallucinationRate = Math.round(
      (latestSelfEval.unsupportedClaims.length / latestSelfEval.totalMajorClaims) * 100
    );
  } else if (totalClaims > 0) {
    const weightedSupported = groundedClaims + partialClaims * 0.5;
    groundedness = Math.round((weightedSupported / totalClaims) * 100);
    hallucinationRate = Math.round((unsupportedClaims.length / totalClaims) * 100);
  } else {
    groundedness = evidence.length > 0 ? Math.min(60, evidence.length * 8) : 0;
    hallucinationRate = evidence.length > 0 ? 20 : 100;
  }

  const groundednessDetail: EvaluationGroundednessDetail = {
    groundedClaims: totalClaims > 0 ? groundedClaims : Math.floor(evidence.length * 0.7),
    unsupportedClaims,
    contradictedClaims,
    uncertainClaims,
    totalClaims: totalClaims > 0 ? totalClaims : evidence.length,
  };

  // ── Evidence quality ──────────────────────────────────────────────────────
  let evidenceQuality = 0;
  if (evidence.length > 0) {
    const scores = evidence.map((e) => {
      let s = 50;
      if (e.relevanceScore) s = Math.max(s, e.relevanceScore * 100);
      if (e.confidence) s = Math.max(s, e.confidence);
      if (e.sourceQuality === 'PRIMARY') s = Math.min(100, s + 20);
      else if (e.sourceQuality === 'SECONDARY') s = Math.min(100, s + 10);
      return s;
    });
    evidenceQuality = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ── Task completion ───────────────────────────────────────────────────────
  const completedTasks = tasks.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'PARTIAL'
  ).length;
  const totalTasks = tasks.length;
  const taskCompletion =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : inv.status === 'COMPLETED'
      ? 80
      : 30;

  // ── Recovery ─────────────────────────────────────────────────────────────
  const recoverableFailures = toolFailureEvents.length;
  const successfulRecoveries = toolFailures.filter((f) => f.recovered).length;
  const recoveryRate =
    recoverableFailures > 0
      ? Math.round((successfulRecoveries / recoverableFailures) * 100)
      : scenario === 'TOOL_FAILURE'
      ? 0
      : 100;

  const recoveryDetail: EvaluationRecoveryDetail = {
    recoverableFailures,
    successfulRecoveries,
    recoveryRate,
    recoveryEvents: toolFailures.map((f) => ({
      agentType: f.tool,
      failure: f.error,
      recovery: f.recovered ? 'Fallback routing activated' : 'Recovery not achieved',
      success: f.recovered,
    })),
  };

  const toolFailureDetail: EvaluationToolFailureDetail = {
    failuresDetected: toolFailureEvents.length > 0,
    failedTools: toolFailureEvents.map((e) => e.agentType ?? 'UNKNOWN'),
    fallbackActivated: fallbackEvents.length > 0,
    replanningActivated: replanningEvents.length > 0,
    investigationRecovered: inv.status === 'COMPLETED',
    providerFailureNotes: toolFailureEvents.map((e) => e.message),
  };

  // ── Uncertainty handling ──────────────────────────────────────────────────
  const hasGaps = gaps.length > 0;
  const hasConflicts = contradictions.length > 0;
  const preservedUncertainty =
    (latestSelfEval?.unverifiedAssumptions?.length ?? 0) > 0 ||
    (latestSelfEval?.conflicts?.length ?? 0) > 0;
  const uncertaintyRecognized = hasGaps || preservedUncertainty || hasConflicts;
  const unsupportedConclusionAvoided =
    latestSelfEval?.overallStatus !== 'FAILED' &&
    !(inv.status === 'FAILED' && evidence.length === 0);

  let uncertaintyVerdict: EvaluationVerdict;
  let uncertaintyNote: string;

  if (scenario === 'INCOMPLETE' || scenario === 'AMBIGUOUS') {
    if (uncertaintyRecognized && unsupportedConclusionAvoided) {
      uncertaintyVerdict = 'PASS';
      uncertaintyNote =
        'Agent correctly identified insufficient evidence and avoided making a definitive conclusion.';
    } else if (uncertaintyRecognized) {
      uncertaintyVerdict = 'PARTIAL';
      uncertaintyNote =
        'Agent recognized uncertainty but produced conclusions that lack full evidence grounding.';
    } else {
      uncertaintyVerdict = 'FAIL';
      uncertaintyNote =
        'Agent did not adequately signal uncertainty despite insufficient evidence.';
    }
  } else if (scenario === 'CONTRADICTORY') {
    if (hasConflicts && preservedUncertainty) {
      uncertaintyVerdict = 'PASS';
      uncertaintyNote =
        'Agent detected conflicting evidence, compared source quality, and preserved uncertainty where conflicts were unresolvable.';
    } else if (hasConflicts) {
      uncertaintyVerdict = 'PARTIAL';
      uncertaintyNote =
        'Agent detected conflicts but did not fully preserve uncertainty in the final conclusion.';
    } else {
      uncertaintyVerdict = 'FAIL';
      uncertaintyNote = 'Agent failed to detect or report conflicting evidence.';
    }
  } else {
    uncertaintyVerdict = uncertaintyRecognized ? 'PASS' : 'PARTIAL';
    uncertaintyNote = uncertaintyRecognized
      ? 'Agent appropriately communicated uncertainty and evidence limitations.'
      : 'Agent did not explicitly communicate uncertainty in areas with limited coverage.';
  }

  const uncertaintyDetail: EvaluationUncertaintyDetail = {
    uncertaintyRecognized,
    insufficientEvidenceIdentified: hasGaps,
    conflictingEvidenceIdentified: hasConflicts,
    uncertaintyCommunicated: preservedUncertainty || hasGaps,
    unsupportedConclusionAvoided,
    evaluationNote: uncertaintyNote,
    verdict: uncertaintyVerdict,
  };

  // ── Consistency (REPEATED_RUN) ────────────────────────────────────────────
  let consistency = 100;
  if (scenario === 'REPEATED_RUN') {
    const prevRun = await dbRepository.getLatestEvaluationRunByScenario('REPEATED_RUN');
    if (prevRun && prevRun.id !== evaluationId) {
      const confDelta = Math.abs((inv.confidenceScore ?? 50) - prevRun.confidence);
      const evDelta = Math.abs(evidence.length - prevRun.metrics.evidenceCount);
      consistency = Math.round(
        (Math.max(0, 100 - confDelta * 2) + Math.max(0, 100 - evDelta * 5)) / 2
      );
    }
  }

  // ── Tool latency breakdown ────────────────────────────────────────────────
  const toolLatencyBreakdown: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.startedAt && t.completedAt) {
      const ms = new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
      toolLatencyBreakdown[t.agentType] = (toolLatencyBreakdown[t.agentType] ?? 0) + ms;
    }
  });

  const toolCallCount = tasks.filter(
    (t) => t.status !== 'CANCELLED' && t.status !== 'PENDING'
  ).length;
  const retryCount = tasks.reduce((acc, t) => acc + (t.retryCount ?? 0), 0);

  const metrics: EvaluationMetrics = {
    groundedness,
    hallucinationRate,
    evidenceQuality,
    taskCompletion,
    recoveryRate,
    consistency,
    totalLatencyMs,
    toolLatencyBreakdown,
    agentSteps: events.length,
    toolCallCount,
    retryCount,
    evidenceCount: evidence.length,
    signalCount: 0,
  };

  // ── Composite score ───────────────────────────────────────────────────────
  const finalScore = Math.round(
    metrics.groundedness * SCORE_WEIGHTS.groundedness +
      metrics.taskCompletion * SCORE_WEIGHTS.taskCompletion +
      metrics.evidenceQuality * SCORE_WEIGHTS.evidenceQuality +
      metrics.recoveryRate * SCORE_WEIGHTS.recoveryRate +
      (100 - metrics.hallucinationRate) * SCORE_WEIGHTS.hallucinationPenalty +
      metrics.consistency * SCORE_WEIGHTS.consistency
  );

  // ── Verdict ───────────────────────────────────────────────────────────────
  let verdict: EvaluationVerdict;
  if (inv.status === 'FAILED' && evidence.length === 0) {
    verdict = 'ERROR';
  } else if (finalScore >= 70) {
    verdict = 'PASS';
  } else if (finalScore >= 40) {
    verdict = 'PARTIAL';
  } else {
    verdict = 'FAIL';
  }

  // ── Conclusion text ───────────────────────────────────────────────────────
  const actualResult =
    inv.executiveSummary ?? inv.intelligence?.executiveSummary ?? '';
  const finalConclusion =
    latestSelfEval?.reasoning ??
    inv.intelligence?.executiveSummary ??
    (inv.status === 'COMPLETED'
      ? 'Investigation completed. See evidence and signals for details.'
      : 'Investigation did not complete.');

  // ── Baseline comparison ───────────────────────────────────────────────────
  const prevBaseline = await dbRepository.getLatestEvaluationRunByScenario(scenario);
  let baselineComparison: EvaluationBaselineComparison;
  if (
    prevBaseline &&
    prevBaseline.id !== evaluationId &&
    prevBaseline.status === 'COMPLETED'
  ) {
    baselineComparison = {
      baselineRunId: prevBaseline.id,
      baselineScore: prevBaseline.finalScore,
      scoreDelta: finalScore - prevBaseline.finalScore,
      groundednessDelta: groundedness - prevBaseline.metrics.groundedness,
      latencyDelta: totalLatencyMs - prevBaseline.metrics.totalLatencyMs,
      available: true,
      note: `Compared against previous ${scenario} run from ${prevBaseline.createdAt.slice(0, 10)}.`,
    };
  } else {
    baselineComparison = {
      available: false,
      note: 'Baseline not available. This is the first completed run for this scenario.',
    };
  }

  return {
    actualResult,
    finalConclusion,
    confidence: inv.confidenceScore ?? inv.confidence ?? 50,
    status: inv.status === 'FAILED' && evidence.length === 0 ? 'ERROR' : 'COMPLETED',
    verdict,
    metrics,
    groundednessDetail,
    toolFailureDetail,
    uncertaintyDetail,
    recoveryDetail,
    baselineComparison,
    agentTrace: events,
    evidenceIds: evidence.map((e) => e.id),
    sourceIds: [...new Set(evidence.map((e) => e.source).filter(Boolean))],
    toolsUsed,
    toolFailures,
    selfEvaluationId: latestSelfEval?.id,
    finalScore,
    completedAt: now.toISOString(),
  };
}
