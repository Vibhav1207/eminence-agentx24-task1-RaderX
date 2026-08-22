import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const timeline = await dbRepository.getTimelineByInvestigationId(id);
    return apiSuccess(timeline);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch timeline events', 'FETCH_ERROR', 500);
  }
}
