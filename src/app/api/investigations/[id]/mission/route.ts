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
      // A completed mission is a valid terminal state. The workspace polls
      // this endpoint while the investigation page remains open, so return a
      // normal empty payload instead of turning completion into repeated 404s.
      return apiSuccess(null);
    }
    return apiSuccess(mission);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch mission state', 'FETCH_ERROR', 500);
  }
}
