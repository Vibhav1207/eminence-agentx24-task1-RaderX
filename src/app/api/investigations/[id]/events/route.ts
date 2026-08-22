import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const events = await dbRepository.getMissionEvents(id);
    return apiSuccess(events);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch mission events', 'FETCH_ERROR', 500);
  }
}
