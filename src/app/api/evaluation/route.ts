import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { agentRegistry } from '@/lib/agents/agentRegistry';
import { apiSuccess, apiError } from '@/lib/api/response';
import { SCENARIO_DEFINITIONS, scoreEvaluationRun } from '@/lib/evaluation/evaluationEngine';
import { EvaluationScenarioType } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/evaluation — list all evaluation runs
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    await dbRepository.ensureEvaluationIndex();
    const runs = await dbRepository.getEvaluationRuns();
    return apiSuccess(runs);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch evaluation runs', 'FETCH_ERROR', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/evaluation — create and execute an evaluation run
// Body: { scenarios: EvaluationScenarioType[], targetEntity?: string }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenarios: EvaluationScenarioType[] = body.scenarios ?? ['NORMAL'];
    const targetEntity: string = body.targetEntity ?? 'Company Quantum';

    // Validate scenario types
    const validScenarios = Object.keys(SCENARIO_DEFINITIONS) as EvaluationScenarioType[];
    const invalidScenarios = scenarios.filter((s) => !validScenarios.includes(s));
    if (invalidScenarios.length > 0) {
      return apiError(
        `Invalid scenario(s): ${invalidScenarios.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    await dbRepository.ensureEvaluationIndex();
    await agentRegistry.initialize();

    const launchedRuns: { evaluationId: string; investigationId: string; scenario: string }[] = [];

    for (const scenario of scenarios) {
      const def = SCENARIO_DEFINITIONS[scenario];
      const startedAt = new Date().toISOString();

      // 1. Create investigation with scenario-specific metadata
      const inv = await dbRepository.createInvestigation({
        title: `[EVAL] ${scenario} — ${targetEntity}`,
        objective: def.objective,
        strategicQuestion: def.objective,
        primaryEntities: [targetEntity],
        status: 'RUNNING',
        priority: 'HIGH',
        timeHorizon: 'Last 90 days',
        progress: 0,
        metadata: {
          isEvaluationRun: true,
          evaluationScenario: scenario,
          ...def.metadataOverrides,
        },
      });

      // 2. Create evaluation run record (status: RUNNING)
      const evalRun = await dbRepository.createEvaluationRun({
        scenario,
        investigationId: inv.id,
        objective: def.objective,
        expectedBehavior: def.expectedBehavior,
        status: 'RUNNING',
        startedAt,
      });

      // 3. Fire-and-forget: start LangGraph mission, score when done
      (async () => {
        try {
          await orchestratorService.startMission(inv.id);

          // Poll until investigation completes (max 5 minutes)
          const maxWaitMs = 5 * 60 * 1000;
          const pollIntervalMs = 3000;
          const deadline = Date.now() + maxWaitMs;

          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, pollIntervalMs));
            const current = await dbRepository.getInvestigationById(inv.id);
            if (
              current?.status === 'COMPLETED' ||
              current?.status === 'FAILED' ||
              current?.status === 'INTERRUPTED'
            ) {
              break;
            }
          }

          // 4. Score the completed investigation
          const scored = await scoreEvaluationRun(
            evalRun.id,
            inv.id,
            scenario,
            startedAt
          );

          // 5. Persist results
          await dbRepository.updateEvaluationRun(evalRun.id, scored);
        } catch (err: any) {
          console.error(`[EvaluationEngine] Scoring error for ${evalRun.id}:`, err);
          await dbRepository.updateEvaluationRun(evalRun.id, {
            status: 'ERROR',
            verdict: 'ERROR',
            error: err.message ?? 'Unknown scoring error',
            completedAt: new Date().toISOString(),
          });
        }
      })();

      launchedRuns.push({
        evaluationId: evalRun.id,
        investigationId: inv.id,
        scenario,
      });
    }

    return apiSuccess(
      {
        launched: launchedRuns,
        message: `${launchedRuns.length} evaluation run(s) started. Poll /api/evaluation/[id] for results.`,
      },
      202
    );
  } catch (error: any) {
    return apiError(error.message || 'Failed to start evaluation', 'EVALUATION_ERROR', 500);
  }
}
