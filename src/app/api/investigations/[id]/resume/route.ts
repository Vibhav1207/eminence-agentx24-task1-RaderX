import { orchestratorService } from '@/lib/orchestrator/orchestratorService';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mission = orchestratorService.getMissionState(id);
    if (!mission) return apiError('Mission not found', 'NOT_FOUND', 404);
    const updated = await orchestratorService.resumeMission(mission.id);
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || 'Failed to resume mission', 'RESUME_ERROR', 500);
  }
}
