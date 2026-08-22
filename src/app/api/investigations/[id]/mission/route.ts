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
      return apiError(`No active mission found for investigation ${id}`, 'NOT_FOUND', 404);
    }
    return apiSuccess(mission);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch mission state', 'FETCH_ERROR', 500);
  }
}
