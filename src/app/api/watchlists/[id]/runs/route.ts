import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runs = await dbRepository.getMonitoringRunsByWatchlistId(id);
    return apiSuccess(runs);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch monitoring runs', 'RUNS_FETCH_ERROR', 500);
  }
}
