import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { dbRepository } from '@/lib/db/repository';
import { getValidCheckpoint } from '@/lib/orchestrator/checkpointManager';
import { defaultMissionPlanner } from '@/lib/orchestrator/missionPlanner';
import { apiSuccess, apiError } from '@/lib/api/response';
import { TaskModel, MissionModel } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Try fetching from orchestrator in-memory mission tasks
    const mission = orchestratorService.getMissionState(id);
    let tasks: TaskModel[] = mission ? orchestratorService.getMissionTasks(mission.id) : [];

    // 2. If empty, check graph checkpoint in memory/database
    if (tasks.length === 0) {
      const cp = await getValidCheckpoint(id);
      if (cp && cp.state && Array.isArray(cp.state.plan) && cp.state.plan.length > 0) {
        tasks = cp.state.plan;
      }
    }

    // 3. If still empty, check investigation metadata
    if (tasks.length === 0) {
      const inv = await dbRepository.getInvestigationById(id);
      if (inv) {
        const lgPlan = (inv.metadata?.langGraph as any)?.plan;
        if (lgPlan && Array.isArray(lgPlan) && lgPlan.length > 0) {
          tasks = lgPlan;
        } else {
          // Generate baseline initial plan for UI visualization
          const tempMission: MissionModel = {
            id: `mission-${id}`,
            investigationId: id,
            objective: inv.objective,
            status: 'RUNNING',
            currentPhase: 'DISCOVERY',
            progress: 25,
            maxIterations: 5,
            iterationCount: 1,
            priority: inv.priority || 'HIGH',
            createdAt: inv.createdAt,
            createdBy: 'RadarX Orchestrator',
          };
          tasks = defaultMissionPlanner.planInitialTasks(tempMission, inv);
        }
      }
    }

    return apiSuccess(tasks);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch mission tasks', 'FETCH_ERROR', 500);
  }
}
