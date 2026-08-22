import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mission = orchestratorService.getMissionState(id);
    if (!mission) {
      return apiSuccess([]);
    }
    const tasks = orchestratorService.getMissionTasks(mission.id);
    return apiSuccess(tasks);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch mission tasks', 'FETCH_ERROR', 500);
  }
}
