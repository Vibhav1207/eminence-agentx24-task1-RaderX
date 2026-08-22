import { NextRequest } from 'next/server';
import { dbRepository } from '@/lib/db/repository';
import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inv = await dbRepository.getInvestigationById(id);
    if (!inv) return apiError('Investigation not found', 'NOT_FOUND', 404);

    const mission = orchestratorService.getMissionState(id);
    const tasks = mission ? orchestratorService.getMissionTasks(mission.id) : [];
    const gaps = await dbRepository.getKnowledgeGapsByInvestigationId(id);
    const decisions = await dbRepository.getDecisionLogsByInvestigationId(id);
    const evidence = await dbRepository.getEvidenceByInvestigationId(id);

    return apiSuccess({
      investigationId: id,
      objective: inv.objective,
      status: inv.status,
      phase: mission?.currentPhase || 'DISCOVERY',
      iteration: mission?.iterationCount || 1,
      maxIterations: 5,
      evidenceCount: evidence.length,
      knowledgeGapsCount: gaps.filter((g) => g.status === 'OPEN').length,
      completedTasksCount: tasks.filter((t) => t.status === 'COMPLETED').length,
      activeTasksCount: tasks.filter((t) => t.status === 'RUNNING' || t.status === 'QUEUED').length,
      lastDecision: decisions[0]?.decision || 'CONTINUE',
      lastDecisionReason: decisions[0]?.reason || 'Initial investigation sequence',
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    });
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch investigation state', 'STATE_FETCH_ERROR', 500);
  }
}
