import { dbRepository } from '@/lib/db/repository';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entities = await dbRepository.getEntitiesByInvestigationId(id);
    return apiSuccess(entities);
  } catch (error: any) {
    return apiError(error.message || 'Failed to fetch entities', 'FETCH_ERROR', 500);
  }
}
